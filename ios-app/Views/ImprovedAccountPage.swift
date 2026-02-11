import SwiftUI

struct ImprovedAccountPage: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @State private var showingSignOutAlert = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()
                
                List {
                    // Profile Section
                    Section {
                        HStack(spacing: 16) {
                            // Avatar
                            ZStack {
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [
                                                Color(red: 0.2, green: 0.7, blue: 0.4),
                                                Color(red: 0.15, green: 0.6, blue: 0.35)
                                            ],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 70, height: 70)
                                
                                if let user = authManager.currentUser, let name = user.name {
                                    Text(String(name.prefix(1)).uppercased())
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundColor(.white)
                                } else {
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 32))
                                        .foregroundColor(.white)
                                }
                            }
                            
                            VStack(alignment: .leading, spacing: 6) {
                                if let user = authManager.currentUser {
                                    Text(user.name ?? "User")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(.primary)
                                    
                                    Text(user.email)
                                        .font(.system(size: 15))
                                        .foregroundColor(.secondary)
                                } else {
                                    Text("Loading...")
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 12)
                    }
                    .listRowBackground(Color(UIColor.secondarySystemGroupedBackground))
                    
                    // Account Settings
                    Section("Account") {
                        NavigationLink(destination: Text("Edit Profile")) {
                            Label("Edit Profile", systemImage: "person.circle")
                        }
                        
                        NavigationLink(destination: Text("Preferences")) {
                            Label("Preferences", systemImage: "slider.horizontal.3")
                        }
                        
                        NavigationLink(destination: Text("Notifications")) {
                            Label("Notifications", systemImage: "bell")
                        }
                    }
                    .listRowBackground(Color(UIColor.secondarySystemGroupedBackground))
                    
                    // Workspace
                    Section("Workspace") {
                        NavigationLink(destination: Text("My Workspaces")) {
                            Label("My Workspaces", systemImage: "briefcase")
                        }
                        
                        NavigationLink(destination: Text("Team Members")) {
                            Label("Team Members", systemImage: "person.2")
                        }
                    }
                    .listRowBackground(Color(UIColor.secondarySystemGroupedBackground))
                    
                    // Security
                    Section("Security") {
                        NavigationLink(destination: Text("Change Password")) {
                            Label("Change Password", systemImage: "lock.shield")
                        }
                        
                        NavigationLink(destination: Text("Two-Factor Auth")) {
                            Label("Two-Factor Authentication", systemImage: "key")
                        }
                    }
                    .listRowBackground(Color(UIColor.secondarySystemGroupedBackground))
                    
                    // Support
                    Section("Support") {
                        NavigationLink(destination: Text("Help Center")) {
                            Label("Help Center", systemImage: "questionmark.circle")
                        }
                        
                        NavigationLink(destination: Text("About")) {
                            Label("About", systemImage: "info.circle")
                        }
                        
                        Link(destination: URL(string: "https://www.mafutapass.com/privacy")!) {
                            Label("Privacy Policy", systemImage: "hand.raised")
                        }
                    }
                    .listRowBackground(Color(UIColor.secondarySystemGroupedBackground))
                    
                    // Sign Out
                    Section {
                        Button(action: {
                            showingSignOutAlert = true
                        }) {
                            HStack {
                                Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                                    .foregroundColor(.red)
                                
                                Spacer()
                            }
                        }
                    }
                    .listRowBackground(Color(UIColor.secondarySystemGroupedBackground))
                }
                .scrollContentBackground(.hidden)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Account")
                        .font(.system(size: 28, weight: .bold))
                }
            }
            .alert("Sign Out", isPresented: $showingSignOutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    authManager.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}

#Preview {
    ImprovedAccountPage()
        .environmentObject(ClerkAuthManager.shared)
}
