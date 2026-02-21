import Foundation

/// Lightweight UserDefaults-backed disk cache for any `Codable` value.
///
/// ## Production-grade cross-account safety
/// All keys are stored as `"{currentUserId}:{feature_key}"`.
/// A different `currentUserId` automatically produces cache misses — no
/// `clearAll()` is ever needed between accounts.  This is the same pattern as
/// Android's `AppDataCache` which keys everything as `"$userId:$dataKey"`.
///
/// ## Pattern — cache-then-network (stale-while-revalidate):
/// 1. Set `DataCache.shared.currentUserId = clerkUser.id` at sign-in,
///    **before** any view that reads the cache is composed (zero stale flash).
/// 2. On view `init`, call `load(_:key:)` to seed `@State` with the last-known
///    data.  The view renders real content immediately — no spinner flash.
/// 3. In `.task { }` fetch fresh data from the network and call `save(_:key:)`.
/// 4. On sign-out, `clearCurrentUser()` is optional disk cleanup; cross-account
///    correctness is guaranteed by the userId namespace regardless.
final class DataCache {
    static let shared = DataCache()
    private init() {}

    private let defaults = UserDefaults.standard

    /// The currently authenticated user's id.
    ///
    /// **Must be set at sign-in** (before any cache-reading view is composed)
    /// so every save/load automatically uses the correct userId namespace.
    /// Different userId → automatic cache miss — no `clearAll()` needed.
    var currentUserId: String = "anon"

    // MARK: - Keys (base strings; fully-qualified at runtime via fullKey(_:))

    enum Key {
        // Legacy keys (kept for backward-compat cleanup)
        static let homeExpenses    = "home_expenses"
        static let homeReports     = "home_reports"
        static let reportsExpenses = "reports_expenses"
        static let reportsReports  = "reports_reports"
        // Current keys used by AppDataStore
        static let expenses        = "expenses"
        static let reports         = "reports"
        static let workspaces      = "workspaces"
    }

    // MARK: - Internal namespace helper

    /// Returns `"{currentUserId}:{base}"` — scopes every key to the
    /// currently authenticated account automatically.
    private func fullKey(_ base: String) -> String { "\(currentUserId):\(base)" }

    // MARK: - Save / Load

    func save<T: Encodable>(_ value: T, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults.set(data, forKey: fullKey(key))
    }

    func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = defaults.data(forKey: fullKey(key)) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    // MARK: - Clear

    /// Removes the current user's cached data from disk.
    ///
    /// Call at sign-out as a **privacy / storage** cleanup.
    /// Cross-account safety does NOT depend on this — a different
    /// `currentUserId` already guarantees cache misses for the next account.
    func clearCurrentUser() {
        // Clear both legacy and current keys
        [Key.homeExpenses, Key.homeReports,
         Key.reportsExpenses, Key.reportsReports,
         Key.expenses, Key.reports,
         Key.workspaces].forEach { defaults.removeObject(forKey: fullKey($0)) }
    }

    /// Legacy alias — prefer `clearCurrentUser()`.
    func clearAll() { clearCurrentUser() }
}
