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
    @Published var isLoadingReports = false
    @Published var isLoadingWorkspaces = false

    // MARK: - Computed Stats (Home page)

    @Published var totalThisMonth: Double = 0
    @Published var totalAllTime: Double = 0
    @Published var monthOverMonthTrend: Double = 0
    @Published var receiptCountThisMonth: Int = 0
    @Published var submittedReportsCount: Int = 0

    // MARK: - Debounce

    /// Minimum seconds between network refreshes for each dataset.
    private let debounceInterval: TimeInterval = 30
    private var lastExpenseFetch: Date = .distantPast
    private var lastReportFetch: Date = .distantPast
    private var lastWorkspaceFetch: Date = .distantPast

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
        async let _ = refreshExpenses(force: force)
        async let _ = refreshReports(force: force)
        async let _ = refreshWorkspaces(force: force)
    }

    func refreshExpenses(force: Bool = false) async {
        guard force || Date().timeIntervalSince(lastExpenseFetch) > debounceInterval else { return }
        if expenses.isEmpty { isLoadingExpenses = true }
        do {
            let fetched = try await API.shared.fetchExpenses()
            DataCache.shared.save(fetched, key: CacheKey.expenses)
            expenses = fetched
            lastExpenseFetch = Date()
            recomputeStats()
        } catch {
            print("❌ Expense fetch error: \(error)")
        }
        isLoadingExpenses = false
    }

    func refreshReports(force: Bool = false) async {
        guard force || Date().timeIntervalSince(lastReportFetch) > debounceInterval else { return }
        if reports.isEmpty { isLoadingReports = true }
        do {
            let fetched = try await API.shared.fetchReports()
            DataCache.shared.save(fetched, key: CacheKey.reports)
            reports = fetched
            lastReportFetch = Date()
            recomputeStats()
        } catch {
            print("❌ Reports fetch error: \(error)")
        }
        isLoadingReports = false
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
        let calendar = Calendar.current
        let now = Date()
        let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: now))!
        let startOfLastMonth = calendar.date(byAdding: .month, value: -1, to: startOfMonth)!
        let iso = ISO8601DateFormatter()

        let thisMonthItems = expenses.filter {
            (iso.date(from: $0.created_at) ?? .distantPast) >= startOfMonth
        }
        let lastMonthItems = expenses.filter {
            let d = iso.date(from: $0.created_at) ?? .distantPast
            return d >= startOfLastMonth && d < startOfMonth
        }

        let thisTotal = thisMonthItems.reduce(0.0) { $0 + $1.amount }
        let lastTotal = lastMonthItems.reduce(0.0) { $0 + $1.amount }

        totalThisMonth        = thisTotal
        totalAllTime          = expenses.reduce(0.0) { $0 + $1.amount }
        monthOverMonthTrend   = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0
        receiptCountThisMonth = thisMonthItems.count
        submittedReportsCount = reports.filter { $0.status == "submitted" }.count
    }
}
