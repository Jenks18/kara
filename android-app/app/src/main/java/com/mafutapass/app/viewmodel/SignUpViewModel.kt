package com.mafutapass.app.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.auth.ClerkAuthManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SignUpViewModel(application: Application) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow<SignUpUiState>(SignUpUiState.SignedOut)
    val uiState = _uiState.asStateFlow()
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun signUp(email: String, password: String, username: String, firstName: String, lastName: String) {
        viewModelScope.launch {
            _uiState.value = SignUpUiState.Loading
            
            try {
                Log.d("SignUpViewModel", "📱 Signing up via backend (bypasses CAPTCHA): $email")
                
                // Use backend route - no CAPTCHA needed
                val result = ClerkAuthManager.signUpViaBackend(
                    email = email,
                    password = password,
                    username = username,
                    firstName = firstName,
                    lastName = lastName
                )
                
                if (!result.success) {
                    Log.e("SignUpViewModel", "❌ Sign up failed: ${result.error}")
                    _uiState.value = SignUpUiState.Error(result.error ?: "Sign up failed")
                    return@launch
                }
                
                Log.d("SignUpViewModel", "✅ Account created successfully!")
                
                // Get userId from sign-up response
                val userId = result.userId
                if (userId != null) {
                    Log.d("SignUpViewModel", "🔑 Signing in via backend: $email")
                    
                    // Sign in via backend proxy (performs Clerk Frontend API sign-in)
                    val sessionResult = ClerkAuthManager.signInViaBackend(email, password)
                    
                    if (!sessionResult.success || sessionResult.token == null) {
                        Log.e("SignUpViewModel", "❌ Session creation failed: ${sessionResult.error}")
                        _uiState.value = SignUpUiState.Error(sessionResult.error ?: "Authentication failed")
                        return@launch
                    }
                    
                    val jwt = sessionResult.token!!
                    Log.d("SignUpViewModel", "✅ JWT received, creating profile...")
                    
                    // Create Supabase profile
                    createSupabaseProfile(jwt, email, username, firstName, lastName)
                    
                    // Store token
                    val prefs = getApplication<Application>().getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
                    prefs.edit().apply {
                        putString("session_token", jwt)
                        putString("user_email", email)
                        putBoolean("is_new_user", false)
                    }.commit()
                    
                    Log.d("SignUpViewModel", "✅ Sign-up complete - automatically signed in!")
                    _uiState.value = SignUpUiState.Success
                } else {
                    // Fallback: Account created but needs manual sign-in
                    Log.e("SignUpViewModel", "⚠️ No userId received - sign up incomplete")
                    _uiState.value = SignUpUiState.Error("Sign up incomplete")
                }
                
            } catch (e: Exception) {
                Log.e("SignUpViewModel", "❌ Sign up error: ${e.message}", e)
                _uiState.value = SignUpUiState.Error("Network error: ${e.message}")
            }
        }
    }

    fun verifyEmail(signUpId: String, code: String, email: String, username: String, firstName: String, lastName: String) {
        viewModelScope.launch {
            _uiState.value = SignUpUiState.Loading
            
            try {
                Log.d("SignUpViewModel", "Verifying email code via backend")
                
                // Verify with backend (uses Clerk Frontend API internally)
                val result = ClerkAuthManager.verifyEmailCode(email, code)
                
                if (!result.success) {
                    Log.e("SignUpViewModel", "❌ Verification failed: ${result.error}")
                    _uiState.value = SignUpUiState.Error(result.error ?: "Invalid code")
                    return@launch
                }
                
                val token = result.token
                if (token == null) {
                    Log.e("SignUpViewModel", "❌ No token after verification")
                    _uiState.value = SignUpUiState.Error("Verification incomplete")
                    return@launch
                }
                
                // Create Supabase profile in background
                createSupabaseProfile(token, email, username, firstName, lastName)
                
                // Store token
                val prefs = getApplication<Application>().getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
                prefs.edit().apply {
                    putString("session_token", token)
                    putString("user_email", email)
                    putBoolean("is_new_user", false)
                }.commit()
                
                Log.d("SignUpViewModel", "✅ Email verified and signed in!")
                _uiState.value = SignUpUiState.Success
                
            } catch (e: Exception) {
                Log.e("SignUpViewModel", "❌ Verification error: ${e.message}", e)
                _uiState.value = SignUpUiState.Error("Verification failed: ${e.message}")
            }
        }
    }
    
    private suspend fun createSupabaseProfile(
        token: String,
        email: String,
        username: String,
        firstName: String,
        lastName: String
    ) {
        try {
            Log.d("SignUpViewModel", "📝 Creating Supabase profile for: $email")
            Log.d("SignUpViewModel", "Token length: ${token.length}, first 30 chars: ${token.take(30)}")
            
            val json = JSONObject().apply {
                put("token", token)
                put("email", email)
                put("username", username)
                put("firstName", firstName)
                put("lastName", lastName)
            }
            
            Log.d("SignUpViewModel", "Request body: ${json.toString()}")
            
            val requestBody = json.toString()
                .toRequestBody("application/json".toMediaType())
            
            val request = Request.Builder()
                .url("https://www.mafutapass.com/api/auth/create-profile")
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .build()
            
            Log.d("SignUpViewModel", "🌐 Sending request to: ${request.url}")
            
            val (response, responseBody) = withContext(Dispatchers.IO) {
                val resp = httpClient.newCall(request).execute()
                val body = resp.body?.string() ?: ""
                Pair(resp, body)
            }
            
            Log.d("SignUpViewModel", "📥 Response code: ${response.code}")
            Log.d("SignUpViewModel", "📥 Response body: $responseBody")
            
            if (response.isSuccessful) {
                Log.d("SignUpViewModel", "✅ Supabase profile created successfully")
            } else {
                Log.e("SignUpViewModel", "❌ Profile creation failed with code ${response.code}")
                Log.e("SignUpViewModel", "❌ Error response: $responseBody")
                // Don't fail the whole flow - user can still use the app
            }
            
        } catch (e: Exception) {
            Log.e("SignUpViewModel", "💥 Exception creating Supabase profile: ${e.message}")
            Log.e("SignUpViewModel", "Stack trace: ", e)
            // Don't fail the whole flow
        }
    }

    sealed interface SignUpUiState {
        data object SignedOut : SignUpUiState
        data object Loading : SignUpUiState
        data object Success : SignUpUiState
        data class AccountCreated(val email: String) : SignUpUiState
        data class NeedsVerification(
            val signUpId: String,
            val email: String,
            val username: String,
            val firstName: String,
            val lastName: String
        ) : SignUpUiState
        data class Error(val message: String) : SignUpUiState
    }
}
