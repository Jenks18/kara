import Foundation
import SwiftUI
import Combine

/// Shared, observable data store for expenses, reports, and workspaces.
///
/// ## Production-grade pattern
/// Lives at the `MainAppView` level as a `@StateObject`. Every tab
/// observes the same instance — no duplicate API calls, no stale
/// tab-specific caches.  Uses a **cache→network (stale-while-revalidate)**
/// approach with per-user namespacing via `DataCache`.
///
/// All data flows:
/// 1. `seed()` — sync read from DataCache (instant paint, zero spinner)
/// 2. `refreshAll()` — parallel async fetch; silent unless first-ever load
/// 3. Individual tab views bind to `@Published` properties and never call
///    API themselves.
@MainActor
final class AppDataStore: ObservableObject {
    // MARK: - Published State

    @Published var expenses: [ExpenseItem] = []
    @Published var reports: [ExpenseReport] = []
    @Published var workspaces: [Workspace] = []

    @Published var isLoadingExpenses = false
    @Published var isLoadingMoreExpenses = false
    @Published var expensesHasMore = false
    @Published var isLoadingReports = false
    @Published var isLoadingMoreReports = false
    @Published var reportsHasMore = false
    @Published var isLoadingWorkspaces = false

    // MARK: - Computed Stats (Home page)

    @Published var totalThisMonth: Double = 0
    @Published var totalAllTime: Double = 0
    @Published var monthOverMonthTrend: Double = 0
    @Published var receiptCountThisMonth: Int = 0
    @Published var submittedReportsCount: Int = 0
    /// Set from HomePage before tab-switch to deep-link into a specific ReportsPage subtab (0=Expenses, 1=Reports).
    @Published var reportsDeepLinkSubTab: Int? = nil

    // MARK: - Pagination Cursors (private)

    private var nextExpenseCursor: String? = nil
    private var nextReportCursor: String? = nil

    // MARK: - Debounce

    /// Minimum seconds between network refreshes for each dataset.
    private let debounceInterval: TimeInterval = 30
    private var lastExpenseFetch: Date = .distantPast
    private var lastReportFetch: Date = .distantPast
    private var lastWorkspaceFetch: Date = .distantPast

    /// True once the /api/mobile/stats endpoint has returned a valid response this
    /// session. Prevents recomputeStats() (page-1 only) from overwriting accurate
    /// server-wide totals after they have already been applied.
    private var serverStatsLoaded = false

    // MARK: - Unified cache keys (no more home_ vs reports_ duplication)

    private enum CacheKey {
        static let expenses   = "expenses"
        static let reports    = "reports"
        static let workspaces = "workspaces"
    }

    // MARK: - Initialise from cache

    /// Call once in `MainAppView.onAppear` after setting `DataCache.shared.currentUserId`.
    func seed() {
        expenses   = DataCache.shared.load([ExpenseItem].self,   key: CacheKey.expenses)   ?? []
        reports    = DataCache.shared.load([ExpenseReport].self,  key: CacheKey.reports)    ?? []
        workspaces = DataCache.shared.load([Workspace].self,      key: CacheKey.workspaces) ?? []

        isLoadingExpenses  = expenses.isEmpty
        isLoadingReports   = reports.isEmpty
        isLoadingWorkspaces = workspaces.isEmpty

        recomputeStats()

        // Also seed WorkspaceManager + CurrencyFormatter
        if !workspaces.isEmpty {
            WorkspaceManager.shared.update(workspaces)
        } else {
            WorkspaceManager.shared.seed()
        }
    }

    // MARK: - Network Refresh

    /// Parallel refresh of all data. Safe to call on every tab appear — debounced.
    func refreshAll(force: Bool = false) async {
        // A forced refresh should re-fetch server stats from scratch.
        if force { serverStatsLoaded = false }
        // NOTE: `async let _ =` implicitly cancels child tasks because the
        // result is never awaited.  We must bind real names and await them.
        async let a: () = refreshExpenses(force: force)
        async let b: () = refreshReports(force: force)
        async let c: () = refreshWorkspaces(force: force)
        async let d: () = refreshStats()
        _ = await (a, b, c, d)
    }

    func refreshExpenses(force: Bool = false) async {
        guard force || Date().timeIntervalSince(lastExpenseFetch) > debounceInterval else { return }
        if expenses.isEmpty { isLoadingExpenses = true }
        do {
            let paged = try await API.shared.fetchExpenses()
            DataCache.shared.save(paged.items, key: CacheKey.expenses)
            expenses = paged.items
            expensesHasMore = paged.hasMore
            nextExpenseCursor = paged.nextCursor
            lastExpenseFetch = Date()
            recomputeStats()
        } catch is CancellationError {
            // Structured concurrency cancellation — view disappeared, not an error
        } catch let urlError as URLError where urlError.code == .cancelled {
            // URLSession task cancelled — view lifecycle, not an error
        } catch {
            print("❌ Expense fetch error: \(error)")
        }
        isLoadingExpenses = false
    }

    /// Append the next page of expenses.  Called from InfiniteScroll or "Load More" button.
    func loadMoreExpenses() async {
        guard expensesHasMore, !isLoadingMoreExpenses, let cursor = nextExpenseCursor else { return }
        isLoadingMoreExpenses = true
        do {
            let paged = try await API.shared.fetchExpenses(cursor: cursor)
            let merged = expenses + paged.items
            DataCache.shared.save(merged, key: CacheKey.expenses)
            expenses = merged
            expensesHasMore = paged.hasMore
            nextExpenseCursor = paged.nextCursor
            recomputeStats()
        } catch is CancellationError {}
        catch let urlError as URLError where urlError.code == .cancelled {}
        catch { print("❌ Load-more expenses error: \(error)") }
        isLoadingMoreExpenses = false
    }

    func refreshReports(force: Bool = false) async {
        guard force || Date().timeIntervalSince(lastReportFetch) > debounceInterval else { return }
        if reports.isEmpty { isLoadingReports = true }
        do {
            let paged = try await API.shared.fetchReports()
            DataCache.shared.save(paged.items, key: CacheKey.reports)
            reports = paged.items
            reportsHasMore = paged.hasMore
            nextReportCursor = paged.nextCursor
            lastReportFetch = Date()
            recomputeStats()
        } catch is CancellationError {
            // Structured concurrency cancellation — not an error
        } catch let urlError as URLError where urlError.code == .cancelled {
            // URLSession task cancelled — not an error
        } catch {
            print("❌ Reports fetch error: \(error)")
        }
        isLoadingReports = false
    }

    /// Append the next page of reports.
    func loadMoreReports() async {
        guard reportsHasMore, !isLoadingMoreReports, let cursor = nextReportCursor else { return }
        isLoadingMoreReports = true
        do {
            let paged = try await API.shared.fetchReports(cursor: cursor)
            let merged = reports + paged.items
            DataCache.shared.save(merged, key: CacheKey.reports)
            reports = merged
            reportsHasMore = paged.hasMore
            nextReportCursor = paged.nextCursor
            recomputeStats()
        } catch is CancellationError {}
        catch let urlError as URLError where urlError.code == .cancelled {}
        catch { print("❌ Load-more reports error: \(error)") }
        isLoadingMoreReports = false
    }

    /// Fetch server-side aggregated stats.  More accurate than client-side
    /// recomputeStats() because it counts expenses across ALL pages, not just
    /// the currently-loaded page.
    func refreshStats() async {
        do {
            let stats = try await API.shared.fetchStats()
            totalThisMonth        = stats.totalThisMonth
            totalAllTime          = stats.totalAllTime
            monthOverMonthTrend   = stats.monthOverMonthTrend
            receiptCountThisMonth = stats.receiptCountThisMonth
            submittedReportsCount = stats.totalReports
            // Mark server stats as loaded so recomputeStats() (page-1 scope)
            // does not overwrite these accurate all-history values.
            serverStatsLoaded = true
        } catch is CancellationError {}
        catch let urlError as URLError where urlError.code == .cancelled {}
        catch { /* silent — cached stats from recomputeStats() remain visible */ }
    }

    func refreshWorkspaces(force: Bool = false) async {
        guard force || Date().timeIntervalSince(lastWorkspaceFetch) > debounceInterval else { return }
        if workspaces.isEmpty { isLoadingWorkspaces = true }
        do {
            let fetched = try await API.shared.fetchWorkspaces()
            WorkspaceManager.shared.update(fetched)
            DataCache.shared.save(fetched, key: CacheKey.workspaces)
            workspaces = fetched
            lastWorkspaceFetch = Date()
        } catch is CancellationError {
            // Structured concurrency cancellation — not an error
        } catch let urlError as URLError where urlError.code == .cancelled {
            // URLSession task cancelled — not an error
        } catch {
            print("❌ Workspaces fetch error: \(error)")
        }
        isLoadingWorkspaces = false
    }

    // MARK: - Mutations (keep local state + cache in sync)

    func addWorkspace(_ workspace: Workspace) {
        workspaces.append(workspace)
        DataCache.shared.save(workspaces, key: CacheKey.workspaces)
        WorkspaceManager.shared.update(workspaces)
    }

    func removeWorkspace(id: String) {
        workspaces.removeAll { $0.id == id }
        DataCache.shared.save(workspaces, key: CacheKey.workspaces)
        WorkspaceManager.shared.update(workspaces)
    }

    // MARK: - Stats Computation

    private func recomputeStats() {
        // Server stats (from /api/mobile/stats) count across ALL pages and are
        // authoritative.  If they have already been applied this session, skip
        // the page-1-only client recompute to avoid overwriting correct totals.
        guard !serverStatsLoaded else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: now))!
        let startOfLastMonth = calendar.date(byAdding: .month, value: -1, to: startOfMonth)!

        // Prefer transaction_date (when purchase happened) over created_at (when scanned)
        let thisMonthItems = expenses.filter {
            let d = Self.parseISO($0.transaction_date ?? $0.created_at) ?? .distantPast
            return d >= startOfMonth
        }
        let lastMonthItems = expenses.filter {
            let d = Self.parseISO($0.transaction_date ?? $0.created_at) ?? .distantPast
            return d >= startOfLastMonth && d < startOfMonth
        }

        let thisTotal = thisMonthItems.reduce(0.0) { $0 + $1.amount }
        let lastTotal = lastMonthItems.reduce(0.0) { $0 + $1.amount }

        totalThisMonth        = thisTotal
        totalAllTime          = expenses.reduce(0.0) { $0 + $1.amount }
        monthOverMonthTrend   = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0
        receiptCountThisMonth = thisMonthItems.count
        submittedReportsCount = reports.count  // Show total reports, not just submitted
    }

    /// Parse date strings from Supabase into `Date`.
    ///
    /// Handles three formats:
    /// - Full ISO8601 with microseconds: `2026-02-21T10:30:00.123456+00:00`
    /// - Full ISO8601 without fractions:  `2026-02-21T10:30:00+00:00`
    /// - Plain DATE string (Postgres DATE column): `2026-02-21`  ← previously missed!
    ///
    /// `ISO8601DateFormatter` requires a time component and timezone — it cannot
    /// parse bare `yyyy-MM-dd` strings.  The third formatter fills that gap and
    /// interprets the date as midnight UTC, which matches Postgres `DATE` semantics.
    ///
    /// Formatters are stored as static constants so they are constructed once per
    /// process lifetime (`ISO8601DateFormatter` / `DateFormatter` init is expensive).
    static func parseISO(_ s: String) -> Date? {
        if let d = _isoWithFrac.date(from: s) { return d }
        if let d = _isoPlain.date(from: s)    { return d }
        // Plain DATE (no time, no timezone) — e.g. transaction_date from
        // expense_items.  Interpret as midnight UTC to match Postgres behaviour.
        return _dateOnly.date(from: s)
    }

    private static let _isoWithFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let _isoPlain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    /// Parses `yyyy-MM-dd` plain date strings (Postgres DATE columns) as midnight UTC.
    private static let _dateOnly: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone   = TimeZone(identifier: "UTC")
        f.locale     = Locale(identifier: "en_US_POSIX")
        return f
    }()
}
