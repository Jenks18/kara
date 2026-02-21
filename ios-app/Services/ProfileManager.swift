import Foundation
import Combine

/// Single source of truth for the current user's profile and avatar.
///
/// Injected as `@EnvironmentObject` at the app root — every screen reads
/// from this instead of making independent API calls.
///
/// Mirrors Android's `ProfileCache` + `AvatarManager` pattern (Hilt singletons)
/// and the webapp's `AvatarContext` (React Context).
///
/// ## Loading strategy — cache-then-network (stale-while-revalidate):
/// 1. `loadProfile(userId:)` first restores the last-known profile from
///    `UserDefaults` (keyed by `userId`) and sets `isLoaded = true` immediately
///    → the account screen renders real content with **zero skeleton flash**.
/// 2. A fresh API fetch runs in the background and updates the UI silently.
/// 3. Cache keys are per-userId, so a different account on the same device
///    always starts with a cache miss and shows the skeleton (correct behaviour).
///
/// - Write: call `loadProfile(userId:)` once after auth, or `update(_:)` after edits.
/// - Read:  observe `@Published profile`, `avatarEmoji`, `displayName`, `displayEmail`.
@MainActor
class ProfileManager: ObservableObject {
    static let shared = ProfileManager()

    // MARK: - Published state (drives all UI)
    @Published private(set) var profile: UserProfile?
    @Published private(set) var avatarEmoji: String = "💼"
    @Published private(set) var displayName: String = ""
    @Published private(set) var displayEmail: String = ""
    @Published private(set) var isLoaded = false

    // Tracks which userId's cache we are currently serving
    private var currentUserId: String?

    private init() {}

    // MARK: - Load (cache-then-network)

    /// Synchronously restores cached state for `userId` so the UI has real data
    /// from frame zero — before the async fetch completes.
    /// Call this in the view body (not in a Task) right before the main app view
    /// is composed. Safe to call multiple times; no-op if cache is empty.
    func primeFromCache(userId: String) {
        restoreFromCache(userId: userId)
    }

    func loadProfile(userId: String, fallbackName: String? = nil, fallbackEmail: String? = nil) async {
        currentUserId = userId

        // 1. Restore from cache — instant real data, no skeleton for returning users
        let hadCache = restoreFromCache(userId: userId)
        if !hadCache {
            // First-time load for this userId; show skeleton until network returns
            isLoaded = false
            displayName = fallbackName.flatMap { $0.isEmpty ? nil : $0 } ?? ""
            displayEmail = fallbackEmail ?? ""
            avatarEmoji = "💼"
        }

        // 2. Always fetch fresh in background
        do {
            let fetched = try await API.shared.getUserProfile(userId: userId)
            apply(fetched, fallbackName: fallbackName, fallbackEmail: fallbackEmail)
            persistToCache(userId: userId)  // keep cache up-to-date
        } catch {
            #if DEBUG
            print("[ProfileManager] Network fetch failed: \(error)")
            #endif
            // If we had no cache, unblock the UI anyway (show whatever fallback we have)
            if !hadCache { isLoaded = true }
        }
    }

    // MARK: - Update after local edits (no re-fetch needed)

    func update(_ updated: UserProfile?) {
        apply(updated, fallbackName: nil, fallbackEmail: nil)
        if let uid = currentUserId { persistToCache(userId: uid) }
    }

    /// Update just the avatar emoji (e.g. from an avatar picker).
    func updateAvatar(emoji: String) {
        guard !emoji.isEmpty else { return }
        avatarEmoji = emoji
        if profile != nil { profile?.avatar_emoji = emoji }
        if let uid = currentUserId { persistToCache(userId: uid) }
    }

    // MARK: - Clear on sign-out (in-memory only; cache is per-userId so it's safe to keep)

    func clear() {
        profile = nil
        avatarEmoji = "💼"
        displayName = ""
        displayEmail = ""
        isLoaded = false
        currentUserId = nil
    }

    // MARK: - Private

    private func apply(_ fetched: UserProfile?, fallbackName: String?, fallbackEmail: String?) {
        profile = fetched
        if let p = fetched {
            displayName = p.display_name ?? p.fullName
            displayEmail = p.user_email
            if !p.avatar_emoji.isEmpty { avatarEmoji = p.avatar_emoji }
        } else {
            if let name = fallbackName { displayName = name }
            if let email = fallbackEmail { displayEmail = email }
        }
        isLoaded = true
    }

    // MARK: - UserDefaults cache (keyed by userId for cross-account safety)

    private func cacheKey(_ userId: String) -> String { "kacha_profile_\(userId)" }

    /// Restores persisted profile for `userId`. Returns `true` if cache was found.
    @discardableResult
    private func restoreFromCache(userId: String) -> Bool {
        let k = cacheKey(userId)
        guard let email = UserDefaults.standard.string(forKey: k + "_email"),
              !email.isEmpty else { return false }
        displayEmail = email
        displayName = UserDefaults.standard.string(forKey: k + "_name") ?? ""
        avatarEmoji = UserDefaults.standard.string(forKey: k + "_emoji").flatMap {
            $0.isEmpty ? nil : $0
        } ?? "💼"
        isLoaded = true
        return true
    }

    /// Persists current in-memory state for `userId` to UserDefaults.
    private func persistToCache(userId: String) {
        let k = cacheKey(userId)
        UserDefaults.standard.set(displayEmail, forKey: k + "_email")
        UserDefaults.standard.set(displayName, forKey: k + "_name")
        UserDefaults.standard.set(avatarEmoji, forKey: k + "_emoji")
    }
}
