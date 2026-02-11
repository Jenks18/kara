import SwiftUI
import UserNotifications

struct AccountPage: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @Environment(\.colorScheme) var colorScheme
    @State private var userProfile: UserProfile?
    @State private var displayName = ""
    @State private var displayEmail = ""
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient matching webapp
                LinearGradient(
                    colors: [
                        Color(red: 0.93, green: 0.98, blue: 0.95),
                        Color(red: 0.88, green: 0.98, blue: 0.88),
                        Color(red: 0.93, green: 0.98, blue: 0.95)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 32) {
                        // Profile Header with avatar
                        HStack(spacing: 12) {
                            // Avatar circle
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [.green, .green.opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 48, height: 48)
                                .overlay(
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(.white)
                                )
                                .shadow(color: .black.opacity(0.2), radius: 4)
                            
                            // User Info
                            VStack(alignment: .leading, spacing: 2) {
                                Text(displayName)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.primary)
                                
                                Text(displayEmail)
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        .padding(.bottom, 8)
                        .background(Color.white)
                        .shadow(color: .black.opacity(0.05), radius: 1, y: 1)
                        
                        // Account Section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("ACCOUNT")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 24)
                            
                            VStack(spacing: 8) {
                                NavigationLink(destination: ProfilePage()) {
                                    AccountMenuRow(icon: "person.circle", label: "Profile")
                                }
                                NavigationLink(destination: PreferencesPage()) {
                                    AccountMenuRow(icon: "gearshape", label: "Preferences")
                                }
                                NavigationLink(destination: SecurityPage()) {
                                    AccountMenuRow(icon: "lock.shield", label: "Security")
                                }
                            }
                        }
                        
                        // General Section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("GENERAL")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 24)
                            
                            VStack(spacing: 8) {
                                Button(action: {}) {
                                    AccountMenuRow(icon: "questionmark.circle", label: "Help", isExternal: true)
                                }
                                Button(action: {}) {
                                    AccountMenuRow(icon: "sparkles", label: "What's new", isExternal: true)
                                }
                                NavigationLink(destination: AboutPage()) {
                                    AccountMenuRow(icon: "info.circle", label: "About")
                                }
                                Button(action: {}) {
                                    AccountMenuRow(icon: "wrench", label: "Troubleshoot")
                                }
                                Button(action: {
                                    authManager.signOut()
                                }) {
                                    AccountMenuRow(icon: "rectangle.portrait.and.arrow.right", label: "Sign Out", isDestructive: true)
                                }
                            }
                        }
                    }
                    .padding(.bottom, 100)
                }
            }
            .navigationBarHidden(true)
        }
        .task {
            await loadProfile()
        }
    }
    
    private func loadProfile() async {
        guard let userId = authManager.currentUser?.id else { return }
        
        // Set display email
        displayEmail = authManager.currentUser?.email ?? ""
        
        do {
            let profile = try await API.shared.getUserProfile(userId: userId)
            await MainActor.run {
                userProfile = profile
                displayName = profile.display_name ?? authManager.currentUser?.name ?? ""
            }
        } catch {
            // Fallback to auth manager data
            await MainActor.run {
                displayName = authManager.currentUser?.name ?? ""
            }
        }
    }
}

struct AccountMenuRow: View {
    let icon: String
    let label: String
    var isExternal: Bool = false
    var isDestructive: Bool = false
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(isDestructive ? .red : Color(red: 0.05, green: 0.51, blue: 0.31))
                .frame(width: 24)
            
            Text(label)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(isDestructive ? .red : .primary)
            
            Spacer()
            
            if isExternal {
                Image(systemName: "arrow.up.right.square")
                    .font(.system(size: 20))
                    .foregroundColor(.secondary)
            } else if !isDestructive {
                Image(systemName: "chevron.right")
                    .font(.system(size: 20))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 60)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

// MARK: - Sub Pages

struct ProfilePage: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @State private var userProfile: UserProfile?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var displayName = ""
    @State private var phoneNumber = ""
    @State private var dateOfBirth = ""
    @State private var legalName = ""
    @State private var address = ""
    @State private var showAvatarPicker = false
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.93, green: 0.98, blue: 0.95),
                    Color(red: 0.88, green: 0.98, blue: 0.88),
                    Color(red: 0.93, green: 0.98, blue: 0.95)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            if isLoading {
                ProgressView("Loading profile...")
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)
                    Text(error)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                    Button("Retry") {
                        Task { await loadProfile() }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            } else {
                profileContent
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadProfile()
        }
    }
    
    private var profileContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Public Section
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Public")
                            .font(.system(size: 18, weight: .semibold))
                        Text("These details are displayed on your public profile. Anyone can see them.")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 16)
                    
                    // Avatar
                    HStack {
                        Spacer()
                        ZStack(alignment: .bottomTrailing) {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [.green, .green.opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 128, height: 128)
                                .overlay(
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 60))
                                        .foregroundColor(.white)
                                )
                                .shadow(color: .black.opacity(0.2), radius: 8)
                            
                            Button(action: {
                                showAvatarPicker = true
                            }) {
                                Circle()
                                    .fill(Color(red: 0.05, green: 0.51, blue: 0.31))
                                    .frame(width: 40, height: 40)
                                    .overlay(
                                        Image(systemName: "camera.fill")
                                            .font(.system(size: 18))
                                            .foregroundColor(.white)
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white, lineWidth: 4)
                                    )
                            }
                        }
                        Spacer()
                    }
                    .padding(.vertical, 16)
                    
                    // Display name
                    NavigationLink(destination: EditDisplayNameView(userProfile: $userProfile)) {
                        ProfileFieldRow(label: "Display name", value: displayName)
                    }
                    
                    // Contact methods
                    NavigationLink(destination: Text("Contact Methods")) {
                        ProfileFieldRow(label: "Contact methods", value: authManager.currentUser?.email ?? "")
                    }
                }
                
                // Private Section
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Private")
                            .font(.system(size: 18, weight: .semibold))
                        Text("These details are used for travel and payments. They're never shown on your public profile.")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    
                    // Legal name
                    NavigationLink(destination: EditLegalNameView(userProfile: $userProfile)) {
                        ProfileFieldRow(label: "Legal name", value: legalName.isEmpty ? "Not set" : legalName)
                    }
                    
                    // Date of birth
                    NavigationLink(destination: EditDateOfBirthView(userProfile: $userProfile)) {
                        ProfileFieldRow(label: "Date of birth", value: dateOfBirth.isEmpty ? "Not set" : dateOfBirth)
                    }
                    
                    // Phone number
                    NavigationLink(destination: EditPhoneNumberView(userProfile: $userProfile)) {
                        ProfileFieldRow(label: "Phone number", value: phoneNumber.isEmpty ? "Not set" : phoneNumber)
                    }
                    
                    // Address
                    NavigationLink(destination: EditAddressView(userProfile: $userProfile)) {
                        ProfileFieldRow(label: "Address", value: address.isEmpty ? "Not set" : address)
                    }
                }
            }
            .padding(.vertical, 24)
            .padding(.bottom, 100)
        }
        .sheet(isPresented: $showAvatarPicker) {
            AvatarPickerView()
        }
    }
    
    private func loadProfile() async {
        isLoading = true
        errorMessage = nil
        
        guard let userId = authManager.currentUser?.id else {
            errorMessage = "Not authenticated"
            isLoading = false
            return
        }
        
        do {
            userProfile = try await API.shared.getUserProfile(userId: userId)
            await MainActor.run {
                displayName = userProfile?.display_name ?? authManager.currentUser?.name ?? ""
                phoneNumber = userProfile?.phone_number ?? ""
                dateOfBirth = userProfile?.date_of_birth ?? ""
                
                // Legal name
                let legalFirst = userProfile?.legal_first_name ?? ""
                let legalLast = userProfile?.legal_last_name ?? ""
                if !legalFirst.isEmpty || !legalLast.isEmpty {
                    legalName = "\(legalFirst) \(legalLast)".trimmingCharacters(in: .whitespaces)
                }
                
                // Address
                let addressParts = [
                    userProfile?.address_line1,
                    userProfile?.city,
                    userProfile?.state,
                    userProfile?.zip_code
                ].compactMap { $0 }.filter { !$0.isEmpty }
                
                if !addressParts.isEmpty {
                    address = addressParts.joined(separator: ", ")
                }
                
                isLoading = false
            }
        } catch {
            errorMessage = "Failed to load profile: \(error.localizedDescription)"
            isLoading = false
        }
    }
}

struct ProfileFieldRow: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 16))
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .overlay(
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(.secondary)
                .padding(.trailing, 16),
            alignment: .trailing
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

struct AvatarPickerView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            VStack {
                Text("Avatar picker coming soon")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Edit profile picture")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }
}
struct PreferencesPage: View {
    @State private var selectedLanguage = "English"
    @State private var selectedCurrency = "KES - KSh"
    @State private var selectedTheme = "Light"
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.93, green: 0.98, blue: 0.95),
                    Color(red: 0.88, green: 0.98, blue: 0.88),
                    Color(red: 0.93, green: 0.98, blue: 0.95)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // App preferences Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("App preferences")
                            .font(.system(size: 18, weight: .semibold))
                            .padding(.horizontal, 16)
                        
                        // Language
                        NavigationLink(destination: LanguagePickerView(selectedLanguage: $selectedLanguage)) {
                            PreferenceFieldRow(label: "Language", value: selectedLanguage)
                        }
                        
                        // Payment currency
                        NavigationLink(destination: CurrencyPickerView(selectedCurrency: $selectedCurrency)) {
                            PreferenceFieldRow(label: "Payment currency", value: selectedCurrency)
                        }
                        
                        // Theme
                        NavigationLink(destination: ThemePickerView(selectedTheme: $selectedTheme)) {
                            PreferenceFieldRow(label: "Theme", value: selectedTheme)
                        }
                    }
                }
                .padding(.vertical, 24)
                .padding(.bottom, 100)
            }
        }
        .navigationTitle("Preferences")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PreferenceFieldRow: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .overlay(
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(.secondary)
                .padding(.trailing, 16),
            alignment: .trailing
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

struct LanguagePickerView: View {
    @Binding var selectedLanguage: String
    @Environment(\.dismiss) var dismiss
    let languages = ["English", "Swahili"]
    
    var body: some View {
        List(languages, id: \.self) { language in
            Button(action: {
                selectedLanguage = language
                dismiss()
            }) {
                HStack {
                    Text(language)
                    Spacer()
                    if language == selectedLanguage {
                        Image(systemName: "checkmark")
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .navigationTitle("Language")
    }
}

struct CurrencyPickerView: View {
    @Binding var selectedCurrency: String
    @Environment(\.dismiss) var dismiss
    let currencies = ["KES - KSh", "USD - $", "EUR - €", "GBP - £"]
    
    var body: some View {
        List(currencies, id: \.self) { currency in
            Button(action: {
                selectedCurrency = currency
                dismiss()
            }) {
                HStack {
                    Text(currency)
                    Spacer()
                    if currency == selectedCurrency {
                        Image(systemName: "checkmark")
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .navigationTitle("Payment Currency")
    }
}

struct ThemePickerView: View {
    @Binding var selectedTheme: String
    @Environment(\.dismiss) var dismiss
    let themes = ["Light", "Dark", "System"]
    
    var body: some View {
        List(themes, id: \.self) { theme in
            Button(action: {
                selectedTheme = theme
                dismiss()
            }) {
                HStack {
                    Text(theme)
                    Spacer()
                    if theme == selectedTheme {
                        Image(systemName: "checkmark")
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .navigationTitle("Theme")
    }
}

struct SecurityPage: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.93, green: 0.98, blue: 0.95),
                    Color(red: 0.88, green: 0.98, blue: 0.88),
                    Color(red: 0.93, green: 0.98, blue: 0.95)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Security options Section
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Security options")
                                .font(.system(size: 18, weight: .semibold))
                            Text("Enable two-factor authentication to keep your account safe.")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 16)
                        
                        // Two-factor authentication
                        NavigationLink(destination: TwoFactorAuthView()) {
                            SecurityMenuRow(icon: "lock.shield", label: "Two-factor authentication")
                        }
                        
                        // Merge accounts
                        Button(action: {}) {
                            SecurityMenuRow(icon: "arrow.left.arrow.right", label: "Merge accounts")
                        }
                        
                        // Report suspicious activity
                        Button(action: {}) {
                            SecurityMenuRow(icon: "exclamationmark.triangle", label: "Report suspicious activity")
                        }
                        
                        // Close account
                        Button(action: {}) {
                            SecurityMenuRow(icon: "xmark.circle", label: "Close account", isDestructive: true)
                        }
                    }
                    
                    // Copilot Section
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Copilot: Delegated access")
                                .font(.system(size: 18, weight: .semibold))
                            Text("Allow other members to access your account. Learn more.")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        
                        // Add copilot
                        Button(action: {}) {
                            SecurityMenuRow(icon: "person.badge.plus", label: "Add copilot")
                        }
                    }
                }
                .padding(.vertical, 24)
                .padding(.bottom, 100)
            }
        }
        .navigationTitle("Security")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SecurityMenuRow: View {
    let icon: String
    let label: String
    var isDestructive: Bool = false
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(isDestructive ? .red : Color(red: 0.05, green: 0.51, blue: 0.31))
                .frame(width: 24)
            
            Text(label)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.primary)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 60)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isDestructive ? Color.red.opacity(0.3) : Color.gray.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

// MARK: - Support Views

struct TwoFactorAuthView: View {
    @State private var isTwoFactorEnabled = false
    
    var body: some View {
        List {
            Section {
                Toggle("Enable Two-Factor Authentication", isOn: $isTwoFactorEnabled)
            } footer: {
                Text("Add an extra layer of security to your account by requiring a verification code in addition to your password")
            }
            
            if isTwoFactorEnabled {
                Section("Authentication Methods") {
                    HStack {
                        Image(systemName: "iphone")
                        Text("Authenticator App")
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                    
                    Button {
                        // Add SMS authentication
                    } label: {
                        HStack {
                            Image(systemName: "message")
                            Text("SMS Authentication")
                            Spacer()
                            Image(systemName: "plus.circle")
                                .foregroundColor(.green)
                        }
                    }
                }
                
                Section("Backup Codes") {
                    Button("Generate Backup Codes") {
                        // Generate backup codes
                    }
                } footer: {
                    Text("Backup codes can be used to access your account if you lose access to your primary 2FA method")
                }
            }
        }
        .navigationTitle("Two-Factor Authentication")
    }
}

struct AboutPage: View {
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.93, green: 0.98, blue: 0.95),
                    Color(red: 0.88, green: 0.98, blue: 0.88),
                    Color(red: 0.93, green: 0.98, blue: 0.95)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Version
                    Text("v1.0.0")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                    
                    // About MafutaPass
                    VStack(alignment: .leading, spacing: 16) {
                        Text("About MafutaPass")
                            .font(.system(size: 18, weight: .semibold))
                        
                        Text("MafutaPass is a fuel expense tracking app built for Kenyan businesses and drivers. Track your fuel expenses, receipts, and mileage all in one place.")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                            .lineSpacing(4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(24)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                    .padding(.horizontal, 16)
                    
                    // Links Section
                    VStack(spacing: 8) {
                        // App download links
                        Button(action: {}) {
                            AboutMenuRow(icon: "link", label: "App download links", isExternal: false)
                        }
                        
                        // Keyboard shortcuts
                        Button(action: {}) {
                            AboutMenuRow(icon: "command", label: "Keyboard shortcuts", isExternal: false)
                        }
                        
                        // View open jobs
                        Button(action: {}) {
                            AboutMenuRow(icon: "briefcase", label: "View open jobs", isExternal: true)
                        }
                        
                        // Report a bug
                        Button(action: {}) {
                            AboutMenuRow(icon: "exclamationmark.triangle", label: "Report a bug", isExternal: false)
                        }
                    }
                    
                    // Terms & Privacy
                    VStack(spacing: 4) {
                        HStack(spacing: 4) {
                            Text("Read the")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                            Button(action: {}) {
                                Text("Terms of Service")
                                    .font(.system(size: 14))
                                    .foregroundColor(Color(red: 0.05, green: 0.51, blue: 0.31))
                                    .underline()
                            }
                            Text("and")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                            Button(action: {}) {
                                Text("Privacy")
                                    .font(.system(size: 14))
                                    .foregroundColor(Color(red: 0.05, green: 0.51, blue: 0.31))
                                    .underline()
                            }
                            Text(".")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.top, 16)
                }
                .padding(.vertical, 24)
                .padding(.bottom, 100)
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AboutMenuRow: View {
    let icon: String
    let label: String
    var isExternal: Bool = false
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(Color(red: 0.05, green: 0.51, blue: 0.31))
                .frame(width: 24)
            
            Text(label)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.primary)
            
            Spacer()
            
            if isExternal {
                Image(systemName: "arrow.up.right.square")
                    .font(.system(size: 20))
                    .foregroundColor(.secondary)
            } else {
                Image(systemName: "chevron.right")
                    .font(.system(size: 20))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 60)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

// MARK: - Edit Views

struct EditDisplayNameView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @Binding var userProfile: UserProfile?
    @State private var displayName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Form {
            Section {
                TextField("Display Name", text: $displayName)
                    .disabled(isSaving)
            }
            
            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
            
            Section {
                Button(action: saveDisplayName) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSaving || displayName.isEmpty)
            }
        }
        .navigationTitle("Display Name")
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Display name updated successfully")
        }
        .onAppear {
            displayName = userProfile?.display_name ?? ""
        }
    }
    
    private func saveDisplayName() {
        guard let userId = authManager.currentUser?.id else { return }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let updated = try await API.shared.updateDisplayName(userId: userId, displayName: displayName)
                await MainActor.run {
                    userProfile = updated
                    isSaving = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save: \(error.localizedDescription)"
                    isSaving = false
                }
            }
        }
    }
}

struct EditLegalNameView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @Binding var userProfile: UserProfile?
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Form {
            Section {
                TextField("First Name", text: $firstName)
                    .disabled(isSaving)
                TextField("Last Name", text: $lastName)
                    .disabled(isSaving)
            } header: {
                Text("Legal Name")
            } footer: {
                Text("Your legal name as it appears on official documents")
            }
            
            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
            
            Section {
                Button(action: saveLegalName) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSaving || firstName.isEmpty || lastName.isEmpty)
            }
        }
        .navigationTitle("Legal Name")
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Legal name updated successfully")
        }
        .onAppear {
            firstName = userProfile?.legal_first_name ?? ""
            lastName = userProfile?.legal_last_name ?? ""
        }
    }
    
    private func saveLegalName() {
        guard let userId = authManager.currentUser?.id else { return }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let updated = try await API.shared.updateLegalName(userId: userId, firstName: firstName, lastName: lastName)
                await MainActor.run {
                    userProfile = updated
                    isSaving = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save: \(error.localizedDescription)"
                    isSaving = false
                }
            }
        }
    }
}

struct EditPhoneNumberView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @Binding var userProfile: UserProfile?
    @State private var phoneNumber = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Form {
            Section {
                TextField("Phone Number", text: $phoneNumber)
                    .keyboardType(.phonePad)
                    .disabled(isSaving)
            } footer: {
                Text("Include country code (e.g., +1234567890)")
            }
            
            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
            
            Section {
                Button(action: savePhoneNumber) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSaving || phoneNumber.isEmpty)
            }
        }
        .navigationTitle("Phone Number")
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Phone number updated successfully")
        }
        .onAppear {
            phoneNumber = userProfile?.phone_number ?? ""
        }
    }
    
    private func savePhoneNumber() {
        guard let userId = authManager.currentUser?.id else { return }
        
        // Basic validation
        if !phoneNumber.hasPrefix("+") {
            errorMessage = "Phone number must include country code (e.g., +1)"
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let updated = try await API.shared.updatePhoneNumber(userId: userId, phoneNumber: phoneNumber)
                await MainActor.run {
                    userProfile = updated
                    isSaving = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save: \(error.localizedDescription)"
                    isSaving = false
                }
            }
        }
    }
}

struct EditDateOfBirthView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @Binding var userProfile: UserProfile?
    @State private var date = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Form {
            Section {
                DatePicker("Date of Birth", selection: $date, displayedComponents: .date)
                    .disabled(isSaving)
            }
            
            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
            
            Section {
                Button(action: saveDateOfBirth) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSaving)
            }
        }
        .navigationTitle("Date of Birth")
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Date of birth updated successfully")
        }
        .onAppear {
            if let dobString = userProfile?.date_of_birth {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withFullDate]
                if let parsedDate = formatter.date(from: dobString) {
                    date = parsedDate
                }
            }
        }
    }
    
    private func saveDateOfBirth() {
        guard let userId = authManager.currentUser?.id else { return }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        let dateString = formatter.string(from: date)
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let updated = try await API.shared.updateDateOfBirth(userId: userId, dateOfBirth: dateString)
                await MainActor.run {
                    userProfile = updated
                    isSaving = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save: \(error.localizedDescription)"
                    isSaving = false
                }
            }
        }
    }
}

struct EditAddressView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @Binding var userProfile: UserProfile?
    @State private var street = ""
    @State private var street2 = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zip = ""
    @State private var country = "US"
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Form {
            Section {
                TextField("Street Address", text: $street)
                    .disabled(isSaving)
                TextField("Apt, Suite, etc. (optional)", text: $street2)
                    .disabled(isSaving)
                TextField("City", text: $city)
                    .disabled(isSaving)
                TextField("State/Province", text: $state)
                    .disabled(isSaving)
                TextField("ZIP/Postal Code", text: $zip)
                    .disabled(isSaving)
                TextField("Country Code", text: $country)
                    .disabled(isSaving)
            } footer: {
                Text("Use country codes like US, KE, GB, etc.")
            }
            
            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
            
            Section {
                Button(action: saveAddress) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSaving || street.isEmpty || city.isEmpty)
            }
        }
        .navigationTitle("Address")
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Address updated successfully")
        }
        .onAppear {
            street = userProfile?.address_line1 ?? ""
            street2 = userProfile?.address_line2 ?? ""
            city = userProfile?.city ?? ""
            state = userProfile?.state ?? ""
            zip = userProfile?.zip_code ?? ""
            country = userProfile?.country ?? "US"
        }
    }
    
    private func saveAddress() {
        guard let userId = authManager.currentUser?.id else { return }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let updated = try await API.shared.updateAddress(
                    userId: userId,
                    line1: street.isEmpty ? nil : street,
                    line2: street2.isEmpty ? nil : street2,
                    city: city.isEmpty ? nil : city,
                    state: state.isEmpty ? nil : state,
                    zipCode: zip.isEmpty ? nil : zip,
                    country: country.isEmpty ? nil : country
                )
                await MainActor.run {
                    userProfile = updated
                    isSaving = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save: \(error.localizedDescription)"
                    isSaving = false
                }
            }
        }
    }
}

#Preview {
    AccountPage()
        .environmentObject(ClerkAuthManager.shared)
}
