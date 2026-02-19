import SwiftUI
import Clerk

// MARK: - Main App Entry Point
@main
struct MafutaPassApp: App {
    @State private var clerk = Clerk.shared
    
    init() {
        configureGlobalAppearance()
    }
    
    var body: some Scene {
        WindowGroup {
            ClerkContentView()
                .environment(\.clerk, clerk)
                .task {
                    clerk.configure(publishableKey: "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k")
                    try? await clerk.load()
                }
        }
    }
    
    // MARK: - Production-Grade Global Appearance Configuration
    private func configureGlobalAppearance() {
        // Brand Colors - Blue #0066FF (matches web app)
        let bluePrimary = UIColor(red: 0.0, green: 0.4, blue: 1.0, alpha: 1.0)     // #0066FF blue-500
        let blueLight = UIColor(red: 0.937, green: 0.965, blue: 1.0, alpha: 1.0)   // #eff6ff blue-50
        let blueDark = UIColor(red: 0.0, green: 0.322, blue: 0.8, alpha: 1.0)      // #0052CC blue-600
        
        // Global Tint Color
        UIView.appearance().tintColor = bluePrimary
        
        // Navigation Bar Appearance
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithTransparentBackground()
        navAppearance.backgroundColor = blueLight.withAlphaComponent(0.8)
        navAppearance.titleTextAttributes = [
            .foregroundColor: UIColor.darkGray,
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: blueDark,
            .font: UIFont.systemFont(ofSize: 34, weight: .bold)
        ]
        
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance
        UINavigationBar.appearance().tintColor = bluePrimary
        
        // Tab Bar Appearance
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = UIColor.white.withAlphaComponent(0.95)
        
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
        LinearGradient(
            colors: [
                Color(red: 0.937, green: 0.965, blue: 1.0),   // blue-50: #eff6ff
                Color(red: 0.898, green: 0.941, blue: 0.996),  // blue-100 (via)
                Color(red: 0.859, green: 0.918, blue: 0.996)   // blue-100: #dbeafe
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

// MARK: - Clerk Authentication Sheet
struct ClerkAuthSheet: View {
    var body: some View {
        ZStack {
            // White background instead of brand gradient
            Color.white
                .ignoresSafeArea()
            
            // Blue accent overlay
            VStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.937, green: 0.965, blue: 1.0).opacity(0.3),
                        Color.white
                    ],
                    startPoint: .top,
                    endPoint: .center
                )
                .frame(height: 200)
                Spacer()
            }
            .ignoresSafeArea()
            
            AuthView()
                .accentColor(Color(red: 0.0, green: 0.4, blue: 1.0))
        }
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
                    .foregroundColor(Color(red: 0.0, green: 0.4, blue: 1.0))
                
                Text("Smart Expense Tracker")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            Spacer()
            
            // Sign In Button with Production-Grade Design
            SignInButton(action: { authIsPresented = true })
            
            // Clerk Branding
            Text("Secured by Clerk")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.secondary)
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
                            Color(red: 0.0, green: 0.4, blue: 1.0),       // blue-500
                            Color(red: 0.0, green: 0.322, blue: 0.8)      // blue-600
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 120, height: 120)
                .shadow(
                    color: Color(red: 0.0, green: 0.4, blue: 1.0).opacity(0.3),
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
                        Color(red: 0.0, green: 0.4, blue: 1.0),       // blue-500
                        Color(red: 0.0, green: 0.322, blue: 0.8)      // blue-600
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(16)
            .shadow(
                color: Color(red: 0.0, green: 0.4, blue: 1.0).opacity(0.25),
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
                                    color: Color(red: 0.0, green: 0.4, blue: 1.0).opacity(0.2),
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
                                    .foregroundColor(Color(red: 0.0, green: 0.4, blue: 1.0))
                            } else if let email = user.emailAddresses.first?.emailAddress {
                                Text(email)
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(Color(red: 0.0, green: 0.4, blue: 1.0))
                            }
                            
                            // Email
                            if let email = user.emailAddresses.first?.emailAddress {
                                Text(email)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.secondary)
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
        .accentColor(Color(red: 0.0, green: 0.4, blue: 1.0))
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
                            Color(red: 0.0, green: 0.4, blue: 1.0),
                            Color(red: 0.0, green: 0.322, blue: 0.8)
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
            color: Color(red: 0.0, green: 0.4, blue: 1.0).opacity(0.2),
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
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 4)
        .padding(.horizontal, 24)
    }
}
