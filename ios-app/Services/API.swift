import Foundation
import Clerk

// Production-grade API service — all routes use /api/mobile/* endpoints
// authenticated via Clerk Bearer JWT, matching the Android app exactly.
//
// NEVER query Supabase directly from the client. All data flows through
// the backend which mints Supabase-compatible JWTs from the Clerk token.
class API {
    static let shared = API()
    private let baseURL = "https://www.kachalabs.com/api"
    
    // MARK: - Helper to get Clerk JWT token
    
    private func getClerkToken() async throws -> String {
        // Use the Clerk iOS SDK — handles TLS, token refresh, and session management
        guard let session = Clerk.shared.session else { throw APIError.notAuthenticated }
        guard let tokenResource = try await session.getToken() else { throw APIError.notAuthenticated }
        return tokenResource.jwt
    }
    
    private func makeAuthenticatedRequest(url: URL, method: String = "GET", body: Data? = nil) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Clerk iOS SDK handles token refresh internally.
        // getToken() returns a valid, fresh JWT every time the session is active.
        let token = try await getClerkToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            #if DEBUG
            let bodyStr = String(data: data, encoding: .utf8) ?? "<no body>"
            print("❌ API \(method) \(url.path) → \(httpResponse.statusCode): \(bodyStr)")
            #endif
            throw APIError.invalidResponse
        }
        
        return data
    }
    
    // MARK: - Expense Reports
    
    func fetchReports() async throws -> [ExpenseReport] {
        let url = URL(string: "\(baseURL)/mobile/expense-reports")!
        let data = try await makeAuthenticatedRequest(url: url)
        do {
            return try JSONDecoder().decode([ExpenseReport].self, from: data)
        } catch {
            #if DEBUG
            print("❌ Decode [ExpenseReport] failed: \(error)")
            print("   Response: \(String(data: data.prefix(500), encoding: .utf8) ?? "<binary>")")
            #endif
            throw error
        }
    }
    
    func fetchReport(id: String) async throws -> ExpenseReport {
        let url = URL(string: "\(baseURL)/mobile/expense-reports/\(id)")!
        let data = try await makeAuthenticatedRequest(url: url)
        do {
            return try JSONDecoder().decode(ExpenseReport.self, from: data)
        } catch {
            #if DEBUG
            print("❌ Decode ExpenseReport failed: \(error)")
            print("   Response: \(String(data: data.prefix(500), encoding: .utf8) ?? "<binary>")")
            #endif
            throw error
        }
    }
    
    // MARK: - Expense Items
    
    func fetchExpenses() async throws -> [ExpenseItem] {
        let url = URL(string: "\(baseURL)/mobile/receipts?limit=100")!
        let data = try await makeAuthenticatedRequest(url: url)
        do {
            return try JSONDecoder().decode([ExpenseItem].self, from: data)
        } catch {
            #if DEBUG
            print("❌ Decode [ExpenseItem] failed: \(error)")
            print("   Response: \(String(data: data.prefix(500), encoding: .utf8) ?? "<binary>")")
            #endif
            throw error
        }
    }
    
    /// Update expense item (PATCH endpoint like Android)
    func updateExpense(id: String, updates: [String: Any]) async throws -> ExpenseItem {
        let url = URL(string: "\(baseURL)/mobile/receipts/\(id)")!
        let body = try JSONSerialization.data(withJSONObject: updates)
        let data = try await makeAuthenticatedRequest(url: url, method: "PATCH", body: body)
        
        struct UpdateResponse: Codable {
            let success: Bool
            let receipt: ExpenseItem
        }
        
        let response = try JSONDecoder().decode(UpdateResponse.self, from: data)
        return response.receipt
    }
    
    // MARK: - Receipt Upload
    
    /// Upload receipts via the mobile endpoint — one image per request,
    /// same as Android. The backend creates reports and items automatically.
    func uploadReceipts(
        images: [Data],
        workspaceId: String,
        workspaceName: String,
        description: String?,
        category: String?,
        latitude: Double?,
        longitude: Double?,
        qrUrl: String? = nil
    ) async throws -> UploadReceiptsResponse {
        let url = URL(string: "\(baseURL)/mobile/receipts/upload")!
        var lastReportId: String?
        var allSucceeded = true
        
        for (index, imageData) in images.enumerated() {
            let boundary = UUID().uuidString
            var body = Data()
            
            // Single image — field name "image" (matches Android / backend)
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"image\"; filename=\"receipt\(index).jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
            
            // Workspace context
            func addField(_ name: String, _ value: String) {
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
                body.append(value.data(using: .utf8)!)
                body.append("\r\n".data(using: .utf8)!)
            }
            
            addField("workspaceId", workspaceId)
            addField("workspaceName", workspaceName)
            if let reportId = lastReportId { addField("reportId", reportId) }
            if let latitude  = latitude  { addField("latitude",  "\(latitude)") }
            if let longitude = longitude { addField("longitude", "\(longitude)") }
            if let qrUrl     = qrUrl     { addField("qrUrl",     qrUrl) }
            
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
                #if DEBUG
                let bodyStr = String(data: data, encoding: .utf8) ?? "<no body>"
                print("❌ Upload image \(index) failed: \(bodyStr)")
                #endif
                allSucceeded = false
                continue
            }
            
            // Extract reportId so subsequent images join the same report
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let rid = json["reportId"] as? String {
                lastReportId = rid
            }
        }
        
        return UploadReceiptsResponse(success: allSucceeded, reportId: lastReportId, message: nil)
    }
    
    // MARK: - Workspaces
    
    func fetchWorkspaces() async throws -> [Workspace] {
        let url = URL(string: "\(baseURL)/mobile/workspaces")!
        let data = try await makeAuthenticatedRequest(url: url)
        
        struct WorkspacesResponse: Codable {
            let workspaces: [Workspace]
        }
        
        do {
            let response = try JSONDecoder().decode(WorkspacesResponse.self, from: data)
            return response.workspaces
        } catch {
            #if DEBUG
            print("❌ Decode WorkspacesResponse failed: \(error)")
            print("   Response: \(String(data: data.prefix(500), encoding: .utf8) ?? "<binary>")")
            #endif
            throw error
        }
    }
    
    func createWorkspace(name: String, avatar: String, currency: String, currencySymbol: String? = nil) async throws -> Workspace {
        let url = URL(string: "\(baseURL)/mobile/workspaces")!
        
        struct CreatePayload: Codable {
            let name: String
            let avatar: String
            let currency: String
            let currencySymbol: String?
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
    
    // MARK: - User Profile (via /api/auth/mobile-profile — same as Android)
    
    func getUserProfile(userId: String) async throws -> UserProfile? {
        let url = URL(string: "\(baseURL)/auth/mobile-profile")!
        let data = try await makeAuthenticatedRequest(url: url)
        
        struct ProfileResponse: Codable {
            let success: Bool
            let profile: UserProfile?
        }
        
        do {
            let response = try JSONDecoder().decode(ProfileResponse.self, from: data)
            return response.profile
        } catch {
            #if DEBUG
            print("❌ Decode ProfileResponse failed: \(error)")
            print("   Response: \(String(data: data.prefix(500), encoding: .utf8) ?? "<binary>")")
            #endif
            throw error
        }
    }
    
    func updateUserProfile(userId: String, updates: [String: Any]) async throws -> UserProfile {
        let url = URL(string: "\(baseURL)/auth/mobile-profile")!
        let body = try JSONSerialization.data(withJSONObject: updates)
        let data = try await makeAuthenticatedRequest(url: url, method: "PATCH", body: body)
        
        struct ProfileResponse: Codable {
            let success: Bool
            let profile: UserProfile
        }
        
        let response = try JSONDecoder().decode(ProfileResponse.self, from: data)
        return response.profile
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
        let url = URL(string: "\(baseURL)/mobile/workspaces/\(id)")!
        let data = try await makeAuthenticatedRequest(url: url)
        
        struct WorkspaceResponse: Codable {
            let workspace: Workspace
        }
        
        let response = try JSONDecoder().decode(WorkspaceResponse.self, from: data)
        return response.workspace
    }
    
    func updateWorkspace(id: String, updates: [String: Any]) async throws -> Workspace {
        let url = URL(string: "\(baseURL)/mobile/workspaces/\(id)")!
        let body = try JSONSerialization.data(withJSONObject: updates)
        let data = try await makeAuthenticatedRequest(url: url, method: "PATCH", body: body)
        
        struct WorkspaceResponse: Codable {
            let workspace: Workspace
        }
        
        let response = try JSONDecoder().decode(WorkspaceResponse.self, from: data)
        return response.workspace
    }
    
    func deleteWorkspace(id: String) async throws {
        let url = URL(string: "\(baseURL)/mobile/workspaces/\(id)")!
        _ = try await makeAuthenticatedRequest(url: url, method: "DELETE")
    }
    
    func getWorkspaceMembers(workspaceId: String) async throws -> [WorkspaceMember] {
        let url = URL(string: "\(baseURL)/mobile/workspaces/\(workspaceId)/members")!
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
        _ = try await updateWorkspace(id: workspaceId, updates: ["avatar": imageUrl])
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
    let reportId: String?
    let message: String?
}
