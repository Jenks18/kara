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
    let currencySymbol: String?
    let address: String?
    let avatarUrl: String?
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, currency, address
        case currencySymbol = "currency_symbol"
        case avatarUrl = "avatar_url"
        case createdAt = "created_at"
    }
    
    var avatarURL: URL? {
        guard let avatarUrl = avatarUrl else { return nil }
        return URL(string: avatarUrl)
    }
    
    var displayCurrencySymbol: String {
        if let symbol = currencySymbol, !symbol.isEmpty {
            return symbol
        }
        
        // Fallback to computed symbol
        switch currency {
        case "KSH": return "KSh"
        case "USD": return "$"
        case "EUR": return "€"
        case "GBP": return "£"
        case "JPY": return "¥"
        case "AUD": return "A$"
        case "CAD": return "C$"
        case "CHF": return "Fr"
        case "CNY": return "¥"
        case "INR": return "₹"
        case "ZAR": return "R"
        case "NGN": return "₦"
        case "GHS": return "₵"
        case "TZS": return "TSh"
        case "UGX": return "USh"
        default: return currency
        }
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

// MARK: - User Profile Model

struct UserProfile: Identifiable, Codable {
    let id: String
    let user_id: String
    let user_email: String
    var display_name: String?
    var first_name: String?
    var last_name: String?
    var avatar_emoji: String
    var avatar_color: String
    var avatar_image_url: String?
    var phone_number: String?
    var legal_first_name: String?
    var legal_last_name: String?
    var date_of_birth: String?
    var address_line1: String?
    var address_line2: String?
    var city: String?
    var state: String?
    var zip_code: String?
    var country: String
    let created_at: String
    let updated_at: String
    
    var fullName: String {
        if let first = first_name, let last = last_name {
            return "\(first) \(last)"
        }
        return display_name ?? user_email
    }
    
    var legalFullName: String? {
        if let first = legal_first_name, let last = legal_last_name {
            return "\(first) \(last)"
        }
        return nil
    }
    
    var fullAddress: String? {
        var components: [String] = []
        if let line1 = address_line1 { components.append(line1) }
        if let line2 = address_line2 { components.append(line2) }
        if let city = city { components.append(city) }
        if let state = state { components.append(state) }
        if let zip = zip_code { components.append(zip) }
        return components.isEmpty ? nil : components.joined(separator: ", ")
    }
}

// MARK: - Workspace Member

struct WorkspaceMember: Identifiable, Codable {
    let id: String
    let userId: String
    let workspaceId: String
    let email: String
    let role: String
    let displayName: String?
    let firstName: String?
    let lastName: String?
    let avatarEmoji: String?
    let avatarColor: String?
    let avatarImageUrl: String?
    let joinedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case workspaceId = "workspace_id"
        case email
        case role
        case displayName = "display_name"
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarEmoji = "avatar_emoji"
        case avatarColor = "avatar_color"
        case avatarImageUrl = "avatar_image_url"
        case joinedAt = "joined_at"
    }
}
