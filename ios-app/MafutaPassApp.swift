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
                    clerk.configure(publishableKey: "pk_live_Y2xlcmsua2FjaGFsYWJzLmNvbSQ")
                    do {
                        try await clerk.load()
                        // Validate that loaded session is still valid
                        if clerk.session != nil {
                            let _ = try await clerk.session?.getToken()
                        }
                    } catch {
                        // Stale session from old Clerk instance — force sign out
                        #if DEBUG
                        print("[MafutaPass] Stale session detected, signing out: \(error)")
                        #endif
                        try? await clerk.signOut()
                    }
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

// Sheet routing — carried as an Identifiable item so the sheet is always
// instantiated fresh with the correct mode (no state-batch race condition).
private enum AuthMode: String, Identifiable {
    case signIn, signUp
    var id: String { rawValue }
}

// MARK: - Root Content View with Authentication
struct ClerkContentView: View {
    @Environment(\.clerk) private var clerk
    @State private var authMode: AuthMode? = nil
    
    var body: some View {
        ZStack {
            // Blue gradient background matching web app design system
            BrandGradientBackground()
            
            if let clerkUser = clerk.user {
                // Prime the cache synchronously BEFORE MainAppView() is composed
                // so the tab bar and account header show the correct avatar/name
                // from frame zero — not the default 💼.
                let _ = {
                    // Set userId namespace FIRST so every DataCache read that
                    // follows uses the correct per-user keys — zero stale flash.
                    DataCache.shared.currentUserId = clerkUser.id
                    ProfileManager.shared.primeFromCache(userId: clerkUser.id)
                }()
                MainAppView()
                    .environmentObject(ClerkAuthManager.shared)
                    .environmentObject(ProfileManager.shared)
                    .onAppear {
                        ClerkAuthManager.shared.syncUser()
                        // Load profile once after auth — ProfileManager is the single source of truth
                        Task {
                            if let user = ClerkAuthManager.shared.currentUser {
                                await ProfileManager.shared.loadProfile(
                                    userId: user.id,
                                    fallbackName: user.name,
                                    fallbackEmail: user.email
                                )
                            }
                        }
                    }
                    .onChange(of: clerk.user) { _, newUser in
                        if let newUser {
                            // Set DataCache namespace to new user BEFORE any
                            // view reads the cache — different userId = automatic
                            // cache miss, so no clearAll() is needed for safety.
                            DataCache.shared.currentUserId = newUser.id
                            ProfileManager.shared.clear()
                            ClerkAuthManager.shared.syncUser()
                            Task {
                                if let user = ClerkAuthManager.shared.currentUser {
                                    await ProfileManager.shared.loadProfile(
                                        userId: user.id,
                                        fallbackName: user.name,
                                        fallbackEmail: user.email
                                    )
                                }
                            }
                        } else {
                            // Sign-out: wipe current user's data from disk (privacy cleanup)
                            // and reset namespace so stale reads are impossible.
                            DataCache.shared.clearCurrentUser()
                            DataCache.shared.currentUserId = "anon"
                            ClerkAuthManager.shared.clearUser()
                            ProfileManager.shared.clear()
                        }
                    }
            } else {
                WelcomeView(
                    onSignUp: { authMode = .signUp },
                    onLogIn:  { authMode = .signIn }
                )
            }
        }
        // sheet(item:) guarantees a fresh view instantiation for each mode value,
        // so ClerkAuthSheet.init always runs with the exact startWithSignUp from mode.
        .sheet(item: $authMode) { mode in
            ClerkAuthSheet(startWithSignUp: mode == .signUp)
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
    let startWithSignUp: Bool
    @State private var showSignUp: Bool
    // Google OAuth → new user needs a username
    @State private var pendingGoogleSignUp: SignUp? = nil
    @State private var showGoogleUsernameSetup = false

    init(startWithSignUp: Bool = false) {
        self.startWithSignUp = startWithSignUp
        // Initialise @State directly so the correct screen shows on first render
        self._showSignUp = State(initialValue: startWithSignUp)
    }

    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            if showGoogleUsernameSetup {
                GoogleUsernameSetupView(
                    pendingSignUp: $pendingGoogleSignUp,
                    showGoogleUsernameSetup: $showGoogleUsernameSetup
                )
                .transition(.asymmetric(insertion: .move(edge: .trailing),
                                       removal: .move(edge: .leading)))
            } else if showSignUp {
                NativeSignUpView(
                    showSignUp: $showSignUp,
                    pendingGoogleSignUp: $pendingGoogleSignUp,
                    showGoogleUsernameSetup: $showGoogleUsernameSetup
                )
                    .transition(.asymmetric(insertion: .move(edge: .trailing),
                                           removal: .move(edge: .leading)))
            } else {
                NativeSignInView(
                    showSignUp: $showSignUp,
                    pendingGoogleSignUp: $pendingGoogleSignUp,
                    showGoogleUsernameSetup: $showGoogleUsernameSetup
                )
                    .transition(.asymmetric(insertion: .move(edge: .leading),
                                           removal: .move(edge: .trailing)))
            }
        }
        .animation(.easeInOut(duration: 0.25), value: showSignUp)
        .animation(.easeInOut(duration: 0.25), value: showGoogleUsernameSetup)
    }
}

// MARK: - Sign In View
private struct NativeSignInView: View {
    @Binding var showSignUp: Bool
    @Binding var pendingGoogleSignUp: SignUp?
    @Binding var showGoogleUsernameSetup: Bool
    @Environment(\.dismiss) private var dismiss

    @State private var email    = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var isGoogleLoading = false
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
                    // Title block — no logo icon
                    VStack(spacing: 8) {
                        Text("Welcome back")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(AppTheme.Colors.textPrimary)
                        Text("Sign in to your Kacha account")
                            .font(.system(size: 15))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                    .padding(.top, 24)

                    // Google Sign-In button
                    GoogleSignInButton(isLoading: $isGoogleLoading, label: "Continue with Google") {
                        await signInWithGoogle()
                    }

                    // Divider
                    HStack {
                        Rectangle().fill(AppTheme.Colors.border).frame(height: 1)
                        Text("or")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                        Rectangle().fill(AppTheme.Colors.border).frame(height: 1)
                    }

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

    private func signInWithGoogle() async {
        isGoogleLoading = true
        errorMsg = ""
        do {
            let result = try await SignIn.authenticateWithRedirect(
                strategy: .oauth(provider: .google)
            )
            switch result {
            case .signIn(_):
                // Existing user — Clerk session is now active
                dismiss()
            case .signUp(let signUp):
                // New user (no account yet) — needs to complete sign-up with username
                pendingGoogleSignUp = signUp
                showGoogleUsernameSetup = true
            }
        } catch {
            errorMsg = error.localizedDescription
        }
        isGoogleLoading = false
    }
}

// MARK: - Google Username Setup View (for new users who signed in with Google)
private struct GoogleUsernameSetupView: View {
    @Binding var pendingSignUp: SignUp?
    @Binding var showGoogleUsernameSetup: Bool
    @Environment(\.dismiss) private var dismiss

    @State private var username  = ""
    @State private var isLoading = false
    @State private var errorMsg  = ""

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button(action: { showGoogleUsernameSetup = false }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 17, weight: .regular))
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
                    VStack(spacing: 12) {
                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 44))
                            .foregroundColor(AppTheme.Colors.primary)
                            .padding(.top, 24)
                        Text("Almost there!")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(AppTheme.Colors.textPrimary)
                        Text("Choose a username to complete your account")
                            .font(.system(size: 15))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .multilineTextAlignment(.center)
                    }

                    AuthTextField(placeholder: "Username", text: $username, icon: "at")

                    Text("Lowercase letters, numbers, and underscores only. Min 3 characters.")
                        .font(.system(size: 13))
                        .foregroundColor(AppTheme.Colors.textSecondary)

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

                    Button(action: completeSignUp) {
                        HStack(spacing: 8) {
                            if isLoading {
                                ProgressView().progressViewStyle(.circular).tint(.white).scaleEffect(0.9)
                            } else {
                                Text("Complete Sign Up")
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
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private var cleanUsername: String {
        username.trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: " ", with: "").lowercased()
    }

    private var canSubmit: Bool { cleanUsername.count >= 3 }

    private func completeSignUp() {
        let clean = cleanUsername
        guard clean.count >= 3 else {
            errorMsg = "Username must be at least 3 characters"
            return
        }
        guard clean.range(of: "^[a-z0-9_-]+$", options: .regularExpression) != nil else {
            errorMsg = "Only lowercase letters, numbers, underscores, and hyphens"
            return
        }
        isLoading = true
        errorMsg  = ""
        Task {
            do {
                guard var signUp = pendingSignUp else {
                    errorMsg = "Sign-up session expired. Please try again."
                    isLoading = false
                    return
                }
                signUp = try await signUp.update(
                    params: .init(username: clean)
                )
                // Create Supabase profile
                if let token = try? await Clerk.shared.session?.getToken()?.jwt {
                    let email = Clerk.shared.user?.primaryEmailAddress?.emailAddress ?? ""
                    let firstName = Clerk.shared.user?.firstName ?? ""
                    let lastName = Clerk.shared.user?.lastName ?? ""
                    await ClerkAuthManager.shared.createProfile(
                        token: token, email: email,
                        username: clean, firstName: firstName, lastName: lastName
                    )
                }
                dismiss()
            } catch {
                errorMsg = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// MARK: - Google Sign In Button
private struct GoogleSignInButton: View {
    @Binding var isLoading: Bool
    let label: String
    let action: () async -> Void

    var body: some View {
        Button(action: {
            Task { await action() }
        }) {
            HStack(spacing: 12) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .scaleEffect(0.9)
                } else {
                    // Google G logo — white rounded square with coloured G
                    ZStack {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white)
                            .frame(width: 24, height: 24)
                        Text("G")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(Color(red: 0.26, green: 0.52, blue: 0.96))
                    }
                    Text(label)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(AppTheme.Colors.textPrimary)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(AppTheme.Colors.cardSurface)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(AppTheme.Colors.border, lineWidth: 1)
            )
        }
        .disabled(isLoading)
    }
}

// MARK: - Sign Up View
private struct NativeSignUpView: View {
    @Binding var showSignUp: Bool
    @Binding var pendingGoogleSignUp: SignUp?
    @Binding var showGoogleUsernameSetup: Bool
    @Environment(\.dismiss) private var dismiss
    // Use singleton directly — sheet is outside the main view hierarchy so
    // @EnvironmentObject is not propagated here and would crash on access.
    private let authManager = ClerkAuthManager.shared

    @State private var firstName = ""
    @State private var lastName  = ""
    @State private var username  = ""
    @State private var email     = ""
    @State private var password  = ""
    @State private var isLoading = false
    @State private var errorMsg  = ""
    @State private var isGoogleLoading = false
    @State private var pendingSignUp: SignUp? = nil
    @State private var otpCode = ""
    @State private var showOTP = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: {
                    if showOTP {
                        // Clear the pending attempt so pressing Create Account again
                        // always creates a fresh Clerk signup and sends a new code.
                        pendingSignUp = nil
                        otpCode = ""
                        showOTP = false
                    } else { dismiss() }
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

                // Google Sign-Up button
                GoogleSignInButton(isLoading: $isGoogleLoading, label: "Sign up with Google") {
                    await signUpWithGoogle()
                }

                // Divider
                HStack {
                    Rectangle().fill(AppTheme.Colors.border).frame(height: 1)
                    Text("or")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                    Rectangle().fill(AppTheme.Colors.border).frame(height: 1)
                }

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

    @MainActor
    private func verifyOTP() {
        guard let signUp = pendingSignUp else { return }
        isLoading = true
        errorMsg  = ""
        Task { @MainActor in
            do {
                let result = try await signUp.attemptVerification(strategy: .emailCode(code: otpCode))
                if result.status == .complete {
                    // finishSignUp calls dismiss() — stop touching state after that
                    await finishSignUp()
                } else {
                    // Verification not complete yet (shouldn't normally happen)
                    errorMsg = "Verification pending — please try again"
                    isLoading = false
                }
            } catch {
                errorMsg = "Invalid code — please try again"
                isLoading = false
            }
            // Note: on success isLoading stays true until dismiss removes the view
        }
    }

    @MainActor
    private func finishSignUp() async {
        // Create Supabase profile (mirrors Android's Step 2)
        if let token = try? await Clerk.shared.session?.getToken()?.jwt {
            let clean = username.trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: " ", with: "").lowercased()
            await ClerkAuthManager.shared.createProfile(
                token: token, email: email,
                username: clean, firstName: firstName, lastName: lastName
            )
        }
        // Dismiss on main actor — sheet is already torn down by Clerk auth state
        // change, but calling dismiss() is a no-op if already dismissed.
        dismiss()
    }

    private func signUpWithGoogle() async {
        isGoogleLoading = true
        errorMsg = ""
        do {
            let result = try await SignUp.authenticateWithRedirect(
                strategy: .oauth(provider: .google)
            )
            switch result {
            case .signIn(_):
                // Already has an account — signed in
                dismiss()
            case .signUp(let signUp):
                // New user from Google — needs username
                pendingGoogleSignUp = signUp
                showGoogleUsernameSetup = true
            }
        } catch {
            errorMsg = error.localizedDescription
        }
        isGoogleLoading = false
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
    let onSignUp: () -> Void
    let onLogIn: () -> Void

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Background: deep blue gradient
                LinearGradient(
                    colors: [
                        Color(red: 0.04, green: 0.09, blue: 0.18),
                        Color(red: 0.03, green: 0.12, blue: 0.28)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // ── Hero area ──────────────────────────────
                    VStack(spacing: 24) {
                        Spacer().frame(height: geo.safeAreaInsets.top + 32)

                        // Logo
                        Image("KachaLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: geo.size.width * 0.52,
                                   height: geo.size.width * 0.52)
                            .clipShape(RoundedRectangle(cornerRadius: geo.size.width * 0.13,
                                                        style: .continuous))
                            .shadow(color: Color(red: 0.33, green: 0.83, blue: 0.96).opacity(0.35),
                                    radius: 32, x: 0, y: 12)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: geo.size.height * 0.52)

                    // ── Text block ────────────────────────────
                    VStack(spacing: 12) {
                        Text("Kacha")
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundColor(.white)

                        Text("Smart expense tracking\nfor modern teams.")
                            .font(.system(size: 17, weight: .regular))
                            .foregroundColor(.white.opacity(0.65))
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 12)

                    Spacer()

                    // ── Buttons ───────────────────────────────
                    VStack(spacing: 12) {
                        // Sign up — filled
                        Button(action: onSignUp) {
                            Text("Sign up")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(
                                    LinearGradient(
                                        colors: [
                                            AppTheme.Colors.primary,
                                            AppTheme.Colors.primaryDark
                                        ],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .clipShape(Capsule())
                        }

                        // Log in — ghost outline
                        Button(action: onLogIn) {
                            Text("Log in")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(Color.white.opacity(0.08))
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(Color.white.opacity(0.25), lineWidth: 1.5)
                                )
                        }

                        // Terms — tappable links
                        HStack(spacing: 0) {
                            Text("By continuing you agree to our ")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.38))
                            Button(action: {
                                if let url = URL(string: "https://www.kachalabs.com/terms-of-service") {
                                    UIApplication.shared.open(url)
                                }
                            }) {
                                Text("Terms")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.65))
                                    .underline()
                            }
                            Text(" & ")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.38))
                            Button(action: {
                                if let url = URL(string: "https://www.kachalabs.com/privacy-policy") {
                                    UIApplication.shared.open(url)
                                }
                            }) {
                                Text("Privacy Policy")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.65))
                                    .underline()
                            }
                        }
                        .padding(.top, 4)
                    }
                    .padding(.horizontal, 28)
                    .padding(.bottom, geo.safeAreaInsets.bottom + 24)
                }
            }
        }
        .ignoresSafeArea()
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
