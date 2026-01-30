import SwiftUI
import Clerk

struct AccountPage: View {
    @Environment(\.clerk) private var clerk
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.96, green: 0.99, blue: 0.97),
                        Color(red: 0.94, green: 0.99, blue: 0.95),
                        Color(red: 0.96, green: 0.99, blue: 0.97)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Profile header
                        VStack(spacing: 16) {
                            // Avatar
                            if let imageUrl = clerk.user?.imageUrl {
                                AsyncImage(url: URL(string: imageUrl)) { image in
                                    image
                                        .resizable()
                                        .scaledToFill()
                                } placeholder: {
                                    Circle()
                                        .fill(Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.2))
                                }
                                .frame(width: 80, height: 80)
                                .clipShape(Circle())
                            } else {
                                Circle()
                                    .fill(Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.2))
                                    .frame(width: 80, height: 80)
                                    .overlay(
                                        Text(userInitials)
                                            .font(.system(size: 32, weight: .semibold))
                                            .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                                    )
                            }
                            
                            // Name and email
                            VStack(spacing: 4) {
                                Text(userDisplayName)
                                    .font(.system(size: 22, weight: .bold))
                                
                                if let email = clerk.user?.primaryEmailAddress?.emailAddress {
                                    Text(email)
                                        .font(.system(size: 15))
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.top, 20)
                        .padding(.bottom, 10)
                        
                        // Menu sections
                        VStack(spacing: 12) {
                            // Profile section
                            AccountMenuSection(title: "Profile") {
                                AccountMenuItem(
                                    icon: "person.circle",
                                    title: "Profile",
                                    destination: AnyView(Text("Profile page coming soon"))
                                )
                                
                                AccountMenuItem(
                                    icon: "lock.circle",
                                    title: "Security",
                                    destination: AnyView(Text("Security page coming soon"))
                                )
                                
                                AccountMenuItem(
                                    icon: "gearshape.circle",
                                    title: "Preferences",
                                    destination: AnyView(Text("Preferences page coming soon"))
                                )
                            }
                            
                            // App section
                            AccountMenuSection(title: "App") {
                                AccountMenuItem(
                                    icon: "info.circle",
                                    title: "About",
                                    destination: AnyView(AboutView())
                                )
                                
                                AccountMenuItem(
                                    icon: "questionmark.circle",
                                    title: "Help & Support",
                                    destination: AnyView(Text("Help coming soon"))
                                )
                            }
                            
                            // Sign out button
                            Button(action: signOut) {
                                HStack {
                                    Image(systemName: "arrow.right.square")
                                        .font(.system(size: 20))
                                    Text("Sign Out")
                                        .font(.system(size: 17, weight: .medium))
                                }
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.white)
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 100)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private var userDisplayName: String {
        guard let user = clerk.user else { return "User" }
        let first = user.firstName ?? ""
        let last = user.lastName ?? ""
        if !first.isEmpty && !last.isEmpty {
            return "\(first) \(last)"
        } else if !first.isEmpty {
            return first
        } else if !last.isEmpty {
            return last
        } else if let email = user.primaryEmailAddress?.emailAddress {
            return email
        }
        return "User"
    }
    
    private var userInitials: String {
        guard let user = clerk.user else { return "?" }
        let first = user.firstName?.prefix(1).uppercased() ?? ""
        let last = user.lastName?.prefix(1).uppercased() ?? ""
        if !first.isEmpty && !last.isEmpty {
            return first + last
        } else if !first.isEmpty {
            return first
        } else if !last.isEmpty {
            return last
        } else if let email = user.primaryEmailAddress?.emailAddress {
            return String(email.prefix(2)).uppercased()
        }
        return "?"
    }
    
    private func signOut() {
        Task {
            try? await clerk.signOut()
        }
    }
}

// Menu section grouping
struct AccountMenuSection<Content: View>: View {
    let title: String
    let content: Content
    
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.secondary)
                .padding(.horizontal)
                .padding(.bottom, 8)
            
            VStack(spacing: 0) {
                content
            }
            .background(Color.white)
            .cornerRadius(12)
        }
    }
}

// Individual menu item
struct AccountMenuItem: View {
    let icon: String
    let title: String
    let destination: AnyView
    
    var body: some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                    .frame(width: 28)
                
                Text(title)
                    .font(.system(size: 17))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.secondary)
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

// About view
struct AboutView: View {
    var body: some View {
        List {
            Section {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Build")
                    Spacer()
                    Text("1")
                        .foregroundColor(.secondary)
                }
            }
            
            Section {
                Link(destination: URL(string: "https://mafutapass.com")!) {
                    HStack {
                        Text("Website")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
                
                Link(destination: URL(string: "https://mafutapass.com/privacy")!) {
                    HStack {
                        Text("Privacy Policy")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
                
                Link(destination: URL(string: "https://mafutapass.com/terms")!) {
                    HStack {
                        Text("Terms of Service")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Section {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Text("MafutaPass")
                            .font(.system(size: 17, weight: .semibold))
                        Text("Fuel expense tracking made easy")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical, 8)
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}


#Preview {
    AccountPage()
}

