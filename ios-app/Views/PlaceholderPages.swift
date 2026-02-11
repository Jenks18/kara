import SwiftUI
import Clerk

// MARK: - Account Page (Matching Web App Exactly)
struct AccountPage: View {
    @Environment(\.clerk) private var clerk
    
    var body: some View {
        ZStack {
            // Very light mint background
            Color(red: 0.96, green: 0.99, blue: 0.97)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    // Profile Header - Compact
                    HStack(spacing: 12) {
                        // Avatar with briefcase icon
                        ZStack {
                            Circle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 48, height: 48)
                            
                            Image(systemName: "briefcase.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.gray)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            // Name
                            Text(userDisplayName)
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.black)
                            
                            // Email
                            if let email = clerk.user?.primaryEmailAddress?.emailAddress {
                                Text(email)
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                        }
                        
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(12)
                    .padding(16)
                    
                    // ACCOUNT Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("ACCOUNT")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.gray)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 12)
                        
                        VStack(spacing: 0) {
                            MenuItemRow(icon: "person", title: "Profile", showChevron: true)
                            Divider().padding(.leading, 60)
                            MenuItemRow(icon: "gearshape", title: "Preferences", showChevron: true)
                            Divider().padding(.leading, 60)
                            MenuItemRow(icon: "shield", title: "Security", showChevron: true)
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 24)
                    
                    // GENERAL Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("GENERAL")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.gray)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 12)
                        
                        VStack(spacing: 0) {
                            MenuItemRow(icon: "questionmark.circle", title: "Help", showChevron: false, showExternal: true)
                            Divider().padding(.leading, 60)
                            MenuItemRow(icon: "sparkles", title: "What's new", showChevron: false, showExternal: true)
                            Divider().padding(.leading, 60)
                            MenuItemRow(icon: "info.circle", title: "About", showChevron: true)
                            Divider().padding(.leading, 60)
                            MenuItemRow(icon: "wrench", title: "Troubleshoot", showChevron: true)
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 24)
                    
                    // Sign Out Button
                    Button(action: {
                        Task {
                            try? await clerk.signOut()
                        }
                    }) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .font(.system(size: 20))
                            Text("Sign Out")
                                .font(.system(size: 17))
                            Spacer()
                        }
                        .foregroundColor(.red)
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24) // Changed from 100 to 24 for tighter bottom spacing
                }
            }
        }
    }
    
    private var userDisplayName: String {
        if let firstName = clerk.user?.firstName, let lastName = clerk.user?.lastName {
            return "\(firstName) \(lastName)"
        } else if let firstName = clerk.user?.firstName {
            return firstName
        } else if let lastName = clerk.user?.lastName {
            return lastName
        }
        return "User"
    }
}

// Menu Item Row Component
struct MenuItemRow: View {
    let icon: String
    let title: String
    let showChevron: Bool
    var showExternal: Bool = false
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.gray)
                .frame(width: 28)
            
            Text(title)
                .font(.system(size: 17))
                .foregroundColor(.black)
            
            Spacer()
            
            if showExternal {
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            } else if showChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

// MARK: - Workspaces Page (Matching Web App)

