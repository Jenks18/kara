import SwiftUI
import ClerkSDK

@main
struct MafutaPassApp: App {
    var body: some Scene {
        WindowGroup {
            ClerkProviderView()
        }
    }
}

// Clerk Provider - wraps entire app
struct ClerkProviderView: View {
    @StateObject private var clerk = Clerk.shared
    
    init() {
        // Configure Clerk
        Clerk.configure(publishableKey: "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k")
    }
    
    var body: some View {
        Group {
            if clerk.isLoaded {
                if clerk.session != nil {
                    // User is signed in
                    AuthenticatedApp()
                } else {
                    // User is NOT signed in - show Clerk's sign in
                    ClerkAuthView()
                }
            } else {
                // Loading Clerk
                ProgressView("Loading...")
            }
        }
    }
}

// Clerk's Native Authentication View
struct ClerkAuthView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Spacer()
                
                // Logo
                Image(systemName: "cart.fill")
                    .font(.system(size: 70))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.green, .green.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                Text("MafutaPass")
                    .font(.largeTitle.bold())
                
                Text("Expense tracking made simple")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                // Clerk Sign In Component
                SignInWithClerkButton()
                    .padding(.horizontal)
                
                // Clerk Sign Up Component  
                SignUpWithClerkButton()
                    .padding(.horizontal)
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
}

// Clerk Sign In Button
struct SignInWithClerkButton: View {
    @State private var showingSignIn = false
    
    var body: some View {
        Button(action: {
            showingSignIn = true
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
        .sheet(isPresented: $showingSignIn) {
            ClerkSignInView()
        }
    }
}

// Clerk Sign Up Button
struct SignUpWithClerkButton: View {
    @State private var showingSignUp = false
    
    var body: some View {
        Button(action: {
            showingSignUp = true
        }) {
            Text("Create Account")
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemBackground))
                .foregroundColor(.green)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.green, lineWidth: 2)
                )
                .cornerRadius(12)
        }
        .sheet(isPresented: $showingSignUp) {
            ClerkSignUpView()
        }
    }
}

// Native Clerk Sign In View
struct ClerkSignInView: View {
    @Environment(\.dismiss) var dismiss
    @State private var emailAddress = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Welcome Back")
                        .font(.largeTitle.bold())
                        .padding(.top, 40)
                    
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.subheadline.weight(.medium))
                            
                            TextField("your@email.com", text: $emailAddress)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.subheadline.weight(.medium))
                            
                            SecureField("Enter password", text: $password)
                                .textContentType(.password)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }
                    
                    Button(action: signIn) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Sign In")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || emailAddress.isEmpty || password.isEmpty)
                    .padding(.horizontal)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationBarItems(trailing: Button("Cancel") { dismiss() })
        }
    }
    
    private func signIn() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                // Use Clerk SDK for sign in
                try await Clerk.shared.signIn(
                    strategy: .password(emailAddress: emailAddress, password: password)
                )
                
                await MainActor.run {
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

// Native Clerk Sign Up View
struct ClerkSignUpView: View {
    @Environment(\.dismiss) var dismiss
    @State private var emailAddress = ""
    @State private var password = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Create Account")
                        .font(.largeTitle.bold())
                        .padding(.top, 40)
                    
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("First Name")
                                .font(.subheadline.weight(.medium))
                            
                            TextField("John", text: $firstName)
                                .textContentType(.givenName)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Last Name")
                                .font(.subheadline.weight(.medium))
                            
                            TextField("Doe", text: $lastName)
                                .textContentType(.familyName)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.subheadline.weight(.medium))
                            
                            TextField("your@email.com", text: $emailAddress)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.subheadline.weight(.medium))
                            
                            SecureField("Minimum 8 characters", text: $password)
                                .textContentType(.newPassword)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }
                    
                    Button(action: signUp) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Create Account")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || !isValid)
                    .padding(.horizontal)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationBarItems(trailing: Button("Cancel") { dismiss() })
        }
    }
    
    private var isValid: Bool {
        !emailAddress.isEmpty && !password.isEmpty && password.count >= 8 && !firstName.isEmpty && !lastName.isEmpty
    }
    
    private func signUp() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                // Use Clerk SDK for sign up
                try await Clerk.shared.signUp(
                    emailAddress: emailAddress,
                    password: password,
                    firstName: firstName,
                    lastName: lastName
                )
                
                await MainActor.run {
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

// Authenticated App (after Clerk sign in)
struct AuthenticatedApp: View {
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
            
            ClerkAccountView()
                .tabItem {
                    Label("Account", systemImage: "person.fill")
                }
        }
        .tint(.green)
    }
}

// Account View using Clerk
struct ClerkAccountView: View {
    @StateObject private var clerk = Clerk.shared
    @State private var showSignOutAlert = false
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack(spacing: 16) {
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
                            
                            if let imageUrl = clerk.user?.profileImageUrl,
                               let url = URL(string: imageUrl) {
                                AsyncImage(url: url) { image in
                                    image.resizable().scaledToFill()
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
                
                Section {
                    Button(action: {
                        showSignOutAlert = true
                    }) {
                        Label("Sign Out", systemImage: "arrow.right.square")
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Account")
            .alert("Sign Out", isPresented: $showSignOutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    Task {
                        try? await clerk.signOut()
                    }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}
