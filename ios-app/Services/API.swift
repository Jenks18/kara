import Foundation
import Clerk

// API Service to match web app endpoints with Clerk JWT authentication
class API {
    static let shared = API()
    private let baseURL = "https://www.mafutapass.com/api"
    private let supabaseURL = "https://bkypfuyiknytkuhxtduc.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXBmdXlpa255dGt1aHh0ZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODkxNjAsImV4cCI6MjA4MzA2NTE2MH0.7OqBp3VbfffoYt2xOYUuzYy_dOvDchvGftE4gqCfVKo"
    
    // MARK: - Helper to get Clerk JWT token
    
    private func getClerkToken() async throws -> String {
        guard let session = Clerk.shared.session else {
            throw APIError.notAuthenticated
        }
        
        // Get Clerk JWT with Supabase template
        guard let token = try await session.getToken(.init(template: "supabase")) else {
            throw APIError.notAuthenticated
        }
        return token.jwt
    }
    
    private func makeAuthenticatedRequest(url: URL, method: String = "GET", body: Data? = nil) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add Clerk JWT token
        let token = try await getClerkToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }
        
        return data
    }
    
    // MARK: - Expense Reports
    
    func fetchReports() async throws -> [ExpenseReport] {
        let url = URL(string: "\(baseURL)/expense-reports")!
        let data = try await makeAuthenticatedRequest(url: url)
        return try JSONDecoder().decode([ExpenseReport].self, from: data)
    }
    
    func fetchReport(id: String) async throws -> ExpenseReport {
        let url = URL(string: "\(baseURL)/expense-reports/\(id)")!
        let data = try await makeAuthenticatedRequest(url: url)
        return try JSONDecoder().decode(ExpenseReport.self, from: data)
    }
    
    // MARK: - Expense Items
    
    func fetchExpenses() async throws -> [ExpenseItem] {
        // Query Supabase directly for expense_items
        let url = URL(string: "\(supabaseURL)/rest/v1/expense_items?select=*&order=created_at.desc")!
        var request = URLRequest(url: url)
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        
        // Add Clerk JWT for RLS
        let token = try await getClerkToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([ExpenseItem].self, from: data)
    }
    
    func createExpense(item: ExpenseItem) async throws -> ExpenseItem {
        let url = URL(string: "\(baseURL)/expense-items")!
        let body = try JSONEncoder().encode(item)
        let data = try await makeAuthenticatedRequest(url: url, method: "POST", body: body)
        return try JSONDecoder().decode(ExpenseItem.self, from: data)
    }
    
    // MARK: - Receipt Upload
    
    func uploadReceipts(
        images: [Data],
        workspaceId: String,
        description: String?,
        category: String?,
        latitude: Double?,
        longitude: Double?
    ) async throws -> UploadReceiptsResponse {
        let url = URL(string: "\(baseURL)/receipts/upload")!
        
        // Create multipart form data
        let boundary = UUID().uuidString
        var body = Data()
        
        // Add images
        for (index, imageData) in images.enumerated() {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"image\"; filename=\"receipt_\(index).jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        // Add workspace ID
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"workspaceId\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(workspaceId)\r\n".data(using: .utf8)!)
        
        // Add optional fields
        if let description = description {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"description\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(description)\r\n".data(using: .utf8)!)
        }
        
        if let category = category {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"category\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(category)\r\n".data(using: .utf8)!)
        }
        
        if let latitude = latitude {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"latitude\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(latitude)\r\n".data(using: .utf8)!)
        }
        
        if let longitude = longitude {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"longitude\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(longitude)\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        // Make request
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        // Add Clerk JWT
        let token = try await getClerkToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.uploadFailed
        }
        
        return try JSONDecoder().decode(UploadReceiptsResponse.self, from: data)
    }
    
    // MARK: - Workspaces
    
    func fetchWorkspaces() async throws -> [Workspace] {
        let url = URL(string: "\(baseURL)/workspaces")!
        let data = try await makeAuthenticatedRequest(url: url)
        
        struct WorkspacesResponse: Codable {
            let workspaces: [Workspace]
        }
        
        let response = try JSONDecoder().decode(WorkspacesResponse.self, from: data)
        return response.workspaces
    }
    
    func createWorkspace(name: String, avatar: String, currency: String, currencySymbol: String) async throws -> Workspace {
        let url = URL(string: "\(baseURL)/workspaces")!
        
        struct CreatePayload: Codable {
            let name: String
            let avatar: String
            let currency: String
            let currencySymbol: String
        }
        
        let payload = CreatePayload(name: name, avatar: avatar, currency: currency, currencySymbol: currencySymbol)
        let body = try JSONEncoder().encode(payload)
        let data = try await makeAuthenticatedRequest(url: url, method: "POST", body: body)
        
        struct WorkspaceResponse: Codable {
            let workspace: Workspace
        }
        
        let response = try JSONDecoder().decode(WorkspaceResponse.self, from: data)
        return response.workspace
    }
    
    // MARK: - User Profile
    
    func getUserProfile(userId: String) async throws -> UserProfile? {
        let url = URL(string: "\(supabaseURL)/rest/v1/user_profiles?user_id=eq.\(userId)&select=*")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        
        // Add Clerk JWT token for RLS
        let token = try await getClerkToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }
        
        let profiles = try JSONDecoder().decode([UserProfile].self, from: data)
        return profiles.first
    }
    
    func updateUserProfile(userId: String, updates: [String: Any]) async throws -> UserProfile {
        let url = URL(string: "\(supabaseURL)/rest/v1/user_profiles?user_id=eq.\(userId)")!
        
        var payload = updates
        payload["user_id"] = userId
        
        let body = try JSONSerialization.data(withJSONObject: payload)
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        
        let token = try await getClerkToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }
        
        let profiles = try JSONDecoder().decode([UserProfile].self, from: data)
        guard let profile = profiles.first else {
            throw APIError.invalidResponse
        }
        return profile
    }
    
    func updateDisplayName(userId: String, displayName: String) async throws -> UserProfile {
        return try await updateUserProfile(userId: userId, updates: ["display_name": displayName])
    }
    
    func updateLegalName(userId: String, firstName: String, lastName: String) async throws -> UserProfile {
        return try await updateUserProfile(userId: userId, updates: [
            "legal_first_name": firstName,
            "legal_last_name": lastName
        ])
    }
    
    func updatePhoneNumber(userId: String, phoneNumber: String) async throws -> UserProfile {
        return try await updateUserProfile(userId: userId, updates: ["phone_number": phoneNumber])
    }
    
    func updateDateOfBirth(userId: String, dateOfBirth: String) async throws -> UserProfile {
        return try await updateUserProfile(userId: userId, updates: ["date_of_birth": dateOfBirth])
    }
    
    func updateAddress(userId: String, line1: String?, line2: String?, city: String?, state: String?, zipCode: String?, country: String?) async throws -> UserProfile {
        var updates: [String: Any] = [:]
        if let line1 = line1 { updates["address_line1"] = line1 }
        if let line2 = line2 { updates["address_line2"] = line2 }
        if let city = city { updates["city"] = city }
        if let state = state { updates["state"] = state }
        if let zipCode = zipCode { updates["zip_code"] = zipCode }
        if let country = country { updates["country"] = country }
        
        return try await updateUserProfile(userId: userId, updates: updates)
    }
    
    // MARK: - Workspace Details
    
    func getWorkspace(id: String) async throws -> Workspace {
        let url = URL(string: "\(baseURL)/workspaces/\(id)")!
        let data = try await makeAuthenticatedRequest(url: url)
        
        struct WorkspaceResponse: Codable {
            let workspace: Workspace
        }
        
        let response = try JSONDecoder().decode(WorkspaceResponse.self, from: data)
        return response.workspace
    }
    
    func updateWorkspace(id: String, updates: [String: Any]) async throws -> Workspace {
        let url = URL(string: "\(baseURL)/workspaces/\(id)")!
        let body = try JSONSerialization.data(withJSONObject: updates)
        let data = try await makeAuthenticatedRequest(url: url, method: "PATCH", body: body)
        
        struct WorkspaceResponse: Codable {
            let workspace: Workspace
        }
        
        let response = try JSONDecoder().decode(WorkspaceResponse.self, from: data)
        return response.workspace
    }
    
    func deleteWorkspace(id: String) async throws {
        let url = URL(string: "\(baseURL)/workspaces/\(id)")!
        _ = try await makeAuthenticatedRequest(url: url, method: "DELETE")
    }
    
    func getWorkspaceMembers(workspaceId: String) async throws -> [WorkspaceMember] {
        let url = URL(string: "\(baseURL)/workspaces/\(workspaceId)/members")!
        let data = try await makeAuthenticatedRequest(url: url)
        
        struct MembersResponse: Codable {
            let members: [WorkspaceMember]
        }
        
        let response = try JSONDecoder().decode(MembersResponse.self, from: data)
        return response.members
    }
    
    // MARK: - Image Upload
    
    func uploadAvatar(imageData: Data) async throws -> String {
        let url = URL(string: "\(baseURL)/upload-avatar")!
        
        // Create multipart form data
        let boundary = UUID().uuidString
        var body = Data()
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"avatar.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        let token = try await getClerkToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }
        
        struct UploadResponse: Codable {
            let url: String
        }
        
        let uploadResponse = try JSONDecoder().decode(UploadResponse.self, from: data)
        return uploadResponse.url
    }
    
    func uploadWorkspaceAvatar(workspaceId: String, imageData: Data) async throws -> String {
        // Upload image and get URL
        let imageUrl = try await uploadAvatar(imageData: imageData)
        
        // Update workspace with new avatar URL
        let workspace = try await updateWorkspace(id: workspaceId, updates: ["avatar": imageUrl])
        return imageUrl
    }
}

enum APIError: Error {
    case notAuthenticated
    case invalidResponse
    case uploadFailed
}

// MARK: - API Response Models

struct UploadReceiptsResponse: Codable {
    let success: Bool
    let expenseItems: [ExpenseItem]?
    let reportId: String?
    let message: String?
}
