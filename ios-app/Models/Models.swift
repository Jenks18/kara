import Foundation

// MARK: - Expense Report Model

struct ExpenseReport: Identifiable, Codable {
    let id: String
    let created_at: String
    let user_id: String?
    let user_email: String
    let workspace_name: String
    let workspace_avatar: String?
    let title: String
    let status: String
    let total_amount: Double
    let items: [ExpenseItem]?
    
    // Date formatter helper
    var formattedDate: String {
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: created_at) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return created_at
    }
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
    let user_email: String?
    let workspace_name: String?
    
    // Date formatter helper
    var formattedDate: String {
        let dateStr = transaction_date ?? created_at
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: dateStr) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return dateStr
    }
}

// MARK: - Workspace Model

struct Workspace: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let currency: String
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, currency
        case createdAt = "created_at"
    }
    
    var initials: String {
        let words = name.split(separator: " ")
        if words.count >= 2 {
            let first = String(words[0].prefix(1))
            let second = String(words[1].prefix(1))
            return (first + second).uppercased()
        } else {
            return String(name.prefix(2)).uppercased()
        }
    }
    
    var formattedDate: String {
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: createdAt) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return createdAt
    }
}

// MARK: - User Model

struct User: Codable {
    let email: String
    let name: String?
    let avatar_url: String?
}
