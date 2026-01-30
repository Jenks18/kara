import SwiftUI

struct SignInView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var focusedField: Field?
    
    enum Field {
        case email, password
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                // iOS native background
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 32) {
                        // Logo/Header
                        VStack(spacing: 16) {
                            Image(systemName: "fuelpump.circle.fill")
                                .font(.system(size: 80))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [
                                            Color(red: 0.2, green: 0.7, blue: 0.4),
                                            Color(red: 0.15, green: 0.6, blue: 0.35)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .shadow(color: Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.3), radius: 12)
                            
                            Text("MafutaPass")
                                .font(.system(size: 36, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                            
                            Text("Track your fuel expenses")
                                .font(.system(size: 17))
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 40)
                        
                        // Sign In Form
                        VStack(spacing: 20) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.secondary)
                                
                                TextField("your@email.com", text: $email)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .focused($focusedField, equals: .email)
                                    .font(.system(size: 17))
                                    .padding(16)
                                    .background(Color(UIColor.secondarySystemGroupedBackground))
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(focusedField == .email ? 
                                                Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                                Color.clear, lineWidth: 2)
                                    )
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.secondary)
                                
                                SecureField("Enter your password", text: $password)
                                    .textContentType(.password)
                                    .focused($focusedField, equals: .password)
                                    .font(.system(size: 17))
                                    .padding(16)
                                    .background(Color(UIColor.secondarySystemGroupedBackground))
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(focusedField == .password ? 
                                                Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                                Color.clear, lineWidth: 2)
                                    )
                            }
                            
                            // Error Message
                            if let error = errorMessage {
                                HStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 14))
                                    
                                    Text(error)
                                        .font(.system(size: 14, weight: .medium))
                                }
                                .foregroundColor(.red)
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(10)
                            }
                            
                            // Sign In Button
                            Button(action: handleSignIn) {
                                if isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("Sign In")
                                        .font(.system(size: 18, weight: .bold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(height: 56)
                            .frame(maxWidth: .infinity)
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.2, green: 0.7, blue: 0.4),
                                        Color(red: 0.15, green: 0.6, blue: 0.35)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(14)
                            .shadow(color: Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.3), radius: 12, x: 0, y: 6)
                            .disabled(isLoading || email.isEmpty || password.isEmpty)
                            .opacity((isLoading || email.isEmpty || password.isEmpty) ? 0.6 : 1)
                            
                            // Forgot Password
                            Button("Forgot Password?") {
                                // TODO: Implement forgot password
                            }
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                        }
                        .padding(.horizontal, 24)
                        
                        // Sign Up Link
                        HStack(spacing: 4) {
                            Text("Don't have an account?")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                            
                            NavigationLink("Sign Up") {
                                SignUpView()
                            }
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                        }
                        .padding(.top, 16)
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationBarHidden(true)
        }
    }
    
    private func handleSignIn() {
        focusedField = nil
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await authManager.signIn(email: email, password: password)
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

struct SignUpView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var focusedField: Field?
    
    enum Field {
        case name, email, password, confirmPassword
    }
    
    var body: some View {
        ZStack {
            Color(UIColor.systemGroupedBackground)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 12) {
                        Text("Create Account")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.primary)
                        
                        Text("Join MafutaPass to track your expenses")
                            .font(.system(size: 16))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 24)
                    
                    // Sign Up Form
                    VStack(spacing: 20) {
                        // Name Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Full Name")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.secondary)
                            
                            TextField("John Doe", text: $name)
                                .textContentType(.name)
                                .focused($focusedField, equals: .name)
                                .font(.system(size: 17))
                                .padding(16)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(focusedField == .name ? 
                                            Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                            Color.clear, lineWidth: 2)
                                )
                        }
                        
                        // Email Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.secondary)
                            
                            TextField("your@email.com", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .focused($focusedField, equals: .email)
                                .font(.system(size: 17))
                                .padding(16)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(focusedField == .email ? 
                                            Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                            Color.clear, lineWidth: 2)
                                )
                        }
                        
                        // Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.secondary)
                            
                            SecureField("At least 8 characters", text: $password)
                                .textContentType(.newPassword)
                                .focused($focusedField, equals: .password)
                                .font(.system(size: 17))
                                .padding(16)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(focusedField == .password ? 
                                            Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                            Color.clear, lineWidth: 2)
                                )
                        }
                        
                        // Confirm Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Confirm Password")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.secondary)
                            
                            SecureField("Re-enter password", text: $confirmPassword)
                                .textContentType(.newPassword)
                                .focused($focusedField, equals: .confirmPassword)
                                .font(.system(size: 17))
                                .padding(16)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(focusedField == .confirmPassword ? 
                                            Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                            Color.clear, lineWidth: 2)
                                )
                        }
                        
                        // Error Message
                        if let error = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 14))
                                
                                Text(error)
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .foregroundColor(.red)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(10)
                        }
                        
                        // Sign Up Button
                        Button(action: handleSignUp) {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Create Account")
                                    .font(.system(size: 18, weight: .bold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(height: 56)
                        .frame(maxWidth: .infinity)
                        .background(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.2, green: 0.7, blue: 0.4),
                                    Color(red: 0.15, green: 0.6, blue: 0.35)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(14)
                        .shadow(color: Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.3), radius: 12, x: 0, y: 6)
                        .disabled(isLoading || !isFormValid)
                        .opacity((isLoading || !isFormValid) ? 0.6 : 1)
                        
                        // Terms
                        Text("By signing up, you agree to our Terms of Service and Privacy Policy")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 16)
                    }
                    .padding(.horizontal, 24)
                }
                .padding(.bottom, 40)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private var isFormValid: Bool {
        !name.isEmpty && 
        !email.isEmpty && 
        email.contains("@") &&
        password.count >= 8 && 
        password == confirmPassword
    }
    
    private func handleSignUp() {
        focusedField = nil
        
        guard password == confirmPassword else {
            errorMessage = "Passwords don't match"
            return
        }
        
        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await authManager.signUp(email: email, password: password, name: name)
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

#Preview("Sign In") {
    SignInView()
        .environmentObject(AuthManager.shared)
}

#Preview("Sign Up") {
    SignUpView()
        .environmentObject(AuthManager.shared)
}
