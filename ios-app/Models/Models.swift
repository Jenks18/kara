import Foundation

// MARK: - Expense Report Model

struct ExpenseReport: Identifiable, Codable {
    let id: String
    let created_at: String
    let user_email: String
    let workspace_name: String
    let title: String
    let status: String
    let total_amount: Double
    let items: [ExpenseItem]
}

// MARK: - Expense Item Model

struct ExpenseItem: Identifiable, Codable {
    let id: String
    let created_at: String
    let image_url: String
    let description: String?
    let category: String
    let amount: Double
    let merchant_name: String?
    let transaction_date: String?
    let processing_status: String // scanning, processed, needs_review, error
    let report_id: String?
    let kra_verified: Bool?
}

// MARK: - Workspace Model

struct Workspace: Identifiable, Codable {
    let id: String
    let name: String
    let created_at: String
    let owner_email: String
}

// MARK: - User Model

struct User: Codable {
    let email: String
    let name: String?
    let avatar_url: String?
}
