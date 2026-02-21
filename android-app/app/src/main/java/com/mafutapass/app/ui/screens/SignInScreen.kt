package com.mafutapass.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.R
import com.mafutapass.app.auth.TokenRepository
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.ui.theme.AppTheme
import com.mafutapass.app.ui.theme.appOutlinedTextFieldColors
import com.mafutapass.app.viewmodel.NativeOAuthViewModel
import com.mafutapass.app.viewmodel.SignInViewModel
import com.mafutapass.app.viewmodel.SignUpViewModel
import kotlinx.coroutines.launch
import androidx.compose.ui.platform.LocalContext

@Composable
fun SignInOrUpScreen() {
    var showLanding by remember { mutableStateOf(true) }
    var isSignUp by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val oAuthViewModel: NativeOAuthViewModel = hiltViewModel()
    val oauthState by oAuthViewModel.oauthState.collectAsState()
    val authViewModel: com.mafutapass.app.viewmodel.AuthViewModel = hiltViewModel()
    val tokenRepository = remember { TokenRepository.getInstance(context) }

    // Reset OAuth state when screen is first shown
    LaunchedEffect(Unit) {
        android.util.Log.d("SignInScreen", "SignInScreen composed - resetting OAuth state")
        oAuthViewModel.resetState()
    }    
    // Log OAuth state changes
    LaunchedEffect(oauthState) {
        when (oauthState) {
            is com.mafutapass.app.viewmodel.NativeOAuthState.PendingUsername -> {
                android.util.Log.d("SignInScreen", "🔤 Username selection required")
            }
            is com.mafutapass.app.viewmodel.NativeOAuthState.Error -> {
                android.util.Log.e("SignInScreen", "❌ OAuth Error")
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
            val successState = oauthState as com.mafutapass.app.viewmodel.NativeOAuthState.Success
            
            // Store JWT in production token repository (AccountManager + EncryptedSharedPreferences)
            tokenRepository.storeToken(
                successState.token, successState.userId, successState.email
            )
            
            android.util.Log.d("SignInScreen", "✅ Token stored, refreshing auth state")
            
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

    // ── Landing screen ─────────────────────────────────────────────────────────
    if (showLanding) {
        KachaLandingScreen(
            onSignUp = { isSignUp = true; showLanding = false },
            onLogIn  = { isSignUp = false; showLanding = false }
        )
        return
    }

    // ── Auth form ──────────────────────────────────────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
            .systemBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Auth card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
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
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                    ) {
                        if (oauthState is com.mafutapass.app.viewmodel.NativeOAuthState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary
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
                                    color = AppTheme.colors.googleBlue,
                                    modifier = Modifier.padding(end = 12.dp)
                                )
                                Text(
                                    text = if (isSignUp) "Sign up with Google" else "Continue with Google",
                                    color = MaterialTheme.colorScheme.onSurface,
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
                        HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outline)
                        Text(
                            text = "OR",
                            modifier = Modifier.padding(horizontal = 16.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Medium
                        )
                        HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outline)
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
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium,
                            fontSize = 15.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun SignInView() {
    val context = LocalContext.current
    val viewModel: SignInViewModel = hiltViewModel()
    val authViewModel: com.mafutapass.app.viewmodel.AuthViewModel = hiltViewModel()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val state by viewModel.uiState.collectAsState()

    // Handle successful sign-in — refresh auth state to navigate
    LaunchedEffect(state) {
        if (state is SignInViewModel.SignInUiState.Success) {
            android.util.Log.d("SignInView", "✅ Sign-in successful - refreshing auth")
            authViewModel.refreshAuthState()
        }
    }

    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Sign in to Kacha",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Text(
            text = "Welcome back! Enter your credentials to continue.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
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
            colors = appOutlinedTextFieldColors(),
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
            colors = appOutlinedTextFieldColors(),
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
                containerColor = MaterialTheme.colorScheme.primary
            ),
            shape = RoundedCornerShape(8.dp),
            enabled = state !is SignInViewModel.SignInUiState.Loading && email.isNotBlank() && password.isNotBlank()
        ) {
            if (state is SignInViewModel.SignInUiState.Loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary,
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
    val viewModel: SignUpViewModel = hiltViewModel()
    val authViewModel: com.mafutapass.app.viewmodel.AuthViewModel = hiltViewModel()
    
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
            color = MaterialTheme.colorScheme.onSurface
        )

        Text(
            text = "Start your expense management journey with Kacha.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Username field
        OutlinedTextField(
            value = username,
            onValueChange = { newValue ->
                // Strip whitespace and special characters - only allow alphanumeric, underscore, hyphen
                username = newValue.filter { it.isLetterOrDigit() || it == '_' || it == '-' }
            },
                    label = { Text("Username") },
                    placeholder = { Text("Choose a username") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = appOutlinedTextFieldColors(),
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
                    colors = appOutlinedTextFieldColors(),
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
                    colors = appOutlinedTextFieldColors(),
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
                    colors = appOutlinedTextFieldColors(),
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
                    colors = appOutlinedTextFieldColors(),
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
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(8.dp),
                    enabled = state !is SignUpViewModel.SignUpUiState.Loading && 
                              username.isNotBlank() && email.isNotBlank() && password.isNotBlank() &&
                              firstName.isNotBlank() && lastName.isNotBlank()
                ) {
                    if (state is SignUpViewModel.SignUpUiState.Loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
        }
}

// ── Kacha Landing Screen ────────────────────────────────────────────────────
@Composable
fun KachaLandingScreen(
    onSignUp: () -> Unit,
    onLogIn: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0A1729),
                        Color(0xFF082047)
                    )
                )
            )
            .systemBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // ── Hero ───────────────────────────────────────────────────────
            Spacer(modifier = Modifier.weight(1f))

            Image(
                painter = painterResource(id = R.drawable.kacha_logo),
                contentDescription = "Kacha Logo",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .size(220.dp)
                    .shadow(
                        elevation = 24.dp,
                        shape = RoundedCornerShape(20.dp),
                        ambientColor = Color(0x5587D4F4),
                        spotColor = Color(0x5587D4F4)
                    )
                    .clip(RoundedCornerShape(20.dp))
            )

            Spacer(modifier = Modifier.height(32.dp))

            // ── Text block ─────────────────────────────────────────────────
            Text(
                text = "Kacha",
                fontSize = 38.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Smart expense tracking\nfor modern teams.",
                fontSize = 17.sp,
                color = Color.White.copy(alpha = 0.65f),
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
            )

            Spacer(modifier = Modifier.weight(1.2f))

            // ── Buttons ────────────────────────────────────────────────────
            Button(
                onClick = onSignUp,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text(
                    text = "Sign up",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = onLogIn,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Color.White.copy(alpha = 0.08f)
                ),
                border = BorderStroke(1.5.dp, Color.White.copy(alpha = 0.25f))
            ) {
                Text(
                    text = "Log in",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Tappable terms & privacy links ─────────────────────────────
            val uriHandler = LocalUriHandler.current
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "By continuing you agree to our ",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.38f)
                )
                Text(
                    text = "Terms",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.65f),
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier.clickable {
                        uriHandler.openUri("https://kachalabs.com/terms-of-service")
                    }
                )
                Text(
                    text = " & ",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.38f)
                )
                Text(
                    text = "Privacy Policy",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.65f),
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier.clickable {
                        uriHandler.openUri("https://kachalabs.com/privacy-policy")
                    }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}