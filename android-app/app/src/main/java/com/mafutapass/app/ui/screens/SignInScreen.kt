package com.mafutapass.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.clerk.api.Clerk
import com.clerk.api.sso.OAuthProvider
import com.clerk.api.sso.ResultType
import com.clerk.api.signin.SignIn
import com.clerk.api.signup.SignUp
import com.clerk.api.network.serialization.onSuccess
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.errorMessage
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.NativeOAuthViewModel
import com.mafutapass.app.viewmodel.SignInViewModel
import com.mafutapass.app.viewmodel.SignUpViewModel
import kotlinx.coroutines.launch
import androidx.compose.ui.platform.LocalContext

@Composable
fun SignInOrUpScreen() {
    var isSignUp by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val oAuthViewModel: NativeOAuthViewModel = viewModel()
    val oauthState by oAuthViewModel.oauthState.collectAsState()
    val authViewModel: com.mafutapass.app.viewmodel.AuthViewModel = viewModel()

    // Reset OAuth state when screen is first shown
    LaunchedEffect(Unit) {
        android.util.Log.d("SignInScreen", "SignInScreen composed - resetting OAuth state")
        oAuthViewModel.resetState()
    }    
    // Log OAuth state changes
    LaunchedEffect(oauthState) {
        android.util.Log.d("SignInScreen", "OAuth state changed to: ${oauthState::class.simpleName}")
        
        when (oauthState) {
            is com.mafutapass.app.viewmodel.NativeOAuthState.PendingUsername -> {
                val pendingState = (oauthState as com.mafutapass.app.viewmodel.NativeOAuthState.PendingUsername)
                android.util.Log.d("SignInScreen", "🔤 Username selection required for: ${pendingState.email}")
            }
            is com.mafutapass.app.viewmodel.NativeOAuthState.Error -> {
                val errorMsg = (oauthState as com.mafutapass.app.viewmodel.NativeOAuthState.Error).message
                android.util.Log.e("SignInScreen", "❌ OAuth Error: $errorMsg")
            }
            is com.mafutapass.app.viewmodel.NativeOAuthState.Loading -> {
                android.util.Log.d("SignInScreen", "⏳ OAuth Loading...")
            }
            is com.mafutapass.app.viewmodel.NativeOAuthState.Idle -> {
                android.util.Log.d("SignInScreen", "💤 OAuth Idle")
            }
            else -> {}
        }
    }
    // Handle OAuth success - Store the token and trigger sign-in
    LaunchedEffect(oauthState) {
        if (oauthState is com.mafutapass.app.viewmodel.NativeOAuthState.Success) {
            android.util.Log.d("SignInScreen", "========== OAuth Success Detected ==========")
            
            val successState = oauthState as com.mafutapass.app.viewmodel.NativeOAuthState.Success
            val token = successState.token
            val userId = successState.userId
            val email = successState.email
            val supabaseToken = successState.supabaseToken
            val isNewUser = successState.isNewUser
            val firstName = successState.firstName
            val lastName = successState.lastName
            
            android.util.Log.d("SignInScreen", "Is new user: $isNewUser")
            android.util.Log.d("SignInScreen", "Name: $firstName $lastName")
            
            // Store the tokens and user info for API calls using commit() for synchronous write
            val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
            val stored = prefs.edit().apply {
                putString("session_token", token)
                putString("user_id", userId)
                putString("user_email", email)
                putBoolean("is_new_user", isNewUser)
                if (firstName != null) {
                    putString("first_name", firstName)
                }
                if (lastName != null) {
                    putString("last_name", lastName)
                }
                if (supabaseToken != null) {
                    putString("supabase_token", supabaseToken)
                }
            }.commit()  // Use commit() for immediate write
            
            android.util.Log.d("SignInScreen", "Tokens stored: $stored")
            android.util.Log.d("SignInScreen", "User: $email (ID: $userId)")
            android.util.Log.d("SignInScreen", "Clerk token: ${token.take(30)}...")
            if (supabaseToken != null) {
                android.util.Log.d("SignInScreen", "Supabase token: ${supabaseToken.take(30)}...")
            }
            
            // Refresh auth state to navigate to main app (or profile setup if new user)
            authViewModel.refreshAuthState()
            
            // Reset OAuth state after handling
            oAuthViewModel.resetState()
        }
    }

    // Show username setup screen if pending username selection
    if (oauthState is com.mafutapass.app.viewmodel.NativeOAuthState.PendingUsername) {
        val pendingState = oauthState as com.mafutapass.app.viewmodel.NativeOAuthState.PendingUsername
        
        GoogleUsernameSetupScreen(
            email = pendingState.email,
            firstName = pendingState.firstName,
            lastName = pendingState.lastName,
            onComplete = { username ->
                android.util.Log.d("SignInScreen", "Username selected: $username")
                oAuthViewModel.completeGoogleSignup(username, pendingState.pendingSignupToken)
            },
            pending = oauthState is com.mafutapass.app.viewmodel.NativeOAuthState.Loading,
            errorMessage = (oauthState as? com.mafutapass.app.viewmodel.NativeOAuthState.Error)?.message
        )
        return
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFFECFDF5),
                        Color(0xFFD1FAE5),
                        Color(0xFFECFDF5)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App branding
            Text(
                text = "MafutaPass",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = Emerald600,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                text = "Expense Management Made Easy",
                style = MaterialTheme.typography.bodyLarge,
                color = Gray600,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 48.dp)
            )

            // Auth card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Google Sign-In Button (using Credential Manager + Supabase ID token auth)
                    OutlinedButton(
                        onClick = {
                            android.util.Log.d("SignInScreen", "🔘 Google Sign-In button clicked (Sign ${if (isSignUp) "Up" else "In"})")
                            oAuthViewModel.signInWithGoogle(context)
                        },
                        enabled = oauthState !is com.mafutapass.app.viewmodel.NativeOAuthState.Loading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = Color.White
                        ),
                        border = BorderStroke(1.dp, Gray300)
                    ) {
                        if (oauthState is com.mafutapass.app.viewmodel.NativeOAuthState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = Emerald600
                            )
                        } else {
                            Row(
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "G",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF4285F4),
                                    modifier = Modifier.padding(end = 12.dp)
                                )
                                Text(
                                    text = if (isSignUp) "Sign up with Google" else "Continue with Google",
                                    color = Gray700,
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 15.sp
                                )
                            }
                        }
                    }
                    
                    // Show error if OAuth failed
                    if (oauthState is com.mafutapass.app.viewmodel.NativeOAuthState.Error) {
                        Text(
                            text = (oauthState as com.mafutapass.app.viewmodel.NativeOAuthState.Error).message,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Divider with "OR"
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Gray300)
                        Text(
                            text = "OR",
                            modifier = Modifier.padding(horizontal = 16.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray500,
                            fontWeight = FontWeight.Medium
                        )
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Gray300)
                    }

                    if (isSignUp) {
                        SignUpView(onSwitchToSignIn = { isSignUp = false })
                    } else {
                        SignInView()
                    }

                    // Toggle button
                    TextButton(
                        onClick = { isSignUp = !isSignUp },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = if (isSignUp) "Already have an account? Sign in" else "Don't have an account? Sign up",
                            color = Emerald600,
                            fontWeight = FontWeight.Medium,
                            fontSize = 15.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Terms and privacy
            Text(
                text = "By continuing, you agree to our Terms of Service and Privacy Policy",
                style = MaterialTheme.typography.bodySmall,
                color = Gray500,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
    }
}

@Composable
fun SignInView(viewModel: SignInViewModel = viewModel()) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val state by viewModel.uiState.collectAsState()

    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Sign in to MafutaPass",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Gray900
        )

        Text(
            text = "Welcome back! Enter your credentials to continue.",
            style = MaterialTheme.typography.bodyMedium,
            color = Gray600
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Email field
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email address") },
            placeholder = { Text("you@example.com") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Emerald600,
                focusedLabelColor = Emerald600,
                cursorColor = Emerald600
            ),
            enabled = state !is SignInViewModel.SignInUiState.Loading
        )

        // Password field
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            placeholder = { Text("••••••••") },
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                        contentDescription = if (passwordVisible) "Hide password" else "Show password"
                    )
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Emerald600,
                focusedLabelColor = Emerald600,
                cursorColor = Emerald600
            ),
            enabled = state !is SignInViewModel.SignInUiState.Loading
        )

        // Error message
        if (state is SignInViewModel.SignInUiState.Error) {
            Text(
                text = (state as SignInViewModel.SignInUiState.Error).message,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Sign-in button
        Button(
            onClick = { 
                if (email.isNotBlank() && password.isNotBlank()) {
                    viewModel.signIn(email, password)
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Emerald600
            ),
            shape = RoundedCornerShape(8.dp),
            enabled = state !is SignInViewModel.SignInUiState.Loading && email.isNotBlank() && password.isNotBlank()
        ) {
            if (state is SignInViewModel.SignInUiState.Loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    text = "Continue",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun SignUpView(onSwitchToSignIn: () -> Unit = {}) {
    val context = LocalContext.current
    val viewModel: SignUpViewModel = viewModel(
        factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return SignUpViewModel(context.applicationContext as android.app.Application) as T
            }
        }
    )
    val authViewModel: com.mafutapass.app.viewmodel.AuthViewModel = viewModel()
    
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val state by viewModel.uiState.collectAsState()

    // Handle successful sign-up or account creation
    LaunchedEffect(state) {
        when (state) {
            is SignUpViewModel.SignUpUiState.Success -> {
                android.util.Log.d("SignUpView", "✅ Sign up successful - refreshing auth")
                authViewModel.refreshAuthState()
            }
            else -> {}
        }
    }

    // Email verification not needed - Backend SDK auto-verifies emails

    // No CAPTCHA needed - Backend SDK handles sign-up securely

    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Create your account",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Gray900
        )

        Text(
            text = "Start your expense management journey with MafutaPass.",
            style = MaterialTheme.typography.bodyMedium,
            color = Gray600
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Username field
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
                    label = { Text("Username") },
                    placeholder = { Text("Choose a username") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald600,
                        focusedLabelColor = Emerald600,
                        cursorColor = Emerald600
                    ),
                    enabled = state !is SignUpViewModel.SignUpUiState.Loading
                )

                // First name field
                OutlinedTextField(
                    value = firstName,
                    onValueChange = { firstName = it },
                    label = { Text("First name") },
                    placeholder = { Text("Your first name") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald600,
                        focusedLabelColor = Emerald600,
                        cursorColor = Emerald600
                    ),
                    enabled = state !is SignUpViewModel.SignUpUiState.Loading
                )

                // Last name field
                OutlinedTextField(
                    value = lastName,
                    onValueChange = { lastName = it },
                    label = { Text("Last name") },
                    placeholder = { Text("Your last name") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald600,
                        focusedLabelColor = Emerald600,
                        cursorColor = Emerald600
                    ),
                    enabled = state !is SignUpViewModel.SignUpUiState.Loading
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email address") },
                    placeholder = { Text("you@example.com") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald600,
                        focusedLabelColor = Emerald600,
                        cursorColor = Emerald600
                    ),
                    enabled = state !is SignUpViewModel.SignUpUiState.Loading
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    placeholder = { Text("••••••••") },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                contentDescription = if (passwordVisible) "Hide password" else "Show password"
                            )
                        }
                    },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald600,
                        focusedLabelColor = Emerald600,
                        cursorColor = Emerald600
                    ),
                    enabled = state !is SignUpViewModel.SignUpUiState.Loading
                )

                if (state is SignUpViewModel.SignUpUiState.Error) {
                    Text(
                        text = (state as SignUpViewModel.SignUpUiState.Error).message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = { 
                        if (username.isNotBlank() && email.isNotBlank() && password.isNotBlank() && 
                            firstName.isNotBlank() && lastName.isNotBlank()) {
                            android.util.Log.d("SignUpView", "🚀 Signing up via backend (no CAPTCHA required)")
                            viewModel.signUp(email, password, username, firstName, lastName)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                    shape = RoundedCornerShape(8.dp),
                    enabled = state !is SignUpViewModel.SignUpUiState.Loading && 
                              username.isNotBlank() && email.isNotBlank() && password.isNotBlank() &&
                              firstName.isNotBlank() && lastName.isNotBlank()
                ) {
                    if (state is SignUpViewModel.SignUpUiState.Loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
        }
    }
