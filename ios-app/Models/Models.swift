import Foundation

// MARK: - Expense Report Model

struct ExpenseReport: Identifiable, Codable {
    let id: String
    let created_at: String
    let user_id: String?
    let user_email: String?
    let workspace_name: String
    let workspace_avatar: String?
    let title: String
    let status: String
    let total_amount: Double
    let items: [ExpenseItem]?
    /// Mobile endpoint returns items_count instead of full items array
    let items_count: Int?
    /// Mobile endpoint returns thumbnail URLs directly
    let thumbnails: [String]?
    
    /// Robust decoder — handles nulls in required fields gracefully so a
    /// single bad row never kills the entire list decode.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id              = try c.decode(String.self, forKey: .id)
        created_at      = try c.decodeIfPresent(String.self, forKey: .created_at) ?? ""
        user_id         = try c.decodeIfPresent(String.self, forKey: .user_id)
        user_email      = try c.decodeIfPresent(String.self, forKey: .user_email)
        workspace_name  = try c.decodeIfPresent(String.self, forKey: .workspace_name) ?? ""
        workspace_avatar = try c.decodeIfPresent(String.self, forKey: .workspace_avatar)
        title           = try c.decodeIfPresent(String.self, forKey: .title) ?? "Untitled Report"
        status          = try c.decodeIfPresent(String.self, forKey: .status) ?? "draft"
        total_amount    = try c.decodeIfPresent(Double.self, forKey: .total_amount) ?? 0
        items           = try c.decodeIfPresent([ExpenseItem].self, forKey: .items)
        items_count     = try c.decodeIfPresent(Int.self, forKey: .items_count)
        thumbnails      = try c.decodeIfPresent([String].self, forKey: .thumbnails)
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, created_at, user_id, user_email, workspace_name, workspace_avatar
        case title, status, total_amount, items, items_count, thumbnails
    }
    
    /// Number of expense items — prefers items_count from mobile endpoint,
    /// falls back to items array count from web endpoint.
    var displayItemsCount: Int {
        items_count ?? items?.count ?? 0
    }
    
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
    let image_url: String?
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
    
    /// Robust decoder — provides sensible defaults for fields that may be null
    /// in the database so a single bad row never kills the entire list decode.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id                = try c.decode(String.self, forKey: .id)
        created_at        = try c.decodeIfPresent(String.self, forKey: .created_at) ?? ""
        image_url         = try c.decodeIfPresent(String.self, forKey: .image_url)
        description       = try c.decodeIfPresent(String.self, forKey: .description)
        category          = try c.decodeIfPresent(String.self, forKey: .category) ?? "Uncategorized"
        amount            = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        merchant_name     = try c.decodeIfPresent(String.self, forKey: .merchant_name)
        transaction_date  = try c.decodeIfPresent(String.self, forKey: .transaction_date)
        processing_status = try c.decodeIfPresent(String.self, forKey: .processing_status) ?? "processed"
        report_id         = try c.decodeIfPresent(String.self, forKey: .report_id)
        kra_verified      = try c.decodeIfPresent(Bool.self, forKey: .kra_verified)
        user_email        = try c.decodeIfPresent(String.self, forKey: .user_email)
        workspace_name    = try c.decodeIfPresent(String.self, forKey: .workspace_name)
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, created_at, image_url, description, category, amount
        case merchant_name, transaction_date, processing_status, report_id
        case kra_verified, user_email, workspace_name
    }
    
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
    let currency: String?
    let currencySymbol: String?
    let address: String?
    let avatarUrl: String?
    let createdAt: String?
    let planType: String?
    let ownerID: String?
    let isActive: Bool?
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, currency, address
        case currencySymbol = "currency_symbol"
        case avatarUrl = "avatar"
        case createdAt = "created_at"
        case planType = "plan_type"
        case ownerID = "owner_id"
        case isActive = "is_active"
    }
    
    /// Safe currency code — never nil
    var safeCurrency: String {
        currency ?? "KES"
    }
    
    var avatarURL: URL? {
        guard let avatarUrl = avatarUrl,
              avatarUrl.hasPrefix("http") else { return nil }
        return URL(string: avatarUrl)
    }
    
    var displayCurrencySymbol: String {
        if let symbol = currencySymbol, !symbol.isEmpty {
            return symbol
        }
        
        // Fallback to computed symbol
        switch safeCurrency.uppercased() {
        case "KES", "KSH": return "KSh"
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
        default: return safeCurrency
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
        guard let dateStr = createdAt else { return "" }
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: dateStr) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return dateStr
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
    
    /// Robust decoder — provides sensible defaults for fields that may be null
    /// in the database so a single bad row never kills the profile decode.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id               = try c.decode(String.self, forKey: .id)
        user_id          = try c.decodeIfPresent(String.self, forKey: .user_id) ?? ""
        user_email       = try c.decodeIfPresent(String.self, forKey: .user_email) ?? ""
        display_name     = try c.decodeIfPresent(String.self, forKey: .display_name)
        first_name       = try c.decodeIfPresent(String.self, forKey: .first_name)
        last_name        = try c.decodeIfPresent(String.self, forKey: .last_name)
        avatar_emoji     = try c.decodeIfPresent(String.self, forKey: .avatar_emoji) ?? "💼"
        avatar_color     = try c.decodeIfPresent(String.self, forKey: .avatar_color) ?? "#0066FF"
        avatar_image_url = try c.decodeIfPresent(String.self, forKey: .avatar_image_url)
        phone_number     = try c.decodeIfPresent(String.self, forKey: .phone_number)
        legal_first_name = try c.decodeIfPresent(String.self, forKey: .legal_first_name)
        legal_last_name  = try c.decodeIfPresent(String.self, forKey: .legal_last_name)
        date_of_birth    = try c.decodeIfPresent(String.self, forKey: .date_of_birth)
        address_line1    = try c.decodeIfPresent(String.self, forKey: .address_line1)
        address_line2    = try c.decodeIfPresent(String.self, forKey: .address_line2)
        city             = try c.decodeIfPresent(String.self, forKey: .city)
        state            = try c.decodeIfPresent(String.self, forKey: .state)
        zip_code         = try c.decodeIfPresent(String.self, forKey: .zip_code)
        country          = try c.decodeIfPresent(String.self, forKey: .country) ?? "KE"
        created_at       = try c.decodeIfPresent(String.self, forKey: .created_at) ?? ""
        updated_at       = try c.decodeIfPresent(String.self, forKey: .updated_at) ?? ""
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, user_id, user_email, display_name, first_name, last_name
        case avatar_emoji, avatar_color, avatar_image_url, phone_number
        case legal_first_name, legal_last_name, date_of_birth
        case address_line1, address_line2, city, state, zip_code, country
        case created_at, updated_at
    }
    
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
