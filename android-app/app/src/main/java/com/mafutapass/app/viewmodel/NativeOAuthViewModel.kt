package com.mafutapass.app.viewmodel

import android.app.Activity
import android.app.Application
import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import okhttp3.Dns
import java.net.InetAddress
import java.net.UnknownHostException

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
        // Use production domain (always points to latest deployment)
        private const val API_URL = "https://www.mafutapass.com/api/auth/google-native"
        private const val COMPLETE_SIGNUP_URL = "https://www.mafutapass.com/api/auth/complete-google-signup"
        private const val MOBILE_AUTH_URL = "https://www.mafutapass.com/api/mobile/auth"
        private const val GOOGLE_CLIENT_ID = "509785450495-ltsejjolpsl130pvs179lnqtms0g2uj8.apps.googleusercontent.com"
    }

    private val _oauthState = MutableStateFlow<NativeOAuthState>(NativeOAuthState.Idle)
    val oauthState: StateFlow<NativeOAuthState> = _oauthState.asStateFlow()

    private val credentialManager = CredentialManager.create(application)
    
    // Custom DNS resolver with better error messages and IPv4 preference
    private val customDns = object : Dns {
        override fun lookup(hostname: String): List<InetAddress> {
            try {
                Log.d(TAG, "🔍 DNS lookup for: $hostname")
                val allAddresses = InetAddress.getAllByName(hostname)
                
                // Prefer IPv4 addresses (fixes Android emulator IPv6 issues)
                val ipv4Addresses = allAddresses.filter { it.address.size == 4 }
                val addresses = if (ipv4Addresses.isNotEmpty()) ipv4Addresses else allAddresses.toList()
                
                Log.d(TAG, "✅ Resolved $hostname to ${addresses.size} address(es): ${addresses.joinToString { it.hostAddress ?: "unknown" }}")
                return addresses
            } catch (e: UnknownHostException) {
                Log.e(TAG, "❌ DNS lookup failed for $hostname: ${e.message}")
                Log.e(TAG, "💡 Try restarting the emulator or check network settings")
                throw e
            }
        }
    }
    
    private val httpClient = OkHttpClient.Builder()
        .dns(customDns)
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

                Log.d(TAG, "✅ Got Google ID token")

                // Send to backend for verification and Clerk session creation
                authenticateWithBackend(idToken)

            } catch (e: NoCredentialException) {
                Log.e(TAG, "❌ No credential available: ${e.message}", e)
                Log.e(TAG, "💡 This usually means:")
                Log.e(TAG, "   1. No Google account is signed in on this device")
                Log.e(TAG, "   2. Google Play Services needs updating")
                Log.e(TAG, "   3. SHA-1 fingerprint not registered in Google Cloud Console")
                _oauthState.value = NativeOAuthState.Error(
                    "No Google account available. Please ensure you are signed into a Google account on this device and Google Play Services is up to date."
                )
            } catch (e: GetCredentialCancellationException) {
                Log.d(TAG, "ℹ️ User cancelled Google Sign-In")
                _oauthState.value = NativeOAuthState.Idle
            } catch (e: GetCredentialException) {
                Log.e(TAG, "❌ Credential error (${e.type}): ${e.message}", e)
                Log.e(TAG, "💡 Exception type: ${e.javaClass.simpleName}")
                Log.e(TAG, "💡 Error type string: ${e.type}")
                val userMessage = when {
                    e.message?.contains("no credentials available", ignoreCase = true) == true ||
                    e.message?.contains("credentials lacking", ignoreCase = true) == true ->
                        "No Google credentials found. Please sign into a Google account in your device Settings > Accounts."
                    e.message?.contains("cancelled", ignoreCase = true) == true ||
                    e.message?.contains("canceled", ignoreCase = true) == true ->
                        "Sign-in was cancelled."
                    else -> "Google Sign-In failed: ${e.message}"
                }
                _oauthState.value = NativeOAuthState.Error(userMessage)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Unexpected auth error: ${e.javaClass.simpleName}: ${e.message}", e)
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

            // Execute HTTP request on IO dispatcher (not main thread)
            val (response, responseBody) = withContext(Dispatchers.IO) {
                val resp = httpClient.newCall(request).execute()
                val body = resp.body.string()
                Pair(resp, body)
            }

            Log.d(TAG, "📥 Response code: ${response.code}")

            if (!response.isSuccessful) {
                Log.e(TAG, "❌ Backend HTTP error ${response.code}")
                _oauthState.value = NativeOAuthState.Error("Server error: ${response.code}")
                return
            }

            val jsonResponse = JSONObject(responseBody)
            
            // Check if new user needs to select username
            if (jsonResponse.optBoolean("needsUsername", false)) {
                val pendingToken = jsonResponse.getString("pendingSignupToken")
                val email = jsonResponse.getString("email")
                val firstName = jsonResponse.getString("firstName")
                val lastName = jsonResponse.optString("lastName", "")
                
                Log.d(TAG, "📝 New user - username selection required")
                
                _oauthState.value = NativeOAuthState.PendingUsername(
                    pendingSignupToken = pendingToken,
                    email = email,
                    firstName = firstName,
                    lastName = lastName
                )
                return
            }
            
            // Use optBoolean to avoid JSONException if field is missing
            if (!jsonResponse.optBoolean("success", false)) {
                val error = jsonResponse.optString("error", "Unknown error")
                Log.e(TAG, "❌ Auth failed: $error")
                _oauthState.value = NativeOAuthState.Error(error)
                return
            }

            // Backend returns "token" field (Clerk sign-in token)
            val token = jsonResponse.optString("token", null) 
                ?: jsonResponse.optString("sessionToken", null)
                ?: jsonResponse.optString("signInToken", null)
            
            if (token == null) {
                Log.e(TAG, "❌ No token in response")
                _oauthState.value = NativeOAuthState.Error("No authentication token received")
                return
            }
            
            val userObj = jsonResponse.getJSONObject("user")
            val userId = userObj.getString("id")
            val email = userObj.optString("email", "")
            val isNewUser = jsonResponse.optBoolean("isNewUser", false)
            val firstName = userObj.optString("firstName", null)
            val lastName = userObj.optString("lastName", null)

            Log.d(TAG, "✅ Authentication successful!")
            Log.d(TAG, "Is new user: $isNewUser")

            // Exchange Clerk token for Supabase token
            val supabaseToken = exchangeForSupabaseToken(token, userId, email)
            
            if (supabaseToken == null) {
                Log.w(TAG, "⚠️ Failed to get Supabase token, continuing with Clerk token only")
            } else {
                Log.d(TAG, "✅ Got Supabase token")
            }

            _oauthState.value = NativeOAuthState.Success(
                token = token,
                userId = userId,
                email = email,
                supabaseToken = supabaseToken,
                isNewUser = isNewUser,
                firstName = firstName,
                lastName = lastName
            )

        } catch (e: Exception) {
            Log.e(TAG, "❌ Backend communication error: ${e.javaClass.simpleName}: ${e.message}", e)
            _oauthState.value = NativeOAuthState.Error("Network error: ${e.javaClass.simpleName}: ${e.message}")
        }
    }

    /**
     * Exchange Clerk sign-in token for Supabase JWT
     */
    private suspend fun exchangeForSupabaseToken(
        clerkToken: String,
        userId: String,
        email: String
    ): String? {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "🔄 Exchanging for Supabase token...")
                
                val json = JSONObject().apply {
                    put("userId", userId)
                    put("email", email)
                }
                
                val requestBody = json.toString()
                    .toRequestBody("application/json; charset=utf-8".toMediaType())
                
                val request = Request.Builder()
                    .url(MOBILE_AUTH_URL)
                    .addHeader("Authorization", "Bearer $clerkToken")
                    .post(requestBody)
                    .build()
                
                val response = httpClient.newCall(request).execute()
                val responseBody = response.body.string()
                
                Log.d(TAG, "📥 Supabase auth response: ${response.code}")
                
                if (!response.isSuccessful) {
                    Log.e(TAG, "❌ Supabase auth failed: $responseBody")
                    return@withContext null
                }
                
                val jsonResponse = JSONObject(responseBody)
                if (!jsonResponse.getBoolean("success")) {
                    Log.e(TAG, "❌ Supabase auth unsuccessful")
                    return@withContext null
                }
                
                val token = jsonResponse.getString("supabase_token")
                Log.d(TAG, "✅ Got Supabase token")
                token
            } catch (e: Exception) {
                Log.e(TAG, "❌ Supabase token exchange error: ${e.message}", e)
                null
            }
        }
    }
    
    /**
     * Complete Google sign-up by submitting chosen username.
     * Called after user selects their username on the username setup screen.
     */
    fun completeGoogleSignup(username: String, pendingSignupToken: String) {
        viewModelScope.launch {
            try {
                Log.d(TAG, "🚀 Completing Google sign-up")
                _oauthState.value = NativeOAuthState.Loading
                
                val json = JSONObject().apply {
                    put("username", username)
                    put("pendingSignupToken", pendingSignupToken)
                }
                
                val requestBody = json.toString()
                    .toRequestBody("application/json; charset=utf-8".toMediaType())
                
                val request = Request.Builder()
                    .url(COMPLETE_SIGNUP_URL)
                    .post(requestBody)
                    .build()
                
                val (response, responseBody) = withContext(Dispatchers.IO) {
                    val resp = httpClient.newCall(request).execute()
                    val body = resp.body.string()
                    Pair(resp, body)
                }
                
                Log.d(TAG, "📥 Complete signup response: ${response.code}")
                
                if (!response.isSuccessful) {
                    // Try to parse error as JSON, but handle HTML responses
                    val error = try {
                        val errorJson = JSONObject(responseBody)
                        errorJson.optString("error", "Failed to complete signup")
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Non-JSON error response")
                        "Server error (${response.code}): ${if (responseBody.contains("<!DOCTYPE")) "HTML error page" else "Unknown error"}"
                    }
                    Log.e(TAG, "❌ Complete signup failed: $error")
                    _oauthState.value = NativeOAuthState.Error(error)
                    return@launch
                }
                
                val jsonResponse = try {
                    JSONObject(responseBody)
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Invalid JSON response")
                    _oauthState.value = NativeOAuthState.Error("Invalid server response")
                    return@launch
                }
                
                // Use optBoolean to avoid JSONException if field is missing
                if (!jsonResponse.optBoolean("success", false)) {
                    val error = jsonResponse.optString("error", "Unknown error")
                    Log.e(TAG, "❌ Signup unsuccessful: $error")
                    _oauthState.value = NativeOAuthState.Error(error)
                    return@launch
                }
                
                val token = jsonResponse.getString("token")
                val userObj = jsonResponse.getJSONObject("user")
                val userId = userObj.getString("id")
                val email = userObj.getString("email")
                val firstName = userObj.optString("firstName", null)
                val lastName = userObj.optString("lastName", null)
                
                Log.d(TAG, "✅ Signup completed successfully!")
                
                // Exchange for Supabase token
                val supabaseToken = exchangeForSupabaseToken(token, userId, email)
                
                _oauthState.value = NativeOAuthState.Success(
                    token = token,
                    userId = userId,
                    email = email,
                    supabaseToken = supabaseToken,
                    isNewUser = true,
                    firstName = firstName,
                    lastName = lastName
                )
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Complete signup error: ${e.message}", e)
                _oauthState.value = NativeOAuthState.Error("Failed to complete signup: ${e.message}")
            }
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
    data class PendingUsername(
        val pendingSignupToken: String,
        val email: String,
        val firstName: String,
        val lastName: String
    ) : NativeOAuthState()
    data class Success(
        val token: String, 
        val userId: String, 
        val email: String,
        val supabaseToken: String? = null,
        val isNewUser: Boolean = false,
        val firstName: String? = null,
        val lastName: String? = null
    ) : NativeOAuthState()
    data class Error(val message: String) : NativeOAuthState()
}
