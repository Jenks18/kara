package com.mafutapass.app.viewmodel

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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
import javax.inject.Inject

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
@HiltViewModel
class NativeOAuthViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context
) : ViewModel() {
    
    companion object {
        private const val TAG = "NativeOAuthViewModel"
        private const val API_URL = "https://web.kachalabs.com/api/auth/google-native"
        private const val COMPLETE_SIGNUP_URL = "https://web.kachalabs.com/api/auth/complete-google-signup"
        private const val GOOGLE_CLIENT_ID = "509785450495-ltsejjolpsl130pvs179lnqtms0g2uj8.apps.googleusercontent.com"
    }

    private val _oauthState = MutableStateFlow<NativeOAuthState>(NativeOAuthState.Idle)
    val oauthState: StateFlow<NativeOAuthState> = _oauthState.asStateFlow()

    private val credentialManager = CredentialManager.create(appContext)
    
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
     * NO browser, NO deep links.
     *
     * Adds two credential options to a SINGLE request:
     *   1. GetGoogleIdOption — one-tap device account picker (best UX)
     *   2. GetSignInWithGoogleOption — Google's own sign-in sheet (always works)
     *
     * The Credential Manager merges both into one UI. When the credential
     * store has accounts, you get the fast one-tap picker. When it doesn't
     * (e.g. right after sign-out), Google's sign-in sheet handles it.
     */
    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            try {
                Log.d(TAG, "🚀 Starting NATIVE Google Sign-In")
                _oauthState.value = NativeOAuthState.Loading

                // Primary: one-tap device account picker (pulls Google accounts on device)
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(GOOGLE_CLIENT_ID)
                    .build()

                // Secondary: Google's own sign-in sheet (always available)
                val signInOption = GetSignInWithGoogleOption.Builder(GOOGLE_CLIENT_ID)
                    .build()

                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .addCredentialOption(signInOption)
                    .build()

                Log.d(TAG, "📱 Showing native Google account picker...")

                val result = credentialManager.getCredential(
                    context = context,
                    request = request
                )

                val idToken = GoogleIdTokenCredential.createFrom(result.credential.data).idToken
                Log.d(TAG, "✅ Got Google ID token")

                // Send to backend for verification and Clerk session creation
                authenticateWithBackend(idToken)

            } catch (e: GetCredentialCancellationException) {
                Log.d(TAG, "ℹ️ User cancelled Google Sign-In")
                _oauthState.value = NativeOAuthState.Idle
            } catch (e: GetCredentialException) {
                Log.e(TAG, "❌ Credential error (${e.type}): ${e.message}", e)
                val userMessage = when {
                    e.message?.contains("cancelled", ignoreCase = true) == true ||
                    e.message?.contains("canceled", ignoreCase = true) == true ->
                        "Sign-in was cancelled."
                    else -> "Google Sign-In failed. Please try again."
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
                val body = resp.body?.string() ?: ""
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

            // Backend always returns a valid JWT in the "token" field
            val token = jsonResponse.optString("token", null) 
                ?: jsonResponse.optString("sessionToken", null)
            
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

            _oauthState.value = NativeOAuthState.Success(
                token = token,
                userId = userId,
                email = email,
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
                    val body = resp.body?.string() ?: ""
                    Pair(resp, body)
                }
                
                Log.d(TAG, "📥 Complete signup response: ${response.code}")
                
                if (!response.isSuccessful) {
                    val error = try {
                        val errorJson = JSONObject(responseBody)
                        errorJson.optString("error", "Failed to complete signup")
                    } catch (e: Exception) {
                        "Server error (${response.code})"
                    }
                    Log.e(TAG, "❌ Complete signup failed: $error")
                    _oauthState.value = NativeOAuthState.Error(error)
                    return@launch
                }
                
                val jsonResponse = try {
                    JSONObject(responseBody)
                } catch (e: Exception) {
                    _oauthState.value = NativeOAuthState.Error("Invalid server response")
                    return@launch
                }
                
                if (!jsonResponse.optBoolean("success", false)) {
                    val error = jsonResponse.optString("error", "Unknown error")
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
                
                _oauthState.value = NativeOAuthState.Success(
                    token = token,
                    userId = userId,
                    email = email,
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

    fun resetState() {
        _oauthState.value = NativeOAuthState.Idle
    }
}

/**
 * Represents the state of the native OAuth authentication flow.
 * No Supabase token — backend handles all database access.
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
        val isNewUser: Boolean = false,
        val firstName: String? = null,
        val lastName: String? = null
    ) : NativeOAuthState()
    data class Error(val message: String) : NativeOAuthState()
}
