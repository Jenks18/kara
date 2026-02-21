import SwiftUI
import UserNotifications
import Clerk

struct AccountPage: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @EnvironmentObject var profileManager: ProfileManager
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.backgroundView()
                VStack(spacing: 0) {
                    // Profile Header — extends behind status bar
                    HStack(spacing: 12) {
                        // Avatar circle — white bg, emoji, shadow (matches webapp header)
                        Circle()
                            .fill(Color.white)
                            .frame(width: 48, height: 48)
                            .overlay(
                                Group {
                                    if profileManager.isLoaded {
                                        Text(profileManager.avatarEmoji)
                                            .font(.system(size: 24))
                                    } else {
                                        ProgressView()
                                            .scaleEffect(0.7)
                                    }
                                }
                            )
                            .shadow(color: .black.opacity(0.15), radius: 4)
                        
                        // User Info
                        VStack(alignment: .leading, spacing: 2) {
                            if profileManager.isLoaded {
                                Text(profileManager.displayName)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                Text(profileManager.displayEmail)
                                    .font(.system(size: 14))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                            } else {
                                // Skeleton placeholders — prevent flash of old/wrong data
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(AppTheme.Colors.border)
                                    .frame(width: 120, height: 14)
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(AppTheme.Colors.border.opacity(0.6))
                                    .frame(width: 160, height: 12)
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 16)
                    .padding(.bottom, 12)
                    .background(
                        AppTheme.Colors.cardSurface
                            .ignoresSafeArea(edges: .top)
                    )
                    .shadow(color: .black.opacity(0.05), radius: 1, y: 1)
                    
                    // Scrollable content
                    ScrollView {
                        VStack(spacing: 32) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("ACCOUNT")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(AppTheme.Colors.textSecondary)
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
                                .foregroundColor(AppTheme.Colors.textSecondary)
                                .padding(.horizontal, 24)
                            
                            VStack(spacing: 8) {
                                NavigationLink(destination: AboutPage()) {
                                    AccountMenuRow(icon: "info.circle", label: "About")
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
                } // ends ScrollView
            } // ends VStack
            } // ends ZStack
            .navigationBarHidden(true)
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
                .foregroundColor(isDestructive ? .red : AppTheme.Colors.gray600)
                .frame(width: 24)
            
            Text(label)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(isDestructive ? .red : AppTheme.Colors.textPrimary)
            
            Spacer()
            
            if isExternal {
                Image(systemName: "arrow.up.right.square")
                    .font(.system(size: 20))
                    .foregroundColor(AppTheme.Colors.textSecondary)
            } else if !isDestructive {
                Image(systemName: "chevron.right")
                    .font(.system(size: 20))
                    .foregroundColor(AppTheme.Colors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 60)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(AppTheme.Colors.cardSurface)
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
    @EnvironmentObject var profileManager: ProfileManager
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
            AppTheme.backgroundView()
            
            if isLoading {
                ProgressView("Loading profile...")
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)
                    Text(error)
                        .multilineTextAlignment(.center)
                        .foregroundColor(AppTheme.Colors.textSecondary)
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
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                    .padding(.horizontal, 16)
                    
                    // Avatar — reads from ProfileManager (single source of truth)
                    HStack {
                        Spacer()
                        ZStack(alignment: .bottomTrailing) {
                            Circle()
                                .fill(Color.white)
                                .frame(width: 128, height: 128)
                                .overlay(
                                    Text(profileManager.avatarEmoji)
                                        .font(.system(size: 60))
                                )
                                .overlay(
                                    Circle()
                                        .stroke(AppTheme.Colors.primary, lineWidth: 3)
                                )
                                .shadow(color: .black.opacity(0.15), radius: 8)
                            
                            Button(action: {
                                showAvatarPicker = true
                            }) {
                                Circle()
                                    .fill(AppTheme.Colors.primary)
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
                            .foregroundColor(AppTheme.Colors.textSecondary)
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
                // Sync to ProfileManager so all views stay in sync
                profileManager.update(userProfile)
                
                displayName = userProfile?.display_name ?? authManager.currentUser?.name ?? ""
                phoneNumber = userProfile?.phone_number ?? ""
                // Format DOB using device locale (e.g. dd/MM/yyyy for Kenya)
                if let rawDob = userProfile?.date_of_birth, !rawDob.isEmpty {
                    let isoFormatter = ISO8601DateFormatter()
                    isoFormatter.formatOptions = [.withFullDate]
                    // Also try plain yyyy-MM-dd
                    let plainFormatter = DateFormatter()
                    plainFormatter.dateFormat = "yyyy-MM-dd"
                    plainFormatter.locale = Locale(identifier: "en_US_POSIX")
                    
                    if let parsed = isoFormatter.date(from: rawDob) ?? plainFormatter.date(from: rawDob) {
                        let displayFormatter = DateFormatter()
                        displayFormatter.dateStyle = .medium
                        displayFormatter.locale = Locale.current
                        dateOfBirth = displayFormatter.string(from: parsed)
                    } else {
                        dateOfBirth = rawDob
                    }
                } else {
                    dateOfBirth = ""
                }
                
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
                .foregroundColor(AppTheme.Colors.textSecondary)
            Text(value)
                .font(.system(size: 16))
                .foregroundColor(AppTheme.Colors.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .overlay(
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(AppTheme.Colors.textSecondary)
                .padding(.trailing, 16),
            alignment: .trailing
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

// MARK: - Avatar Options (matches webapp & Android)

private struct AvatarOptionItem: Identifiable {
    let id = UUID()
    let emoji: String
    let label: String
}

private let avatarOptions: [AvatarOptionItem] = [
    AvatarOptionItem(emoji: "🐻", label: "Bear"),
    AvatarOptionItem(emoji: "🦁", label: "Lion"),
    AvatarOptionItem(emoji: "🐯", label: "Tiger"),
    AvatarOptionItem(emoji: "🦊", label: "Fox"),
    AvatarOptionItem(emoji: "🐺", label: "Wolf"),
    AvatarOptionItem(emoji: "🦅", label: "Eagle"),
    AvatarOptionItem(emoji: "🦉", label: "Owl"),
    AvatarOptionItem(emoji: "🐧", label: "Penguin"),
    AvatarOptionItem(emoji: "🐘", label: "Elephant"),
    AvatarOptionItem(emoji: "🦏", label: "Rhino"),
    AvatarOptionItem(emoji: "🦒", label: "Giraffe"),
    AvatarOptionItem(emoji: "🦓", label: "Zebra"),
    AvatarOptionItem(emoji: "🐆", label: "Leopard"),
    AvatarOptionItem(emoji: "🦈", label: "Shark"),
    AvatarOptionItem(emoji: "🐙", label: "Octopus"),
    AvatarOptionItem(emoji: "🐬", label: "Dolphin"),
    AvatarOptionItem(emoji: "🐳", label: "Whale"),
    AvatarOptionItem(emoji: "🦭", label: "Seal"),
    AvatarOptionItem(emoji: "🦦", label: "Otter"),
    AvatarOptionItem(emoji: "🦘", label: "Kangaroo"),
    AvatarOptionItem(emoji: "🦌", label: "Deer"),
    AvatarOptionItem(emoji: "🐎", label: "Horse"),
    AvatarOptionItem(emoji: "🦬", label: "Bison"),
    AvatarOptionItem(emoji: "🦣", label: "Mammoth"),
    AvatarOptionItem(emoji: "🐿️", label: "Squirrel"),
    AvatarOptionItem(emoji: "🦔", label: "Hedgehog"),
    AvatarOptionItem(emoji: "🐢", label: "Turtle"),
    AvatarOptionItem(emoji: "🐊", label: "Crocodile"),
    AvatarOptionItem(emoji: "🦜", label: "Parrot"),
    AvatarOptionItem(emoji: "🦚", label: "Peacock"),
]

struct AvatarPickerView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @EnvironmentObject var profileManager: ProfileManager
    @Environment(\.dismiss) var dismiss
    @State private var selectedEmoji: String = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 5)
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Choose an animal avatar for your profile")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .padding(.horizontal, 16)
                        
                        // Current avatar preview
                        HStack {
                            Spacer()
                            ZStack {
                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 80, height: 80)
                                    .overlay(
                                        Text(selectedEmoji.isEmpty ? profileManager.avatarEmoji : selectedEmoji)
                                            .font(.system(size: 40))
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(AppTheme.Colors.primary, lineWidth: 3)
                                    )
                                    .shadow(color: .black.opacity(0.15), radius: 6)
                            }
                            Spacer()
                        }
                        .padding(.vertical, 8)
                        
                        // Emoji grid — 5 columns matching webapp & Android
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(avatarOptions) { option in
                                Button(action: {
                                    selectedEmoji = option.emoji
                                    errorMessage = nil
                                }) {
                                    VStack(spacing: 4) {
                                        ZStack {
                                            Circle()
                                                .fill(Color.white)
                                                .frame(width: 56, height: 56)
                                                .overlay(
                                                    Text(option.emoji)
                                                        .font(.system(size: 28))
                                                )
                                                .overlay(
                                                    Circle()
                                                        .stroke(
                                                            isSelected(option.emoji) ? AppTheme.Colors.primary : Color.gray.opacity(0.2),
                                                            lineWidth: isSelected(option.emoji) ? 3 : 1
                                                        )
                                                )
                                                .shadow(color: isSelected(option.emoji) ? AppTheme.Colors.primary.opacity(0.3) : .clear, radius: 4)
                                        }
                                        Text(option.label)
                                            .font(.system(size: 10))
                                            .foregroundColor(isSelected(option.emoji) ? AppTheme.Colors.primary : AppTheme.Colors.textSecondary)
                                            .lineLimit(1)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        
                        if let error = errorMessage {
                            Text(error)
                                .font(.system(size: 13))
                                .foregroundColor(.red)
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.red.opacity(0.06))
                                .cornerRadius(8)
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.red.opacity(0.2), lineWidth: 1))
                                .padding(.horizontal, 16)
                        }
                    }
                    .padding(.vertical, 16)
                }
                
                // Save button — fixed at bottom
                VStack(spacing: 0) {
                    Divider()
                    Button(action: saveAvatar) {
                        if isSaving {
                            ProgressView().tint(.white)
                        } else {
                            Text("Save Avatar")
                                .font(.system(size: 17, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(canSave ? AppTheme.Colors.primary : Color(UIColor.systemGray4))
                    .foregroundColor(.white)
                    .cornerRadius(16)
                    .disabled(!canSave)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .background(AppTheme.Colors.cardSurface)
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
            .onAppear {
                selectedEmoji = profileManager.avatarEmoji
            }
        }
    }
    
    private var canSave: Bool {
        !isSaving && !selectedEmoji.isEmpty && selectedEmoji != profileManager.avatarEmoji
    }
    
    private func isSelected(_ emoji: String) -> Bool {
        if selectedEmoji.isEmpty {
            return emoji == profileManager.avatarEmoji
        }
        return emoji == selectedEmoji
    }
    
    private func saveAvatar() {
        guard let userId = authManager.currentUser?.id else {
            errorMessage = "Not authenticated"
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let _ = try await API.shared.updateUserProfile(
                    userId: userId,
                    updates: ["avatar_emoji": selectedEmoji]
                )
                await MainActor.run {
                    profileManager.updateAvatar(emoji: selectedEmoji)
                    isSaving = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save avatar. Please try again."
                    isSaving = false
                }
            }
        }
    }
}

struct PreferencesPage: View {
    @EnvironmentObject var themeManager: ThemeManager
    
    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("App preferences")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppTheme.Colors.textPrimary)
                            .padding(.horizontal, 16)
                        
                        NavigationLink(destination: ThemePickerView()) {
                            PreferenceFieldRow(label: "Theme", value: themeManager.mode.label)
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
                .foregroundColor(AppTheme.Colors.textSecondary)
            Text(value)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(AppTheme.Colors.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .overlay(
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(AppTheme.Colors.textSecondary)
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

struct AccountCurrencyPickerView: View {
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
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.colorScheme) private var systemScheme
    
    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Theme")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(AppTheme.Colors.textPrimary)
                        Text("Choose how Kacha looks on this device.")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                    .padding(.horizontal, 16)
                    
                    VStack(spacing: 12) {
                        ForEach(ThemeMode.allCases, id: \.self) { mode in
                            Button(action: {
                                themeManager.mode = mode
                            }) {
                                HStack(spacing: 16) {
                                    Image(systemName: mode.icon)
                                        .font(.system(size: 20))
                                        .foregroundColor(themeManager.mode == mode ? AppTheme.Colors.primary : AppTheme.Colors.textSecondary)
                                        .frame(width: 28)
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(mode.label)
                                            .font(.system(size: 16, weight: .medium))
                                            .foregroundColor(themeManager.mode == mode ? AppTheme.Colors.primary : AppTheme.Colors.textPrimary)
                                        Text(mode.description)
                                            .font(.system(size: 13))
                                            .foregroundColor(AppTheme.Colors.textSecondary)
                                    }
                                    
                                    Spacer()
                                    
                                    if themeManager.mode == mode {
                                        ZStack {
                                            Circle()
                                                .fill(AppTheme.Colors.primary)
                                                .frame(width: 22, height: 22)
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 11, weight: .bold))
                                                .foregroundColor(.white)
                                        }
                                    }
                                }
                                .padding(16)
                                .background(AppTheme.Colors.cardSurface)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            themeManager.mode == mode ? AppTheme.Colors.primary : AppTheme.Colors.border,
                                            lineWidth: themeManager.mode == mode ? 2 : 1
                                        )
                                )
                                .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.vertical, 24)
                .padding(.bottom, 60)
            }
        }
        .navigationTitle("Theme")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SecurityPage: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @State private var showCloseAccountConfirm = false
    @State private var showReportActivity = false
    
    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Security options Section
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Security options")
                                .font(.system(size: 18, weight: .semibold))
                            Text("Manage your account security and report concerns.")
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.Colors.textSecondary)
                        }
                        .padding(.horizontal, 16)
                        
                        // Report suspicious activity
                        NavigationLink(destination: ReportSuspiciousActivityView()) {
                            SecurityMenuRow(icon: "exclamationmark.triangle", label: "Report suspicious activity")
                        }
                        
                        // Close account
                        NavigationLink(destination: CloseAccountView()) {
                            SecurityMenuRow(icon: "xmark.circle", label: "Close account", isDestructive: true)
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
                .foregroundColor(isDestructive ? .red : AppTheme.Colors.primary)
                .frame(width: 24)
            
            Text(label)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(AppTheme.Colors.textPrimary)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(AppTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, minHeight: 60)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isDestructive ? Color.red.opacity(0.3) : Color.gray.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

// MARK: - Security Sub Views

private let activityTypes: [(id: String, label: String, desc: String)] = [
    ("unauthorized_login", "Unauthorized login", "Someone accessed my account without my knowledge"),
    ("unknown_transactions", "Unknown transactions", "I see receipts or expenses I did not create"),
    ("profile_changes", "Unexpected profile changes", "My profile details were changed without my consent"),
    ("suspicious_email", "Suspicious emails", "I received unusual emails claiming to be from Kacha"),
    ("workspace_access", "Unauthorized workspace access", "Someone joined or modified my workspace without permission"),
    ("other", "Other", "Something else seems off with my account"),
]

struct ReportSuspiciousActivityView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @State private var selectedTypes: Set<String> = []
    @State private var description = ""
    @State private var isSubmitting = false
    @State private var isSubmitted = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        if isSubmitted {
            // Success state
            ZStack {
                AppTheme.backgroundView()
                VStack(spacing: 24) {
                    Spacer()
                    ZStack {
                        Circle()
                            .fill(Color.green.opacity(0.1))
                            .frame(width: 80, height: 80)
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.green)
                    }
                    Text("Thank you for reporting")
                        .font(.system(size: 24, weight: .bold))
                    Text("Our security team will review your report and take appropriate action.")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                    Text("Our team will follow up at masomonews19@gmail.com")
                        .font(.system(size: 13))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                    
                    Button(action: { dismiss() }) {
                        Text("Back to Security")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(AppTheme.Colors.primary)
                            .cornerRadius(16)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    Spacer()
                }
                .padding(.horizontal, 24)
            }
            .navigationTitle("Report submitted")
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ZStack {
                AppTheme.backgroundView()
                    .onTapGesture { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
                
                VStack(spacing: 0) {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            // Warning banner
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.orange)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("If you believe your account has been compromised, change your password immediately.")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(Color(red: 0.55, green: 0.30, blue: 0.0))
                                    Text("You can do this through your sign-in provider settings.")
                                        .font(.system(size: 12))
                                        .foregroundColor(Color(red: 0.55, green: 0.30, blue: 0.0).opacity(0.8))
                                }
                            }
                            .padding(16)
                            .background(Color.orange.opacity(0.08))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                            )
                            .padding(.horizontal, 16)
                            
                            // Activity type selection
                            VStack(alignment: .leading, spacing: 12) {
                                Text("What type of activity did you notice?")
                                    .font(.system(size: 18, weight: .semibold))
                                Text("Select all that apply.")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                
                                ForEach(activityTypes, id: \.id) { type in
                                    Button(action: {
                                        if selectedTypes.contains(type.id) {
                                            selectedTypes.remove(type.id)
                                        } else {
                                            selectedTypes.insert(type.id)
                                        }
                                        errorMessage = nil
                                    }) {
                                        HStack(spacing: 12) {
                                            // Checkbox
                                            ZStack {
                                                RoundedRectangle(cornerRadius: 4)
                                                    .stroke(selectedTypes.contains(type.id) ? AppTheme.Colors.primary : Color.gray.opacity(0.4), lineWidth: 2)
                                                    .frame(width: 20, height: 20)
                                                if selectedTypes.contains(type.id) {
                                                    RoundedRectangle(cornerRadius: 4)
                                                        .fill(AppTheme.Colors.primary)
                                                        .frame(width: 20, height: 20)
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                        .foregroundColor(.white)
                                                }
                                            }
                                            
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(type.label)
                                                    .font(.system(size: 15, weight: .medium))
                                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                                Text(type.desc)
                                                    .font(.system(size: 12))
                                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                                    .fixedSize(horizontal: false, vertical: true)
                                                    .multilineTextAlignment(.leading)
                                            }
                                            Spacer()
                                        }
                                        .padding(16)
                                        .background(AppTheme.Colors.cardSurface)
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(selectedTypes.contains(type.id) ? AppTheme.Colors.primary : Color.gray.opacity(0.2), lineWidth: selectedTypes.contains(type.id) ? 2 : 1)
                                        )
                                        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            
                            // Description
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Describe what happened")
                                    .font(.system(size: 18, weight: .semibold))
                                Text("Include dates, times, and any other relevant details.")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                
                                TextEditor(text: $description)
                                    .frame(minHeight: 130)
                                    .padding(12)
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.border, lineWidth: 1)
                                    )
                            }
                            .padding(.horizontal, 16)
                            
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 13))
                                    .foregroundColor(.red)
                                    .padding(16)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.red.opacity(0.06))
                                    .cornerRadius(12)
                                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.red.opacity(0.2), lineWidth: 1))
                                    .padding(.horizontal, 16)
                            }
                        }
                        .padding(.vertical, 24)
                        .padding(.bottom, 100)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    
                    // Fixed bottom submit button
                    VStack(spacing: 0) {
                        Divider()
                        Button(action: submitReport) {
                            if isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Text("Submit Report")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background((!isSubmitting && !selectedTypes.isEmpty && !description.isEmpty) ? AppTheme.Colors.primary : Color(UIColor.systemGray4))
                        .foregroundColor(.white)
                        .cornerRadius(16)
                        .disabled(isSubmitting || selectedTypes.isEmpty || description.isEmpty)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                    .background(AppTheme.Colors.cardSurface)
                }
            }
            .navigationTitle("Report suspicious activity")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                }
            }
        }
    }
    
    private func submitReport() {
        if selectedTypes.isEmpty {
            errorMessage = "Please select at least one type of suspicious activity"
            return
        }
        if description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Please describe what happened"
            return
        }
        
        isSubmitting = true
        errorMessage = nil
        
        Task {
            do {
                let url = URL(string: "\(ClerkConfig.baseAPIURL)/account/suspicious-activity")!
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                
                // Attach Clerk JWT for verified user attribution
                if let session = Clerk.shared.session,
                   let tokenResource = try? await session.getToken() {
                    request.setValue("Bearer \(tokenResource.jwt)", forHTTPHeaderField: "Authorization")
                }
                
                let body: [String: Any] = [
                    "activityTypes": Array(selectedTypes),
                    "description": description.trimmingCharacters(in: .whitespacesAndNewlines),
                    "userEmail": authManager.currentUser?.email ?? "",
                    "userId": authManager.currentUser?.id ?? "",
                    "platform": "iOS"
                ]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                
                let (_, response) = try await URLSession.shared.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse,
                      (200...299).contains(httpResponse.statusCode) else {
                    throw URLError(.badServerResponse)
                }
                
                await MainActor.run {
                    isSubmitting = false
                    isSubmitted = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to submit report. Please try again or contact masomonews19@gmail.com"
                    isSubmitting = false
                }
            }
        }
    }
}

struct CloseAccountView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @State private var reason = ""
    @State private var confirmText = ""
    @State private var isSubmitting = false
    @State private var isSubmitted = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) var dismiss
    
    private var confirmationMatches: Bool {
        confirmText.lowercased() == "delete my account"
    }
    
    var body: some View {
        if isSubmitted {
            // Success state
            ZStack {
                AppTheme.backgroundView()
                VStack(spacing: 24) {
                    Spacer()
                    ZStack {
                        Circle()
                            .fill(Color.green.opacity(0.1))
                            .frame(width: 80, height: 80)
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.green)
                    }
                    Text("Request Submitted")
                        .font(.system(size: 24, weight: .bold))
                    Text("Your account deletion has been processed. All your data has been permanently deleted.")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                    if let email = authManager.currentUser?.email {
                        Text(email)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(AppTheme.Colors.primary)
                    }
                    Text("You have been signed out. If you have any questions, please contact us at masomonews19@gmail.com")
                        .font(.system(size: 13))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                    Spacer()
                }
                .padding(.horizontal, 24)
            }
            .navigationTitle("Account Deleted")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                // Sign out after showing success
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    authManager.signOut()
                }
            }
        } else {
            ZStack {
                AppTheme.backgroundView()
                    .onTapGesture { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Warning box
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.red)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("This action cannot be undone")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.red)
                                Text("Deleting your account will permanently remove all your data from Kacha. This includes your profile, receipts, expense reports, and workspace memberships.")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                            }
                        }
                        .padding(16)
                        .background(Color.red.opacity(0.08))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.red.opacity(0.3), lineWidth: 1)
                        )
                        .padding(.horizontal, 16)
                        
                        // What gets deleted
                        VStack(alignment: .leading, spacing: 12) {
                            Text("What data will be deleted?")
                                .font(.system(size: 18, weight: .semibold))
                            
                            VStack(alignment: .leading, spacing: 8) {
                                deletionItem("Profile Information", "Your name, email, phone number, and profile settings")
                                deletionItem("Receipt Data", "All uploaded receipts and their associated images")
                                deletionItem("Expense Reports", "All expense reports and expense items")
                                deletionItem("Workspace Memberships", "Your access to all workspaces")
                                deletionItem("Account Authentication", "Your login credentials and sessions")
                            }
                        }
                        .padding(16)
                        .background(AppTheme.Colors.cardSurface)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.Colors.border, lineWidth: 1)
                        )
                        .padding(.horizontal, 16)
                        
                        // Data retention
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Data retention")
                                .font(.system(size: 18, weight: .semibold))
                            
                            Text("After you request account deletion:")
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.Colors.textSecondary)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                retentionItem("Your account and all data will be **permanently deleted immediately**")
                                retentionItem("You will be signed out automatically")
                                retentionItem("This action **cannot be undone** — all receipts, reports, and data will be lost")
                                retentionItem("Anonymized analytics data may be retained for service improvement")
                            }
                        }
                        .padding(16)
                        .background(AppTheme.Colors.cardSurface)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.Colors.border, lineWidth: 1)
                        )
                        .padding(.horizontal, 16)
                        
                        // Request account deletion form
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Request account deletion")
                                .font(.system(size: 18, weight: .semibold))
                            
                            // Account info
                            if let email = authManager.currentUser?.email {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Account to be deleted:")
                                        .font(.system(size: 13))
                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                    Text(email)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                }
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(AppTheme.Colors.border.opacity(0.3))
                                .cornerRadius(8)
                            }
                            
                            // Reason (optional)
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Why are you leaving? (Optional)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                
                                TextEditor(text: $reason)
                                    .frame(minHeight: 80)
                                    .padding(12)
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.border, lineWidth: 1)
                                    )
                            }
                            
                            // Confirmation input
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Type **DELETE MY ACCOUNT** to confirm")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                
                                TextField("DELETE MY ACCOUNT", text: $confirmText)
                                    .padding(14)
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.border, lineWidth: 1)
                                    )
                            }
                            
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 13))
                                    .foregroundColor(.red)
                                    .padding(12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.red.opacity(0.06))
                                    .cornerRadius(8)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.red.opacity(0.2), lineWidth: 1))
                            }
                            
                            // Delete button
                            Button(action: deleteAccount) {
                                if isSubmitting {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Delete My Account")
                                        .font(.system(size: 17, weight: .semibold))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background((!isSubmitting && confirmationMatches) ? Color.red : AppTheme.Colors.border)
                            .foregroundColor(.white)
                            .cornerRadius(16)
                            .disabled(isSubmitting || !confirmationMatches)
                        }
                        .padding(16)
                        .background(AppTheme.Colors.cardSurface)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.Colors.border, lineWidth: 1)
                        )
                        .padding(.horizontal, 16)
                        
                        // Support contact
                        Text("Need help? Contact us at masomonews19@gmail.com")
                            .font(.system(size: 12))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 8)
                    }
                    .padding(.vertical, 24)
                    .padding(.bottom, 100)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationTitle("Close Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                }
            }
        }
    }
    
    private func deletionItem(_ title: String, _ desc: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(AppTheme.Colors.primary)
                .frame(width: 6, height: 6)
                .padding(.top, 6)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppTheme.Colors.textPrimary)
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundColor(AppTheme.Colors.textSecondary)
            }
        }
    }
    
    private func retentionItem(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(AppTheme.Colors.primary)
                .frame(width: 6, height: 6)
                .padding(.top, 6)
            Text(.init(text))
                .font(.system(size: 14))
                .foregroundColor(AppTheme.Colors.textSecondary)
        }
    }
    
    private func deleteAccount() {
        guard confirmationMatches else {
            errorMessage = "Please type \"DELETE MY ACCOUNT\" exactly to confirm"
            return
        }
        
        isSubmitting = true
        errorMessage = nil
        
        Task {
            do {
                guard let _ = authManager.currentUser?.id,
                      let email = authManager.currentUser?.email else {
                    throw URLError(.userAuthenticationRequired)
                }
                
                let url = URL(string: "\(ClerkConfig.baseAPIURL)/account/delete-request")!
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                
                // Attach Clerk JWT for authenticated deletion (server requires it)
                if let session = Clerk.shared.session,
                   let tokenResource = try? await session.getToken() {
                    request.setValue("Bearer \(tokenResource.jwt)", forHTTPHeaderField: "Authorization")
                }
                
                let body: [String: String] = [
                    "email": email,
                    "reason": reason
                ]
                request.httpBody = try JSONEncoder().encode(body)
                
                let (data, response) = try await URLSession.shared.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw URLError(.badServerResponse)
                }
                
                if (200...299).contains(httpResponse.statusCode) {
                    await MainActor.run {
                        isSubmitting = false
                        isSubmitted = true
                    }
                } else {
                    // Parse server error message if available
                    let serverMsg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
                    await MainActor.run {
                        errorMessage = serverMsg ?? "Server returned an error. Please try again or contact masomonews19@gmail.com"
                        isSubmitting = false
                    }
                }
            } catch {
                await MainActor.run {
                    // If a network error occurs AFTER the server already processed deletion,
                    // the user's Clerk account is gone. Sign them out gracefully.
                    if (error as? URLError)?.code == .timedOut || (error as? URLError)?.code == .networkConnectionLost {
                        errorMessage = "Connection lost during deletion. Your account may already be deleted. Signing you out..."
                        isSubmitting = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            authManager.signOut()
                        }
                    } else {
                        errorMessage = "Failed to delete account. Please try again or contact masomonews19@gmail.com"
                        isSubmitting = false
                    }
                }
            }
        }
    }
}

struct AboutPage: View {
    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Version
                    Text("v1.0.0")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .padding(.top, 8)
                    
                    // About Kacha
                    VStack(alignment: .leading, spacing: 16) {
                        Text("About Kacha")
                            .font(.system(size: 18, weight: .semibold))
                        
                        Text("Kacha — derived from the Swahili word for \"capture\" — is a modern receipt management and expense tracking platform built for individuals and teams.")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .lineSpacing(4)
                        
                        Text("Photograph any receipt, and structured data is extracted automatically. Organise expenses, generate detailed reports, and collaborate with your team through shared workspaces — all from a single application.")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .lineSpacing(4)
                        
                        Text("Designed with simplicity and reliability in mind, Kacha streamlines financial record-keeping so you can focus on what matters most.")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .lineSpacing(4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(24)
                    .background(AppTheme.Colors.cardSurface)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                    .padding(.horizontal, 16)
                    
                    // Report a bug
                    NavigationLink(destination: ReportBugView()) {
                        HStack(spacing: 12) {
                            Image(systemName: "ladybug")
                                .font(.system(size: 24))
                                .foregroundColor(AppTheme.Colors.primary)
                                .frame(width: 24)
                            
                            Text("Report a bug")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(AppTheme.Colors.textPrimary)
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .font(.system(size: 20))
                                .foregroundColor(AppTheme.Colors.textSecondary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 60)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 16)
                        .background(AppTheme.Colors.cardSurface)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                        )
                        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                    }
                    .padding(.horizontal, 16)
                    
                    // Terms & Privacy
                    HStack(spacing: 4) {
                        Text("Read the")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                        Button(action: {
                            if let url = URL(string: "https://www.kachalabs.com/terms-of-service") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            Text("Terms of Service")
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.Colors.primary)
                                .underline()
                        }
                        Text("and")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                        Button(action: {
                            if let url = URL(string: "https://www.kachalabs.com/privacy-policy") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            Text("Privacy Policy")
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.Colors.primary)
                                .underline()
                        }
                        Text(".")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                    .padding(.top, 16)
                    
                    // Support email
                    Text("Questions? Contact masomonews19@gmail.com")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                }
                .padding(.vertical, 24)
                .padding(.bottom, 100)
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Report Bug

private let bugCategories: [(id: String, label: String, desc: String)] = [
    ("receipt_scanning", "Receipt scanning", "Camera, image processing, or OCR issues"),
    ("expense_reports", "Expense reports", "Creating, editing, or submitting reports"),
    ("workspaces", "Workspaces", "Team workspaces, invitations, or permissions"),
    ("account", "Account & profile", "Login, profile settings, or preferences"),
    ("performance", "Performance", "App is slow, crashes, or freezes"),
    ("display", "Display issues", "Layout problems, missing content, or visual glitches"),
    ("other", "Other", "Something else not listed above"),
]

struct ReportBugView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @State private var category = ""
    @State private var severity = "medium"
    @State private var bugTitle = ""
    @State private var bugDescription = ""
    @State private var steps = ""
    @State private var isSubmitting = false
    @State private var isSubmitted = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        if isSubmitted {
            ZStack {
                AppTheme.backgroundView()
                VStack(spacing: 24) {
                    Spacer()
                    ZStack {
                        Circle()
                            .fill(Color.green.opacity(0.1))
                            .frame(width: 80, height: 80)
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.green)
                    }
                    Text("Thank you!")
                        .font(.system(size: 24, weight: .bold))
                    Text("Your bug report has been received. Our team will investigate and work on a fix.")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                    Text("Our team will follow up at masomonews19@gmail.com")
                        .font(.system(size: 13))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                    
                    Button(action: { dismiss() }) {
                        Text("Back to About")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(AppTheme.Colors.primary)
                            .cornerRadius(16)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    Spacer()
                }
                .padding(.horizontal, 24)
            }
            .navigationTitle("Bug reported")
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ZStack {
                AppTheme.backgroundView()
                    .onTapGesture { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
                
                VStack(spacing: 0) {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            // Category selection
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Category")
                                    .font(.system(size: 18, weight: .semibold))
                                
                                ForEach(bugCategories, id: \.id) { cat in
                                    Button(action: {
                                        category = cat.id
                                        errorMessage = nil
                                    }) {
                                        HStack(spacing: 12) {
                                            ZStack {
                                                Circle()
                                                    .stroke(category == cat.id ? AppTheme.Colors.primary : Color.gray.opacity(0.4), lineWidth: 2)
                                                    .frame(width: 18, height: 18)
                                                if category == cat.id {
                                                    Circle()
                                                        .fill(AppTheme.Colors.primary)
                                                        .frame(width: 18, height: 18)
                                                    Circle()
                                                        .fill(.white)
                                                        .frame(width: 6, height: 6)
                                                }
                                            }
                                            
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(cat.label)
                                                    .font(.system(size: 14, weight: .medium))
                                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                                Text(cat.desc)
                                                    .font(.system(size: 12))
                                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                                    .fixedSize(horizontal: false, vertical: true)
                                                    .multilineTextAlignment(.leading)
                                            }
                                            Spacer()
                                        }
                                        .padding(14)
                                        .background(AppTheme.Colors.cardSurface)
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(category == cat.id ? AppTheme.Colors.primary : Color.gray.opacity(0.2), lineWidth: category == cat.id ? 2 : 1)
                                        )
                                        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            
                            // Severity
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Severity")
                                    .font(.system(size: 18, weight: .semibold))
                                
                                HStack(spacing: 8) {
                                    ForEach([("low", "Low", Color.green), ("medium", "Medium", Color.orange), ("high", "High", Color.red)], id: \.0) { opt in
                                        Button(action: { severity = opt.0 }) {
                                            Text(opt.1)
                                                .font(.system(size: 14, weight: .medium))
                                                .foregroundColor(severity == opt.0 ? opt.2 : AppTheme.Colors.textSecondary)
                                                .frame(maxWidth: .infinity)
                                                .padding(.vertical, 10)
                                                .background(severity == opt.0 ? opt.2.opacity(0.12) : AppTheme.Colors.cardSurface)
                                                .cornerRadius(12)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(severity == opt.0 ? opt.2.opacity(0.4) : Color.gray.opacity(0.2), lineWidth: 1)
                                                )
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            
                            // Title
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Title")
                                    .font(.system(size: 18, weight: .semibold))
                                
                                TextField("Brief summary of the issue", text: $bugTitle)
                                    .padding(14)
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.border, lineWidth: 1)
                                    )
                                    .onChange(of: bugTitle) { errorMessage = nil }
                            }
                            .padding(.horizontal, 16)
                            
                            // Description
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Description")
                                    .font(.system(size: 18, weight: .semibold))
                                
                                TextEditor(text: $bugDescription)
                                    .frame(minHeight: 100)
                                    .padding(12)
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.border, lineWidth: 1)
                                    )
                                    .overlay(
                                        Group {
                                            if bugDescription.isEmpty {
                                                Text("What happened? What did you expect?")
                                                    .foregroundColor(Color.gray.opacity(0.5))
                                                    .padding(.horizontal, 16)
                                                    .padding(.top, 20)
                                                    .allowsHitTesting(false)
                                            }
                                        },
                                        alignment: .topLeading
                                    )
                                    .onChange(of: bugDescription) { errorMessage = nil }
                            }
                            .padding(.horizontal, 16)
                            
                            // Steps to reproduce (optional)
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 4) {
                                    Text("Steps to reproduce")
                                        .font(.system(size: 18, weight: .semibold))
                                    Text("(optional)")
                                        .font(.system(size: 14))
                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                }
                                
                                TextEditor(text: $steps)
                                    .frame(minHeight: 80)
                                    .padding(12)
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.border, lineWidth: 1)
                                    )
                                    .overlay(
                                        Group {
                                            if steps.isEmpty {
                                                Text("1. Go to...\n2. Tap on...\n3. See error...")
                                                    .foregroundColor(Color.gray.opacity(0.5))
                                                    .padding(.horizontal, 16)
                                                    .padding(.top, 20)
                                                    .allowsHitTesting(false)
                                            }
                                        },
                                        alignment: .topLeading
                                    )
                            }
                            .padding(.horizontal, 16)
                            
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 13))
                                    .foregroundColor(.red)
                                    .padding(16)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.red.opacity(0.06))
                                    .cornerRadius(12)
                                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.red.opacity(0.2), lineWidth: 1))
                                    .padding(.horizontal, 16)
                            }
                        }
                        .padding(.vertical, 24)
                        .padding(.bottom, 100)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    
                    // Fixed bottom submit button
                    VStack(spacing: 0) {
                        Divider()
                        Button(action: submitBugReport) {
                            if isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Text("Submit Bug Report")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(canSubmit ? AppTheme.Colors.primary : Color(UIColor.systemGray4))
                        .foregroundColor(.white)
                        .cornerRadius(16)
                        .disabled(isSubmitting || !canSubmit)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                    .background(AppTheme.Colors.cardSurface)
                }
            }
            .navigationTitle("Report a bug")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                }
            }
        }
    }
    
    private var canSubmit: Bool {
        !isSubmitting && !category.isEmpty && !bugTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !bugDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    private func submitBugReport() {
        if category.isEmpty {
            errorMessage = "Please select a bug category"
            return
        }
        if bugTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Please provide a brief title"
            return
        }
        if bugDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Please describe the issue"
            return
        }
        
        isSubmitting = true
        errorMessage = nil
        
        Task {
            do {
                let url = URL(string: "\(ClerkConfig.baseAPIURL)/account/report-bug")!
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                
                // Attach Clerk JWT for verified user attribution
                if let session = Clerk.shared.session,
                   let tokenResource = try? await session.getToken() {
                    request.setValue("Bearer \(tokenResource.jwt)", forHTTPHeaderField: "Authorization")
                }
                
                let body: [String: Any] = [
                    "category": category,
                    "severity": severity,
                    "title": bugTitle.trimmingCharacters(in: .whitespacesAndNewlines),
                    "description": bugDescription.trimmingCharacters(in: .whitespacesAndNewlines),
                    "stepsToReproduce": steps.trimmingCharacters(in: .whitespacesAndNewlines),
                    "userEmail": authManager.currentUser?.email ?? "",
                    "userId": authManager.currentUser?.id ?? "",
                    "platform": "iOS"
                ]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                
                let (_, response) = try await URLSession.shared.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse,
                      (200...299).contains(httpResponse.statusCode) else {
                    throw URLError(.badServerResponse)
                }
                
                await MainActor.run {
                    isSubmitting = false
                    isSubmitted = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to submit report. Please try again or email masomonews19@gmail.com"
                    isSubmitting = false
                }
            }
        }
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
    @State private var phoneDigits = ""  // digits after +254
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @Environment(\.dismiss) var dismiss
    
    private var isValid: Bool {
        phoneDigits.count == 9 && (phoneDigits.hasPrefix("7") || phoneDigits.hasPrefix("1"))
    }
    
    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        Text("Enter your 9-digit Kenyan mobile number")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .padding(.horizontal, 16)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Phone number")
                                .font(.system(size: 12))
                                .foregroundColor(AppTheme.Colors.primary)
                                .padding(.horizontal, 16)
                            
                            HStack(spacing: 0) {
                                // Country code prefix with Kenya flag
                                HStack(spacing: 6) {
                                    Text("\u{1F1F0}\u{1F1EA}")
                                        .font(.system(size: 20))
                                    Text("+254")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                }
                                .padding(.horizontal, 14)
                                .frame(height: 56)
                                .background(AppTheme.Colors.cardSurface.opacity(0.7))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(AppTheme.Colors.border, lineWidth: 1)
                                        .clipShape(
                                            RoundedCorner(radius: 12, corners: [.topLeft, .bottomLeft])
                                        )
                                )
                                .clipShape(RoundedCorner(radius: 12, corners: [.topLeft, .bottomLeft]))
                                
                                // Phone number input
                                TextField("712345678", text: $phoneDigits)
                                    .keyboardType(.numberPad)
                                    .font(.system(size: 16))
                                    .disabled(isSaving)
                                    .padding(.horizontal, 14)
                                    .frame(height: 56)
                                    .background(AppTheme.Colors.cardSurface)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.border, lineWidth: 1)
                                            .clipShape(
                                                RoundedCorner(radius: 12, corners: [.topRight, .bottomRight])
                                            )
                                    )
                                    .clipShape(RoundedCorner(radius: 12, corners: [.topRight, .bottomRight]))
                                    .onChange(of: phoneDigits) {
                                        let filtered = phoneDigits.filter { $0.isNumber }
                                        if filtered.count <= 9 {
                                            phoneDigits = filtered
                                        } else {
                                            phoneDigits = String(filtered.prefix(9))
                                        }
                                        errorMessage = nil
                                    }
                            }
                            .padding(.horizontal, 16)
                            
                            if !phoneDigits.isEmpty && !isValid {
                                Text(phoneDigits.count < 9 ? "Enter exactly 9 digits" : "Number must start with 7 or 1")
                                    .font(.system(size: 12))
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 16)
                            }
                            
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 12))
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 16)
                            }
                            
                            Text("Enter your 9-digit Kenyan mobile number")
                                .font(.system(size: 12))
                                .foregroundColor(AppTheme.Colors.textSecondary)
                                .padding(.horizontal, 16)
                        }
                    }
                    .padding(.vertical, 24)
                }
                
                // Save button pinned at bottom
                VStack {
                    Button(action: savePhoneNumber) {
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Save")
                                .font(.system(size: 17, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background((!isSaving && (isValid || phoneDigits.isEmpty)) ? AppTheme.Colors.primary : AppTheme.Colors.border)
                    .foregroundColor(.white)
                    .cornerRadius(16)
                    .disabled(isSaving || (!isValid && !phoneDigits.isEmpty))
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                }
                .background(AppTheme.Colors.cardSurface.opacity(0.95))
            }
        }
        .navigationTitle("Phone number")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Phone number updated successfully")
        }
        .onAppear {
            let num = (userProfile?.phone_number ?? "").replacingOccurrences(of: "[\\s\\-]", with: "", options: .regularExpression)
            if num.hasPrefix("+254") {
                phoneDigits = String(num.dropFirst(4))
            } else if num.hasPrefix("254") {
                phoneDigits = String(num.dropFirst(3))
            } else if num.hasPrefix("0") {
                phoneDigits = String(num.dropFirst(1))
            } else {
                phoneDigits = num
            }
        }
    }
    
    private func savePhoneNumber() {
        guard let userId = authManager.currentUser?.id else { return }
        
        let fullNumber = phoneDigits.trimmingCharacters(in: .whitespaces).isEmpty ? "" : "+254\(phoneDigits.trimmingCharacters(in: .whitespaces))"
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let updated = try await API.shared.updatePhoneNumber(userId: userId, phoneNumber: fullNumber)
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

// Helper shape for rounded corners on specific sides
struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
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
