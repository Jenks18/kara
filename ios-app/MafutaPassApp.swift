import SwiftUI
import Clerk
import Combine

// MARK: - Theme Manager
enum ThemeMode: String, CaseIterable {
    case light = "Light"
    case dark = "Dark"
    case system = "System"
    
    var label: String { rawValue }
    
    var icon: String {
        switch self {
        case .light:  return "sun.max.fill"
        case .dark:   return "moon.fill"
        case .system: return "circle.lefthalf.filled"
        }
    }
    
    var description: String {
        switch self {
        case .light:  return "Always use light mode"
        case .dark:   return "Always use dark mode"
        case .system: return "Follow device settings"
        }
    }
    
    /// Maps to SwiftUI's ColorScheme? (nil = follow system)
    var colorScheme: ColorScheme? {
        switch self {
        case .light:  return .light
        case .dark:   return .dark
        case .system: return nil
        }
    }
}

final class ThemeManager: ObservableObject {
    static let shared = ThemeManager()
    
    @Published var mode: ThemeMode {
        didSet { UserDefaults.standard.set(mode.rawValue, forKey: "kacha_theme") }
    }
    
    init() {
        let stored = UserDefaults.standard.string(forKey: "kacha_theme") ?? "System"
        self.mode = ThemeMode(rawValue: stored) ?? .system
    }
}

// MARK: - Main App Entry Point
@main
struct MafutaPassApp: App {
    @State private var clerk = Clerk.shared
    @StateObject private var themeManager = ThemeManager.shared
    
    init() {
        configureGlobalAppearance()
    }
    
    var body: some Scene {
        WindowGroup {
            ClerkContentView()
                .environment(\.clerk, clerk)
                .environmentObject(themeManager)
                .preferredColorScheme(themeManager.mode.colorScheme)
                .task {
                    clerk.configure(publishableKey: "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k")
                    try? await clerk.load()
                }
        }
    }
    
    // MARK: - Production-Grade Global Appearance Configuration
    private func configureGlobalAppearance() {
        // Brand Colors - Blue #0066FF (matches web app)
        let bluePrimary = UIColor { t in
            t.userInterfaceStyle == .dark ? UIColor(hex: "#60A5FA") : UIColor(hex: "#0066FF")
        }
        let navBg = UIColor { t in
            t.userInterfaceStyle == .dark
                ? UIColor(hex: "#0F1528").withAlphaComponent(0.92)
                : UIColor(hex: "#EFF6FF").withAlphaComponent(0.8)
        }
        let navTitle = UIColor { t in
            t.userInterfaceStyle == .dark ? UIColor(hex: "#F1F5F9") : UIColor.darkGray
        }
        let navLargeTitle = UIColor { t in
            t.userInterfaceStyle == .dark ? UIColor(hex: "#60A5FA") : UIColor(hex: "#0052CC")
        }
        
        // Global Tint Color
        UIView.appearance().tintColor = bluePrimary
        
        // Navigation Bar Appearance
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithTransparentBackground()
        navAppearance.backgroundColor = navBg
        navAppearance.titleTextAttributes = [
            .foregroundColor: navTitle,
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: navLargeTitle,
            .font: UIFont.systemFont(ofSize: 34, weight: .bold)
        ]
        
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance
        UINavigationBar.appearance().tintColor = bluePrimary
        
        // Tab Bar Appearance
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: "#1E1E1E").withAlphaComponent(0.98)
                : UIColor.white.withAlphaComponent(0.95)
        }
        
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
        UITabBar.appearance().tintColor = bluePrimary
        UITabBar.appearance().unselectedItemTintColor = UIColor.systemGray
    }
}

// MARK: - Root Content View with Authentication
struct ClerkContentView: View {
    @Environment(\.clerk) private var clerk
    @State private var authIsPresented = false
    
    var body: some View {
        ZStack {
            // Blue gradient background matching web app design system
            BrandGradientBackground()
            
            if clerk.user != nil {
                MainAppView()
                    .environmentObject(ClerkAuthManager.shared)
                    .onAppear {
                        ClerkAuthManager.shared.syncUser()
                    }
                    .onChange(of: clerk.user) { _, newUser in
                        if newUser != nil { ClerkAuthManager.shared.syncUser() }
                        else { ClerkAuthManager.shared.clearUser() }
                    }
            } else {
                WelcomeView(authIsPresented: $authIsPresented)
            }
        }
        .sheet(isPresented: $authIsPresented) {
            ClerkAuthSheet()
        }
    }
}

// MARK: - Brand Gradient Background Component
struct BrandGradientBackground: View {
    var body: some View {
        AppTheme.backgroundView()
    }
}

// MARK: - Native Auth Sheet (replaces Clerk's AuthView — uses clerk.auth SDK methods)
struct ClerkAuthSheet: View {
    @State private var showSignUp = false

    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            if showSignUp {
                NativeSignUpView(showSignUp: $showSignUp)
                    .transition(.asymmetric(insertion: .move(edge: .trailing),
                                           removal: .move(edge: .leading)))
            } else {
                NativeSignInView(showSignUp: $showSignUp)
                    .transition(.asymmetric(insertion: .move(edge: .leading),
                                           removal: .move(edge: .trailing)))
            }
        }
        .animation(.easeInOut(duration: 0.25), value: showSignUp)
    }
}

// MARK: - Sign In View
private struct NativeSignInView: View {
    @Binding var showSignUp: Bool
    @Environment(\.dismiss) private var dismiss

    @State private var email    = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMsg  = ""

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .padding(10)
                        .background(AppTheme.Colors.cardSurface)
                        .clipShape(Circle())
                }
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)

            ScrollView {
                VStack(spacing: 28) {
                    // Logo + title
                    VStack(spacing: 12) {
                        BrandIcon()
                            .scaleEffect(0.7)
                        Text("Welcome back")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(AppTheme.Colors.textPrimary)
                        Text("Sign in to your Kacha account")
                            .font(.system(size: 15))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                    .padding(.top, 8)

                    // Fields
                    VStack(spacing: 14) {
                        AuthTextField(placeholder: "Email address", text: $email,
                                      icon: "envelope", keyboardType: .emailAddress)
                        AuthTextField(placeholder: "Password", text: $password,
                                      icon: "lock", isSecure: true)
                    }

                    if !errorMsg.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                            Text(errorMsg)
                        }
                        .font(.system(size: 14))
                        .foregroundColor(.red)
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(Color.red.opacity(0.08))
                        .cornerRadius(8)
                    }

                    // Sign In button
                    Button(action: signIn) {
                        HStack(spacing: 8) {
                            if isLoading {
                                ProgressView().progressViewStyle(.circular).tint(.white).scaleEffect(0.9)
                            } else {
                                Text("Sign In")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(canSubmit ? AppTheme.Colors.primary : AppTheme.Colors.primary.opacity(0.4))
                        .foregroundColor(.white)
                        .cornerRadius(14)
                    }
                    .disabled(!canSubmit || isLoading)

                    // Switch to Sign Up
                    Button(action: { showSignUp = true }) {
                        HStack(spacing: 4) {
                            Text("Don't have an account?")
                                .foregroundColor(AppTheme.Colors.textSecondary)
                            Text("Create one")
                                .fontWeight(.semibold)
                                .foregroundColor(AppTheme.Colors.primary)
                        }
                        .font(.system(size: 15))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private var canSubmit: Bool { !email.isEmpty && !password.isEmpty }

    private func signIn() {
        guard canSubmit else { return }
        isLoading = true
        errorMsg  = ""
        Task {
            do {
                _ = try await SignIn.create(strategy: .identifier(email, password: password))
                dismiss()
            } catch {
                errorMsg = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// MARK: - Sign Up View
private struct NativeSignUpView: View {
    @Binding var showSignUp: Bool
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var authManager: ClerkAuthManager

    @State private var firstName = ""
    @State private var lastName  = ""
    @State private var username  = ""
    @State private var email     = ""
    @State private var password  = ""
    @State private var isLoading = false
    @State private var errorMsg  = ""

    // Email OTP verification step
    @State private var pendingSignUp: SignUp? = nil
    @State private var otpCode = ""
    @State private var showOTP = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: {
                    if showOTP { showOTP = false } else { dismiss() }
                }) {
                    Image(systemName: showOTP ? "chevron.left" : "xmark")
                        .font(.system(size: 17, weight: showOTP ? .regular : .semibold))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .padding(10)
                        .background(AppTheme.Colors.cardSurface)
                        .clipShape(Circle())
                }
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)

            if showOTP {
                otpView
            } else {
                signUpForm
            }
        }
    }

    // MARK: Sign-up form
    @ViewBuilder private var signUpForm: some View {
        ScrollView {
            VStack(spacing: 28) {
                VStack(spacing: 8) {
                    Text("Create account")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(AppTheme.Colors.textPrimary)
                    Text("Join Kacha to track expenses")
                        .font(.system(size: 15))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                }
                .padding(.top, 16)

                VStack(spacing: 14) {
                    HStack(spacing: 10) {
                        AuthTextField(placeholder: "First name", text: $firstName, icon: "person")
                        AuthTextField(placeholder: "Last name",  text: $lastName,  icon: "person")
                    }
                    AuthTextField(placeholder: "Username", text: $username, icon: "at")
                    AuthTextField(placeholder: "Email address", text: $email,
                                  icon: "envelope", keyboardType: .emailAddress)
                    AuthTextField(placeholder: "Password (8+ chars)", text: $password,
                                  icon: "lock", isSecure: true)
                }

                if !errorMsg.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.circle.fill")
                        Text(errorMsg)
                    }
                    .font(.system(size: 14))
                    .foregroundColor(.red)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(Color.red.opacity(0.08))
                    .cornerRadius(8)
                }

                Button(action: startSignUp) {
                    HStack(spacing: 8) {
                        if isLoading {
                            ProgressView().progressViewStyle(.circular).tint(.white).scaleEffect(0.9)
                        } else {
                            Text("Create Account")
                                .font(.system(size: 17, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(canSubmitSignUp ? AppTheme.Colors.primary : AppTheme.Colors.primary.opacity(0.4))
                    .foregroundColor(.white)
                    .cornerRadius(14)
                }
                .disabled(!canSubmitSignUp || isLoading)

                Button(action: { showSignUp = false }) {
                    HStack(spacing: 4) {
                        Text("Already have an account?")
                            .foregroundColor(AppTheme.Colors.textSecondary)
                        Text("Sign in")
                            .fontWeight(.semibold)
                            .foregroundColor(AppTheme.Colors.primary)
                    }
                    .font(.system(size: 15))
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    // MARK: OTP verification step
    @ViewBuilder private var otpView: some View {
        VStack(spacing: 28) {
            VStack(spacing: 8) {
                Image(systemName: "envelope.badge")
                    .font(.system(size: 44))
                    .foregroundColor(AppTheme.Colors.primary)
                    .padding(.top, 24)
                Text("Check your email")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(AppTheme.Colors.textPrimary)
                Text("Enter the 6-digit code sent to\n\(email)")
                    .font(.system(size: 15))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            TextField("6-digit code", text: $otpCode)
                .keyboardType(.numberPad)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .multilineTextAlignment(.center)
                .frame(height: 64)
                .background(AppTheme.Colors.cardSurface)
                .cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14)
                    .stroke(AppTheme.Colors.border, lineWidth: 1))
                .padding(.horizontal, 24)

            if !errorMsg.isEmpty {
                Text(errorMsg)
                    .font(.system(size: 14))
                    .foregroundColor(.red)
            }

            Button(action: verifyOTP) {
                HStack { if isLoading { ProgressView().tint(.white) } else { Text("Verify").font(.system(size: 17, weight: .semibold)) } }
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(otpCode.count == 6 ? AppTheme.Colors.primary : AppTheme.Colors.primary.opacity(0.4))
                    .foregroundColor(.white).cornerRadius(14)
            }
            .disabled(otpCode.count != 6 || isLoading)
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    private var canSubmitSignUp: Bool {
        !firstName.isEmpty && !lastName.isEmpty && !username.isEmpty
            && !email.isEmpty && password.count >= 8
    }

    private func startSignUp() {
        guard canSubmitSignUp else { return }
        let cleanUsername = username.trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: " ", with: "").lowercased()
        guard cleanUsername.count >= 3 else {
            errorMsg = "Username must be at least 3 characters"
            return
        }
        isLoading = true
        errorMsg  = ""
        Task {
            do {
                var signUp = try await SignUp.create(strategy: .standard(
                    emailAddress: email,
                    password:     password,
                    firstName:    firstName,
                    lastName:     lastName,
                    username:     cleanUsername
                ))
                // If email verification is required, send the code
                if signUp.status == .missingRequirements {
                    signUp = try await signUp.prepareVerification(strategy: .emailCode)
                    pendingSignUp = signUp
                    showOTP = true
                } else {
                    // Auto-complete (no email verification required by Clerk instance)
                    await finishSignUp()
                }
            } catch {
                errorMsg = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func verifyOTP() {
        guard let signUp = pendingSignUp else { return }
        isLoading = true
        errorMsg  = ""
        Task {
            do {
                _ = try await signUp.attemptVerification(strategy: .emailCode(code: otpCode))
                await finishSignUp()
            } catch {
                errorMsg = "Invalid code — please try again"
            }
            isLoading = false
        }
    }

    private func finishSignUp() async {
        // Create Supabase profile (mirrors Android's Step 2)
        if let token = try? await Clerk.shared.session?.getToken()?.jwt {
            let clean = username.trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: " ", with: "").lowercased()
            await authManager.createProfile(
                token: token, email: email,
                username: clean, firstName: firstName, lastName: lastName
            )
        }
        dismiss()
    }
}

// MARK: - Reusable auth text field
private struct AuthTextField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(AppTheme.Colors.textSecondary)
                .frame(width: 20)
            if isSecure {
                SecureField(placeholder, text: $text)
                    .font(.system(size: 16))
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .font(.system(size: 16))
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.Colors.border, lineWidth: 1))
    }
}

// MARK: - Welcome Screen
struct WelcomeView: View {
    @Binding var authIsPresented: Bool
    
    var body: some View {
        VStack(spacing: 40) {
            Spacer()
            
            // Brand Icon with Emerald Gradient
            BrandIcon()
            
            // Title & Subtitle
            VStack(spacing: 12) {
                Text("Kacha")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundColor(AppTheme.Colors.primary)
                
                Text("Smart Expense Tracker")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            Spacer()
            
            // Sign In Button with Production-Grade Design
            SignInButton(action: { authIsPresented = true })
            
            // Clerk Branding
            Text("Secured by Clerk")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(AppTheme.Colors.textSecondary)
                .padding(.bottom, 40)
        }
    }
}

// MARK: - Brand Icon Component
struct BrandIcon: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            AppTheme.Colors.primary,       // blue-500
                            AppTheme.Colors.primaryDark      // blue-600
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 120, height: 120)
                .shadow(
                    color: AppTheme.Colors.primary.opacity(0.3),
                    radius: 20,
                    x: 0,
                    y: 10
                )
            
            Image(systemName: "fuelpump.fill")
                .font(.system(size: 50, weight: .semibold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Sign In Button Component
struct SignInButton: View {
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 20))
                Text("Sign In")
                    .font(.system(size: 18, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                LinearGradient(
                    colors: [
                        AppTheme.Colors.primary,       // blue-500
                        AppTheme.Colors.primaryDark      // blue-600
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(16)
            .shadow(
                color: AppTheme.Colors.primary.opacity(0.25),
                radius: 12,
                x: 0,
                y: 6
            )
        }
        .padding(.horizontal, 32)
    }
}

// MARK: - Account Tab
struct AccountTab: View {
    @Environment(\.clerk) private var clerk
    
    var body: some View {
        NavigationStack {
            ZStack {
                BrandGradientBackground()
                
                ScrollView {
                    VStack(spacing: 24) {
                        if let user = clerk.user {
                            // Profile Image
                            if let imageURL = URL(string: user.imageUrl) {
                                AsyncImage(url: imageURL) { image in
                                    image
                                        .resizable()
                                        .scaledToFill()
                                } placeholder: {
                                    ProfileImagePlaceholder()
                                }
                                .frame(width: 120, height: 120)
                                .clipShape(Circle())
                                .shadow(
                                    color: AppTheme.Colors.primary.opacity(0.2),
                                    radius: 15,
                                    x: 0,
                                    y: 8
                                )
                            } else {
                                ProfileImagePlaceholder()
                                    .frame(width: 120, height: 120)
                            }
                            
                            // User Name
                            if let firstName = user.firstName, let lastName = user.lastName {
                                Text("\(firstName) \(lastName)")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(AppTheme.Colors.primary)
                            } else if let email = user.emailAddresses.first?.emailAddress {
                                Text(email)
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(AppTheme.Colors.primary)
                            }
                            
                            // Email
                            if let email = user.emailAddresses.first?.emailAddress {
                                Text(email)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                            }
                            
                            // UserButton Card
                            UserButtonCard()
                        }
                    }
                    .padding(.top, 20)
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
        }
        .accentColor(AppTheme.Colors.primary)
    }
}

// MARK: - Profile Image Placeholder
struct ProfileImagePlaceholder: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            AppTheme.Colors.primary,
                            AppTheme.Colors.primaryDark
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            Image(systemName: "person.circle.fill")
                .font(.system(size: 50))
                .foregroundColor(.white)
        }
        .shadow(
            color: AppTheme.Colors.primary.opacity(0.2),
            radius: 15,
            x: 0,
            y: 8
        )
    }
}

// MARK: - UserButton Card Component
struct UserButtonCard: View {
    var body: some View {
        VStack(spacing: 0) {
            UserButton()
                .frame(maxWidth: .infinity)
        }
        .padding(20)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 4)
        .padding(.horizontal, 24)
    }
}
