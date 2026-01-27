import Foundation
import Combine

// MARK: - Configuration
struct ClerkConfig {
    static let publishableKey = "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k"
    static let frontendAPI = "https://clerk.mafutapass.com"
    static let baseAPIURL = "https://www.mafutapass.com/api"
}

// MARK: - User Profile Model
struct UserProfile: Codable {
    let email: String
    let name: String?
    let avatarURL: String?
}

// MARK: - Clerk Auth Manager
@MainActor
class ClerkAuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: UserProfile?
    @Published var errorMessage: String?
    @Published var isLoading = false
    
    static let shared = ClerkAuthManager()
    
    private init() {
        // Check if user has saved session
        if let token = UserDefaults.standard.string(forKey: "clerk_token"),
           let userData = UserDefaults.standard.data(forKey: "user_profile"),
           let user = try? JSONDecoder().decode(UserProfile.self, from: userData) {
            self.isAuthenticated = true
            self.currentUser = user
            APIClient.shared.setAuthToken(token)
        }
    }
    
    // MARK: - Sign In with Clerk
    func signIn(email: String, password: String) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            let url = URL(string: "\(ClerkConfig.frontendAPI)/v1/client/sign_ins")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body: [String: String] = [
                "identifier": email,
                "password": password
            ]
            request.httpBody = try JSONEncoder().encode(body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = "Network error"
                isLoading = false
                return false
            }
            
            if httpResponse.statusCode != 200 {
                errorMessage = "Invalid email or password"
                isLoading = false
                return false
            }
            
            // Parse response and extract token
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let client = json["client"] as? [String: Any],
               let sessions = client["sessions"] as? [[String: Any]],
               let firstSession = sessions.first,
               let lastActiveToken = firstSession["last_active_token"] as? [String: Any],
               let token = lastActiveToken["jwt"] as? String,
               let user = firstSession["user"] as? [String: Any],
               let emailAddresses = user["email_addresses"] as? [[String: Any]],
               let firstEmail = emailAddresses.first,
               let emailAddress = firstEmail["email_address"] as? String {
                
                let firstName = user["first_name"] as? String ?? ""
                let lastName = user["last_name"] as? String ?? ""
                let fullName = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
                
                let userProfile = UserProfile(
                    email: emailAddress,
                    name: fullName.isEmpty ? nil : fullName,
                    avatarURL: user["image_url"] as? String
                )
                
                // Save session
                UserDefaults.standard.set(token, forKey: "clerk_token")
                if let userData = try? JSONEncoder().encode(userProfile) {
                    UserDefaults.standard.set(userData, forKey: "user_profile")
                }
                
                self.currentUser = userProfile
                self.isAuthenticated = true
                APIClient.shared.setAuthToken(token)
                
                isLoading = false
                return true
            }
            
            errorMessage = "Invalid response format"
            isLoading = false
            return false
            
        } catch {
            errorMessage = "Sign in failed: \(error.localizedDescription)"
            isLoading = false
            return false
        }
    }
    
    // MARK: - Sign Up with Clerk
    func signUp(email: String, password: String, firstName: String, lastName: String) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            let url = URL(string: "\(ClerkConfig.frontendAPI)/v1/client/sign_ups")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body: [String: String] = [
                "email_address": email,
                "password": password,
                "first_name": firstName,
                "last_name": lastName
            ]
            request.httpBody = try JSONEncoder().encode(body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = "Network error"
                isLoading = false
                return false
            }
            
            if httpResponse.statusCode != 200 {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errors = json["errors"] as? [[String: Any]],
                   let firstError = errors.first,
                   let message = firstError["message"] as? String {
                    errorMessage = message
                } else {
                    errorMessage = "Sign up failed"
                }
                isLoading = false
                return false
            }
            
            // Parse response and extract token
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let client = json["client"] as? [String: Any],
               let sessions = client["sessions"] as? [[String: Any]],
               let firstSession = sessions.first,
               let lastActiveToken = firstSession["last_active_token"] as? [String: Any],
               let token = lastActiveToken["jwt"] as? String,
               let user = firstSession["user"] as? [String: Any],
               let emailAddresses = user["email_addresses"] as? [[String: Any]],
               let firstEmail = emailAddresses.first,
               let emailAddress = firstEmail["email_address"] as? String {
                
                let fullName = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
                
                let userProfile = UserProfile(
                    email: emailAddress,
                    name: fullName.isEmpty ? nil : fullName,
                    avatarURL: user["image_url"] as? String
                )
                
                // Save session
                UserDefaults.standard.set(token, forKey: "clerk_token")
                if let userData = try? JSONEncoder().encode(userProfile) {
                    UserDefaults.standard.set(userData, forKey: "user_profile")
                }
                
                self.currentUser = userProfile
                self.isAuthenticated = true
                APIClient.shared.setAuthToken(token)
                
                isLoading = false
                return true
            }
            
            errorMessage = "Invalid response format"
            isLoading = false
            return false
            
        } catch {
            errorMessage = "Sign up failed: \(error.localizedDescription)"
            isLoading = false
            return false
        }
    }
    
    // MARK: - Sign Out
    func signOut() {
        UserDefaults.standard.removeObject(forKey: "clerk_token")
        UserDefaults.standard.removeObject(forKey: "user_profile")
        self.currentUser = nil
        self.isAuthenticated = false
        self.errorMessage = nil
        APIClient.shared.clearAuthToken()
    }
}

// MARK: - API Client with Auth
class APIClient {
    static let shared = APIClient()
    private var authToken: String?
    
    func setAuthToken(_ token: String) {
        self.authToken = token
    }
    
    func clearAuthToken() {
        self.authToken = nil
    }
    
    func makeRequest<T: Decodable>(url: URL, method: String = "GET", body: Data? = nil) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
}
