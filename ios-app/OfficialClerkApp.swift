import SwiftUI
import Clerk

@main
struct MafutaPassApp: App {
    @State private var clerk = Clerk.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.clerk, clerk)
                .task {
                    clerk.configure(publishableKey: "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k")
                    try? await clerk.load()
                }
        }
    }
}

struct ContentView: View {
    @Environment(\.clerk) private var clerk
    @State private var authIsPresented = false
    
    var body: some View {
        VStack {
            if clerk.user != nil {
                MainAppView()
            } else {
                WelcomeView(authIsPresented: $authIsPresented)
            }
        }
        .sheet(isPresented: $authIsPresented) {
            AuthView()
        }
    }
}

struct WelcomeView: View {
    @Binding var authIsPresented: Bool
    
    var body: some View {
        ZStack {
            Color(.systemGroupedBackground)
                .ignoresSafeArea()
            
            VStack(spacing: 32) {
                Spacer()
                
                Image(systemName: "cart.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.green, .green.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                VStack(spacing: 8) {
                    Text("MafutaPass")
                        .font(.largeTitle.bold())
                    
                    Text("Expense tracking made simple")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(action: {
                    authIsPresented = true
                }) {
                    Text("Sign In")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                colors: [.green, .green.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 32)
                
                Spacer()
                    .frame(height: 60)
            }
        }
    }
}

struct MainAppView: View {
    var body: some View {
        TabView {
            HomePage()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
            
            ReportsPage()
                .tabItem {
                    Label("Reports", systemImage: "doc.text.fill")
                }
            
            CameraView()
                .tabItem {
                    Label("Scan", systemImage: "camera.fill")
                }
            
            AccountTab()
                .tabItem {
                    Label("Account", systemImage: "person.fill")
                }
        }
        .tint(.green)
    }
}

struct AccountTab: View {
    @Environment(\.clerk) private var clerk
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack(spacing: 16) {
                        UserButton()
                            .frame(width: 60, height: 60)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(clerk.user?.fullName ?? "User")
                                .font(.headline)
                            Text(clerk.user?.primaryEmailAddress?.emailAddress ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                Section("Settings") {
                    NavigationLink(destination: Text("Profile")) {
                        Label("Profile", systemImage: "person.circle")
                    }
                    NavigationLink(destination: Text("Preferences")) {
                        Label("Preferences", systemImage: "slider.horizontal.3")
                    }
                }
                
                Section("Workspace") {
                    NavigationLink(destination: Text("Workspaces")) {
                        Label("Workspaces", systemImage: "building.2")
                    }
                }
            }
            .navigationTitle("Account")
        }
    }
}
