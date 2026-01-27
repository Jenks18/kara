import Foundation

// API Service to match web app endpoints
class API {
    static let shared = API()
    private let baseURL = "https://www.mafutapass.com/api"
    
    // MARK: - Expense Reports
    
    func fetchReports() async throws -> [ExpenseReport] {
        let url = URL(string: "\(baseURL)/expense-reports")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([ExpenseReport].self, from: data)
    }
    
    func fetchReport(id: String) async throws -> ExpenseReport {
        let url = URL(string: "\(baseURL)/expense-reports/\(id)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(ExpenseReport.self, from: data)
    }
    
    // MARK: - Expense Items
    
    func fetchExpenses() async throws -> [ExpenseItem] {
        // This would call the expense items endpoint
        // For now, returning empty array - implement based on your API
        return []
    }
    
    func createExpense(item: ExpenseItem) async throws -> ExpenseItem {
        let url = URL(string: "\(baseURL)/expense-items")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(item)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(ExpenseItem.self, from: data)
    }
    
    // MARK: - Receipt Upload
    
    func uploadReceipt(imageData: Data) async throws -> String {
        // Upload receipt image and return URL
        // Implement based on your storage solution (Supabase Storage, S3, etc.)
        throw NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not implemented"])
    }
}
