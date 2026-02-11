import Foundation
import Combine

// MARK: - Configuration
struct AppConfig {
    static let supabaseURL = "https://bkypfuyiknytkuhxtduc.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXBmdXlpa255dGt1aHh0ZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODkxNjAsImV4cCI6MjA4MzA2NTE2MH0.7OqBp3VbfffoYt2xOYUuzYy_dOvDchvGftE4gqCfVKo"
    
    // Production Clerk Keys
    static let clerkPublishableKey = "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k"
    static let clerkFrontendAPI = "https://clerk.mafutapass.com"
    static let baseAPIURL = "https://www.mafutapass.com/api"
}

// MARK: - Authentication Manager
@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var authToken: String?
    
    static let shared = AuthManager()
    
    private init() {
        // Check for stored auth token
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            authToken = token
            isAuthenticated = true
            // Fetch user profile
            Task {
                await fetchUserProfile()
            }
        }
    }
    
    func signIn(email: String, password: String) async throws {
        // For now, using simple authentication
        // TODO: Integrate with Clerk SDK when available for iOS
        
        let url = URL(string: "\(AppConfig.baseAPIURL)/auth/sign-in")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.invalidCredentials
        }
        
        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        
        authToken = authResponse.token
        UserDefaults.standard.set(authResponse.token, forKey: "auth_token")
        UserDefaults.standard.set(email, forKey: "user_email")
        
        isAuthenticated = true
        await fetchUserProfile()
    }
    
    func signUp(email: String, password: String, name: String) async throws {
        let url = URL(string: "\(AppConfig.baseAPIURL)/auth/sign-up")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password, "name": name]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.signUpFailed
        }
        
        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        
        authToken = authResponse.token
        UserDefaults.standard.set(authResponse.token, forKey: "auth_token")
        UserDefaults.standard.set(email, forKey: "user_email")
        
        isAuthenticated = true
        await fetchUserProfile()
    }
    
    func signOut() {
        authToken = nil
        currentUser = nil
        isAuthenticated = false
        
        UserDefaults.standard.removeObject(forKey: "auth_token")
        UserDefaults.standard.removeObject(forKey: "user_email")
    }
    
    private func fetchUserProfile() async {
        guard let token = authToken else { return }
        
        do {
            let url = URL(string: "\(AppConfig.baseAPIURL)/user/profile")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            
            let (data, _) = try await URLSession.shared.data(for: request)
            currentUser = try JSONDecoder().decode(User.self, from: data)
        } catch {
            print("Failed to fetch user profile: \(error)")
        }
    }
}

// MARK: - Auth Models
struct AuthResponse: Codable {
    let token: String
    let user: User
}

enum AuthError: LocalizedError {
    case invalidCredentials
    case signUpFailed
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password"
        case .signUpFailed:
            return "Failed to create account"
        case .networkError:
            return "Network error. Please try again."
        }
    }
}

// MARK: - API Client with Authentication
class APIClient {
    static let shared = APIClient()
    private let baseURL = AppConfig.baseAPIURL
    
    private var authToken: String? {
        UserDefaults.standard.string(forKey: "auth_token")
    }
    
    // MARK: - Expense Reports
    
    func fetchReports() async throws -> [ExpenseReport] {
        let url = URL(string: "\(baseURL)/expense-reports")!
        var request = URLRequest(url: url)
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode([ExpenseReport].self, from: data)
    }
    
    func fetchReport(id: String) async throws -> ExpenseReport {
        let url = URL(string: "\(baseURL)/expense-reports/\(id)")!
        var request = URLRequest(url: url)
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(ExpenseReport.self, from: data)
    }
    
    func fetchExpenses() async throws -> [ExpenseItem] {
        let url = URL(string: "\(baseURL)/expense-items")!
        var request = URLRequest(url: url)
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([ExpenseItem].self, from: data)
    }
}

// MARK: - API Error
enum APIError: LocalizedError {
    case invalidResponse
    case unauthorized
    case serverError(Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid server response"
        case .unauthorized:
            return "Please sign in to continue"
        case .serverError(let code):
            return "Server error (\(code))"
        }
    }
}
