import SwiftUI
import Clerk

@main
struct MafutaPassApp: App {
    @State private var clerk = Clerk.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.clerk, clerk)
                .onAppear {
                    clerk.configure(publishableKey: "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k")
                }
                .task {
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

// MainAppView is now in Views/MainAppView.swift

struct CameraView: View {
    var body: some View {
        Text("Camera placeholder")
    }
}

struct HomePage: View {
    var body: some View {
        Text("Home placeholder")
    }
}
