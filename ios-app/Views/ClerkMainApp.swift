import SwiftUI

// MARK: - Main App with Clerk Authentication
struct ClerkMainApp: View {
    @StateObject private var authManager = ClerkAuthManager.shared
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                AuthenticatedApp()
                    .environmentObject(authManager)
            } else {
                ClerkSignInView()
                    .environmentObject(authManager)
            }
        }
    }
}

// MARK: - Authenticated App (after login)
struct AuthenticatedApp: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    
    var body: some View {
        TabView {
            // Home Tab
            HomePage()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
            
            // Reports Tab
            ReportsPage()
                .tabItem {
                    Label("Reports", systemImage: "doc.text.fill")
                }
            
            // Create Tab
            CameraView()
                .tabItem {
                    Label("Scan", systemImage: "camera.fill")
                }
            
            // Account Tab
            ClerkAccountPage()
                .tabItem {
                    Label("Account", systemImage: "person.fill")
                }
        }
        .tint(.green)
    }
}

// MARK: - Account Page with Clerk
struct ClerkAccountPage: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @State private var showSignOutAlert = false
    
    var body: some View {
        NavigationView {
            List {
                // User Profile Section
                Section {
                    HStack(spacing: 16) {
                        // Avatar
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [.green, .green.opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 60, height: 60)
                            
                            if let avatarURL = authManager.currentUser?.avatarURL,
                               let url = URL(string: avatarURL) {
                                AsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .scaledToFill()
                                } placeholder: {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(.white)
                                        .font(.title)
                                }
                                .frame(width: 60, height: 60)
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "person.fill")
                                    .foregroundColor(.white)
                                    .font(.title)
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(authManager.currentUser?.name ?? "User")
                                .font(.headline)
                            Text(authManager.currentUser?.email ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                // Settings Section
                Section("Settings") {
                    NavigationLink(destination: Text("Profile Settings")) {
                        Label("Profile", systemImage: "person.circle")
                    }
                    
                    NavigationLink(destination: Text("Preferences")) {
                        Label("Preferences", systemImage: "slider.horizontal.3")
                    }
                    
                    NavigationLink(destination: Text("Notifications")) {
                        Label("Notifications", systemImage: "bell")
                    }
                }
                
                // Workspace Section
                Section("Workspace") {
                    NavigationLink(destination: Text("My Workspaces")) {
                        Label("Workspaces", systemImage: "building.2")
                    }
                    
                    NavigationLink(destination: Text("Team")) {
                        Label("Team Members", systemImage: "person.3")
                    }
                }
                
                // Support Section
                Section("Support") {
                    NavigationLink(destination: Text("Help & FAQ")) {
                        Label("Help & FAQ", systemImage: "questionmark.circle")
                    }
                    
                    NavigationLink(destination: Text("Contact Us")) {
                        Label("Contact Us", systemImage: "envelope")
                    }
                }
                
                // Sign Out Section
                Section {
                    Button(action: {
                        showSignOutAlert = true
                    }) {
                        HStack {
                            Label("Sign Out", systemImage: "arrow.right.square")
                            Spacer()
                        }
                        .foregroundColor(.red)
                    }
                }
                
                // Version Info
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    .font(.footnote)
                }
            }
            .navigationTitle("Account")
            .alert("Sign Out", isPresented: $showSignOutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    authManager.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}
