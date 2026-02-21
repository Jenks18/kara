import Foundation
import Combine

/// Production-grade workspace manager — global singleton that owns the active
/// workspace state and keeps CurrencyFormatter.defaultCurrencyCode in sync.
///
/// ## Architecture (mirrors Android's WorkspaceRepository):
///
/// 1. On app launch, `seed()` reads from `DataCache` and sets the active
///    workspace + currency **synchronously** — no spinner flash.
/// 2. Any view that fetches fresh workspaces calls `update(_:)` which
///    re-persists to cache and re-evaluates the active workspace.
/// 3. `CurrencyFormatter.shared.defaultCurrencyCode` is always kept in sync
///    so every `formatSimple()` call in the app uses the right currency.
///
/// Usage:
/// ```
/// // In MainAppView.onAppear (synchronous seed from cache):
/// WorkspaceManager.shared.seed()
///
/// // After fetching fresh workspaces from API:
/// WorkspaceManager.shared.update(freshWorkspaces)
///
/// // Read current state anywhere:
/// let currency = WorkspaceManager.shared.activeCurrency   // "KES"
/// let workspace = WorkspaceManager.shared.activeWorkspace // Workspace?
/// ```
final class WorkspaceManager: ObservableObject {
    static let shared = WorkspaceManager()
    private init() {}

    // MARK: - Published state

    /// All workspaces for the current user.
    @Published private(set) var workspaces: [Workspace] = []

    /// The currently active workspace (first one by default).
    @Published private(set) var activeWorkspace: Workspace?

    /// The active workspace's currency code — always non-nil, defaults to "KES".
    @Published private(set) var activeCurrency: String = "KES"

    // MARK: - Seed from cache (synchronous, called once on launch)

    /// Seeds state from `DataCache` — call in MainAppView.onAppear.
    /// This is synchronous so the first frame already has the right currency.
    func seed() {
        guard let cached = DataCache.shared.load([Workspace].self, key: DataCache.Key.workspaces) else { return }
        workspaces = cached
        selectActive(from: cached)
    }

    // MARK: - Update after network fetch

    /// Call after fetching fresh workspaces from the API.
    /// Persists to cache and re-evaluates the active workspace.
    func update(_ freshWorkspaces: [Workspace]) {
        workspaces = freshWorkspaces
        DataCache.shared.save(freshWorkspaces, key: DataCache.Key.workspaces)
        selectActive(from: freshWorkspaces)
    }

    // MARK: - Active workspace selection

    /// Manually set the active workspace (e.g. user switches workspace).
    func setActive(_ workspace: Workspace) {
        activeWorkspace = workspace
        applyCurrency(workspace.safeCurrency)
    }

    // MARK: - Clear on sign-out

    func clear() {
        workspaces = []
        activeWorkspace = nil
        activeCurrency = "KES"
        CurrencyFormatter.shared.defaultCurrencyCode = "KES"
    }

    // MARK: - Private

    private func selectActive(from list: [Workspace]) {
        // Mirror Android: prefer is_active == true, fall back to first
        let active = list.first(where: { $0.isActive == true }) ?? list.first
        activeWorkspace = active
        applyCurrency(active?.safeCurrency ?? "KES")
    }

    private func applyCurrency(_ code: String) {
        activeCurrency = code
        CurrencyFormatter.shared.defaultCurrencyCode = code
        print("💰 WorkspaceManager: active currency → \(code)")
    }
}
