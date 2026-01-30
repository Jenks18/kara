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
    
    func createWorkspace(name: String, description: String?, currency: String) async throws -> Workspace {
        let url = URL(string: "\(baseURL)/workspaces")!
        
        struct CreatePayload: Codable {
            let name: String
            let description: String?
            let currency: String
        }
        
        let payload = CreatePayload(name: name, description: description, currency: currency)
        let body = try JSONEncoder().encode(payload)
        let data = try await makeAuthenticatedRequest(url: url, method: "POST", body: body)
        
        return try JSONDecoder().decode(Workspace.self, from: data)
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
