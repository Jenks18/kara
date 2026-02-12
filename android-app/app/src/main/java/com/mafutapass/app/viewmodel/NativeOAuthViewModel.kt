package com.mafutapass.app.viewmodel

import android.app.Application
import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * NATIVE Google OAuth ViewModel
 * 
 * Uses Android Credential Manager for native Google Sign-In.
 * NO browser, NO deep links, NO web redirect.
 * 
 * Flow:
 * 1. Android Credential Manager shows native Google account picker
 * 2. Get Google ID token
 * 3. Send to backend API for verification
 * 4. Backend returns Clerk session JWT
 * 5. Store JWT and mark as authenticated
 */
class NativeOAuthViewModel(application: Application) : AndroidViewModel(application) {
    
    companion object {
        private const val TAG = "NativeOAuthViewModel"
        private const val API_URL = "https://mafutapass.com/api/auth/google-native"
        private const val GOOGLE_CLIENT_ID = "509785450495-ltsejjolpsl130pvs179lnqtms0g2uj8.apps.googleusercontent.com"
    }

    private val _oauthState = MutableStateFlow<NativeOAuthState>(NativeOAuthState.Idle)
    val oauthState: StateFlow<NativeOAuthState> = _oauthState.asStateFlow()

    private val credentialManager = CredentialManager.create(application)
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    /**
     * Sign in with Google using native Android Credential Manager.
     * Shows native Google account picker - NO browser.
     */
    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            try {
                Log.d(TAG, "🚀 Starting NATIVE Google Sign-In")
                _oauthState.value = NativeOAuthState.Loading

                // Configure Google ID option
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(GOOGLE_CLIENT_ID)
                    .setAutoSelectEnabled(true)
                    .build()

                // Build credential request
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                Log.d(TAG, "📱 Showing native Google account picker...")

                // Show native Google account picker
                val result = credentialManager.getCredential(
                    context = context,
                    request = request
                )

                // Extract Google ID token
                val credential = GoogleIdTokenCredential.createFrom(result.credential.data)
                val idToken = credential.idToken

                Log.d(TAG, "✅ Got Google ID token: ${idToken.take(30)}...")

                // Send to backend for verification and Clerk session creation
                authenticateWithBackend(idToken)

            } catch (e: GetCredentialException) {
                Log.e(TAG, "❌ Credential error: ${e.message}", e)
                _oauthState.value = NativeOAuthState.Error("Failed to get Google credential: ${e.message}")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Auth error", e)
                _oauthState.value = NativeOAuthState.Error(e.message ?: "Authentication failed")
            }
        }
    }

    /**
     * Send Google ID token to backend for verification.
     * Backend verifies token, creates Clerk user/session, returns JWT.
     */
    private suspend fun authenticateWithBackend(idToken: String) {
        try {
            Log.d(TAG, "🔄 Sending token to backend...")

            val json = JSONObject().apply {
                put("idToken", idToken)
            }

            val requestBody = json.toString()
                .toRequestBody("application/json; charset=utf-8".toMediaType())

            val request = Request.Builder()
                .url(API_URL)
                .post(requestBody)
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                Log.e(TAG, "❌ Backend error: $responseBody")
                _oauthState.value = NativeOAuthState.Error("Server error: ${response.code}")
                return
            }

            val jsonResponse = JSONObject(responseBody)
            
            if (!jsonResponse.getBoolean("success")) {
                val error = jsonResponse.optString("error", "Unknown error")
                Log.e(TAG, "❌ Auth failed: $error")
                _oauthState.value = NativeOAuthState.Error(error)
                return
            }

            val sessionToken = jsonResponse.getString("sessionToken")
            val userObj = jsonResponse.getJSONObject("user")
            val userId = userObj.getString("id")
            val email = userObj.optString("email", "")

            Log.d(TAG, "✅ Authentication successful!")
            Log.d(TAG, "User: $email (ID: $userId)")
            Log.d(TAG, "Session token: ${sessionToken.take(30)}...")

            _oauthState.value = NativeOAuthState.Success(sessionToken, userId, email)

        } catch (e: Exception) {
            Log.e(TAG, "❌ Backend communication error", e)
            _oauthState.value = NativeOAuthState.Error("Network error: ${e.message}")
        }
    }

    /**
     * Reset the OAuth state to idle
     */
    fun resetState() {
        _oauthState.value = NativeOAuthState.Idle
    }
}

/**
 * Represents the state of the native OAuth authentication flow
 */
sealed class NativeOAuthState {
    object Idle : NativeOAuthState()
    object Loading : NativeOAuthState()
    data class Success(val sessionToken: String, val userId: String, val email: String) : NativeOAuthState()
    data class Error(val message: String) : NativeOAuthState()
}
