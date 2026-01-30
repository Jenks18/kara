import SwiftUI

// MARK: - Sign In View (Clerk-based)
struct ClerkSignInView: View {
    @StateObject private var authManager = ClerkAuthManager.shared
    @State private var email = ""
    @State private var password = ""
    @State private var showError = false
    @FocusState private var focusedField: Field?
    
    enum Field {
        case email, password
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Logo/Header
                        VStack(spacing: 12) {
                            Image(systemName: "cart.fill")
                                .font(.system(size: 60))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [.green, .green.opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            
                            Text("Welcome Back")
                                .font(.largeTitle.bold())
                            
                            Text("Sign in to continue")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 40)
                        
                        // Form Fields
                        VStack(spacing: 16) {
                            // Email Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundColor(.primary)
                                
                                TextField("your@email.com", text: $email)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .focused($focusedField, equals: .email)
                                    .padding()
                                    .background(Color(.secondarySystemGroupedBackground))
                                    .cornerRadius(12)
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundColor(.primary)
                                
                                SecureField("Enter password", text: $password)
                                    .textContentType(.password)
                                    .focused($focusedField, equals: .password)
                                    .padding()
                                    .background(Color(.secondarySystemGroupedBackground))
                                    .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)
                        
                        // Error Message
                        if let error = authManager.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding(.horizontal)
                        }
                        
                        // Sign In Button
                        Button(action: {
                            Task {
                                await signIn()
                            }
                        }) {
                            HStack {
                                if authManager.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Sign In")
                                        .fontWeight(.semibold)
                                }
                            }
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
                        .disabled(authManager.isLoading || email.isEmpty || password.isEmpty)
                        .padding(.horizontal)
                        
                        // Sign Up Link
                        NavigationLink(destination: ClerkSignUpView()) {
                            HStack(spacing: 4) {
                                Text("Don't have an account?")
                                    .foregroundColor(.secondary)
                                Text("Sign Up")
                                    .foregroundColor(.green)
                                    .fontWeight(.semibold)
                            }
                            .font(.subheadline)
                        }
                        .padding(.top, 8)
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationBarHidden(true)
        }
    }
    
    private func signIn() async {
        focusedField = nil
        let success = await authManager.signIn(email: email, password: password)
        if !success {
            showError = true
        }
    }
}

// MARK: - Sign Up View (Clerk-based)
struct ClerkSignUpView: View {
    @StateObject private var authManager = ClerkAuthManager.shared
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @FocusState private var focusedField: Field?
    @Environment(\.presentationMode) var presentationMode
    
    enum Field {
        case firstName, lastName, email, password, confirm
    }
    
    var body: some View {
        ZStack {
            Color(.systemGroupedBackground)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.fill.badge.plus")
                            .font(.system(size: 60))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.green, .green.opacity(0.7)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        
                        Text("Create Account")
                            .font(.largeTitle.bold())
                        
                        Text("Join MafutaPass today")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 40)
                    
                    // Form Fields
                    VStack(spacing: 16) {
                        // First Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("First Name")
                                .font(.subheadline.weight(.medium))
                            TextField("John", text: $firstName)
                                .textContentType(.givenName)
                                .focused($focusedField, equals: .firstName)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        // Last Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Last Name")
                                .font(.subheadline.weight(.medium))
                            TextField("Doe", text: $lastName)
                                .textContentType(.familyName)
                                .focused($focusedField, equals: .lastName)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        // Email
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.subheadline.weight(.medium))
                            TextField("your@email.com", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .focused($focusedField, equals: .email)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        // Password
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.subheadline.weight(.medium))
                            SecureField("Minimum 8 characters", text: $password)
                                .textContentType(.newPassword)
                                .focused($focusedField, equals: .password)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        // Confirm Password
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Confirm Password")
                                .font(.subheadline.weight(.medium))
                            SecureField("Re-enter password", text: $confirmPassword)
                                .textContentType(.newPassword)
                                .focused($focusedField, equals: .confirm)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Error Message
                    if let error = authManager.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }
                    
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }
                    
                    // Sign Up Button
                    Button(action: {
                        Task {
                            await signUp()
                        }
                    }) {
                        HStack {
                            if authManager.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Create Account")
                                    .fontWeight(.semibold)
                            }
                        }
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
                    .disabled(authManager.isLoading || !isFormValid)
                    .padding(.horizontal)
                    
                    // Back to Sign In
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack(spacing: 4) {
                            Text("Already have an account?")
                                .foregroundColor(.secondary)
                            Text("Sign In")
                                .foregroundColor(.green)
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                    }
                    .padding(.top, 8)
                }
                .padding(.bottom, 40)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private var isFormValid: Bool {
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        password.count >= 8 &&
        password == confirmPassword
    }
    
    private func signUp() async {
        guard isFormValid else {
            errorMessage = "Please fill all fields correctly"
            return
        }
        
        if password != confirmPassword {
            errorMessage = "Passwords don't match"
            return
        }
        
        focusedField = nil
        errorMessage = ""
        
        let success = await authManager.signUp(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        )
        
        if success {
            presentationMode.wrappedValue.dismiss()
        }
    }
}
