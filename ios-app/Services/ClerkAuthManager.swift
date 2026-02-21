import Foundation
import Combine
import Clerk

// MARK: - Configuration
struct ClerkConfig {
    static let publishableKey = "pk_live_Y2xlcmsua2FjaGFsYWJzLmNvbSQ"
    static let baseAPIURL     = "https://www.kachalabs.com/api"
    /// Called after sign-up to create the Supabase profile row (same as Android Step 2)
    static let profileURL     = "\(baseAPIURL)/auth/create-profile"
}

// MARK: - Clerk User Info (distinct from Models.UserProfile)
struct ClerkUserInfo: Codable {
    let id: String
    let email: String
    let name: String?
    let avatarURL: String?
}

// MARK: - Clerk Auth Manager
// Uses the official Clerk iOS SDK (clerk.auth.*) — mirrors Android's auth flow
// but uses the first-class SDK instead of raw HTTP to Clerk's Frontend API.
@MainActor
class ClerkAuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: ClerkUserInfo?
    @Published var errorMessage: String?
    @Published var isLoading = false

    static let shared = ClerkAuthManager()
    private init() {}

    /// Called from ClerkContentView.onAppear/onChange whenever clerk.user changes.
    /// Reads directly from Clerk.shared.user to avoid SDK type-name conflicts.
    func syncUser() {
        guard let user = Clerk.shared.user else { return }
        // Prefer the primary address; fall back to first in the list
        let email = user.primaryEmailAddress?.emailAddress
               ?? user.emailAddresses.first?.emailAddress
               ?? ""
        let name  = [user.firstName, user.lastName].compactMap { $0 }.joined(separator: " ")
        currentUser = ClerkUserInfo(
            id: user.id,
            email: email,
            name: name.isEmpty ? nil : name,
            avatarURL: user.imageUrl
        )
        isAuthenticated = true
    }

    func clearUser() {
        currentUser = nil
        isAuthenticated = false
        errorMessage = nil
        // Clear cached workspace + currency so a subsequent sign-in gets fresh data
        WorkspaceManager.shared.clear()
    }

    // MARK: - Sign Out
    func signOut() {
        isLoading = true
        Task {
            do {
                // Sign out from Clerk FIRST so clerk.user becomes nil
                // and ClerkContentView reacts to the state change
                try await Clerk.shared.signOut()
            } catch {
                #if DEBUG
                print("[ClerkAuthManager] signOut error: \(error)")
                #endif
            }
            // Always clear local state even if server call fails
            clearUser()
            isLoading = false
        }
    }

    // MARK: - Create Supabase profile after sign-up (mirrors Android Step 2)
    func createProfile(token: String, email: String, username: String, firstName: String, lastName: String) async {
        guard let url = URL(string: ClerkConfig.profileURL) else {
            #if DEBUG
            print("[ClerkAuthManager] createProfile: invalid URL")
            #endif
            return
        }
        let body: [String: String] = [
            "token": token, "email": email,
            "username": username, "firstName": firstName, "lastName": lastName,
        ]
        guard let bodyData = try? JSONEncoder().encode(body) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                #if DEBUG
                print("[ClerkAuthManager] createProfile HTTP \(http.statusCode)")
                #endif
            }
        } catch {
            #if DEBUG
            print("[ClerkAuthManager] createProfile error: \(error)")
            #endif
        }
    }
}

// MARK: - API Client (thin wrapper kept for backward compatibility)
class APIClient {
    static let shared = APIClient()
    func setAuthToken(_ token: String) {}
    func clearAuthToken() {}

    func makeRequest<T: Decodable>(url: URL, method: String = "GET", body: Data? = nil) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = try? await Clerk.shared.session?.getToken()?.jwt {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = body { request.httpBody = body }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
