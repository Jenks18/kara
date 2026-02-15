package com.mafutapass.app.auth

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object ClerkConfig {
    const val PUBLISHABLE_KEY = "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k"
    const val FRONTEND_API = "https://clerk.mafutapass.com"
}

data class UserProfile(
    val email: String,
    val name: String?,
    val avatarURL: String?
)

data class AuthResult(
    val success: Boolean,
    val token: String? = null,
    val user: UserProfile? = null,
    val error: String? = null,
    val needsVerification: Boolean = false,
    val signUpId: String? = null,
    val emailAddressId: String? = null,
    val userId: String? = null,
    val email: String? = null,
    val signInToken: String? = null,
    val sessionToken: String? = null
)

object ClerkAuthManager {
    private const val TAG = "ClerkAuthManager"
    
    suspend fun signIn(email: String, password: String): AuthResult = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "🔐 Step 1: Starting sign-in")
            
            // Step 1: Create sign-in with identifier and strategy
            val url1 = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ins")
            val connection1 = url1.openConnection() as HttpURLConnection
            
            connection1.requestMethod = "POST"
            connection1.setRequestProperty("Content-Type", "application/json")
            connection1.connectTimeout = 15000
            connection1.readTimeout = 15000
            connection1.doOutput = true
            
            val requestBody1 = JSONObject().apply {
                put("identifier", email)
                // Don't specify strategy yet - let Clerk tell us what's available
            }
            
            connection1.outputStream.use { os ->
                os.write(requestBody1.toString().toByteArray())
            }
            
            val responseCode1 = connection1.responseCode
            
            // Extract cookies from response for subsequent requests
            val cookies = connection1.headerFields["Set-Cookie"]?.joinToString("; ") { 
                it.split(";")[0] // Get just the name=value part
            } ?: ""
            
            val responseBody1 = if (responseCode1 == HttpURLConnection.HTTP_OK) {
                connection1.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection1.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            }
            
            Log.d(TAG, "📥 Step 1 response code: $responseCode1")
            if (cookies.isNotEmpty()) {
                Log.d(TAG, "🍪 Captured cookies for session")
            }
            
            if (responseCode1 != HttpURLConnection.HTTP_OK) {
                return@withContext AuthResult(
                    success = false,
                    error = "Invalid email or password"
                )
            }
            
            val json1 = JSONObject(responseBody1)
            val client1 = json1.getJSONObject("client")
            val signIn = client1.getJSONObject("sign_in")
            val signInId = signIn.getString("id")
            val status = signIn.getString("status")
            
            Log.d(TAG, "📥 Step 1: sign_in created with ID: $signInId, status: $status")
            
            // Check supported first factors
            val supportedFactors = signIn.optJSONArray("supported_first_factors")
            var supportsPassword = false
            
            if (supportedFactors != null) {
                for (i in 0 until supportedFactors.length()) {
                    val factor = supportedFactors.getJSONObject(i)
                    if (factor.getString("strategy") == "password") {
                        supportsPassword = true
                        break
                    }
                }
            }
            
            Log.d(TAG, "🔍 Password authentication supported: $supportsPassword")
            
            if (!supportsPassword) {
                Log.e(TAG, "❌ Password authentication not available")
                return@withContext AuthResult(
                    success = false,
                    error = "Password authentication not supported - email may require verification"
                )
            }
            
            // Step 2: Attempt first factor (password)
            Log.d(TAG, "🔐 Step 2: Attempting password authentication")
            
            val url2 = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ins/$signInId/attempt_first_factor")
            val connection2 = url2.openConnection() as HttpURLConnection
            
            connection2.requestMethod = "POST"
            connection2.setRequestProperty("Content-Type", "application/json")
            connection2.setRequestProperty("Cookie", cookies)  // Include cookies from first request
            connection2.connectTimeout = 15000
            connection2.readTimeout = 15000
            connection2.doOutput = true
            
            val requestBody2 = JSONObject().apply {
                put("strategy", "password")
                put("password", password)
            }
            
            connection2.outputStream.use { os ->
                os.write(requestBody2.toString().toByteArray())
            }
            
            val responseCode2 = connection2.responseCode
            val responseBody2 = if (responseCode2 == HttpURLConnection.HTTP_OK) {
                connection2.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection2.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            }
            
            Log.d(TAG, "📥 Step 2 response code: $responseCode2")
            
            if (responseCode2 != HttpURLConnection.HTTP_OK) {
                return@withContext AuthResult(
                    success = false,
                    error = "Invalid email or password"
                )
            }
            
            val json2 = JSONObject(responseBody2)
            val client2 = json2.getJSONObject("client")
            
            // Check if the sign_in needs email verification
            val signIn2 = client2.optJSONObject("sign_in")
            if (signIn2 != null) {
                val status2 = signIn2.optString("status", "")
                Log.d(TAG, "🔍 Sign-in status after password: '$status2'")
                
                // If needs first factor verification (email code)
                if (status2 == "needs_first_factor") {
                    Log.d(TAG, "📧 Email verification required")
                    return@withContext AuthResult(
                        success = true,
                        needsVerification = true,
                        signUpId = signInId
                    )
                }
            }
            
            // Get the session
            Log.d(TAG, "🔍 Checking for sessions...")
            val sessions = client2.getJSONArray("sessions")
            Log.d(TAG, "🔍 Found sessions: ${sessions.length()}")
            
            if (sessions.length() == 0) {
                return@withContext AuthResult(
                    success = false,
                    error = "No session created"
                )
            }
            
            val firstSession = sessions.getJSONObject(0)
            val lastActiveToken = firstSession.getJSONObject("last_active_token")
            val token = lastActiveToken.getString("jwt")
            
            val user = firstSession.getJSONObject("user")
            val emailAddresses = user.getJSONArray("email_addresses")
            val firstEmail = emailAddresses.getJSONObject(0)
            val emailAddress = firstEmail.getString("email_address")
            
            val firstName = user.optString("first_name", "")
            val lastName = user.optString("last_name", "")
            val fullName = "$firstName $lastName".trim()
            
            val userProfile = UserProfile(
                email = emailAddress,
                name = if (fullName.isEmpty()) null else fullName,
                avatarURL = user.optString("image_url", "")
            )
            
            AuthResult(
                success = true,
                token = token,
                user = userProfile
            )
            
        } catch (e: Exception) {
            AuthResult(
                success = false,
                error = "Sign in failed: ${e.message}"
            )
        }
    }
    
    /**
     * Sign up via backend API (bypasses CAPTCHA requirement)
     * Backend uses Clerk Backend SDK which doesn't require CAPTCHA
     */
    /**
     * Sign in via backend (bypasses Frontend API cookie issues)
     */
    suspend fun signInViaBackend(
        email: String,
        password: String,
        userId: String? = null
    ): AuthResult = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "📱 Signing in via backend")
            
            val url = URL("https://www.mafutapass.com/api/auth/mobile-signin")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("email", email)
                put("password", password)
                if (userId != null) {
                    put("userId", userId)
                }
            }
            
            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }
            
            val responseCode = connection.responseCode
            Log.d(TAG, "📥 Backend sign-in response code: $responseCode")
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                
                val responseJson = JSONObject(response)
                
                // Check for needsVerification FIRST (before trying to read token)
                if (responseJson.optBoolean("needsVerification", false)) {
                    // Email verification required
                    val userId = responseJson.getString("userId")
                    Log.d(TAG, "📧 Email verification required")
                    
                    AuthResult(
                        success = true,
                        needsVerification = true,
                        userId = userId,
                        email = email
                    )
                } else if (responseJson.getBoolean("success")) {
                    // Normal sign-in with token
                    val token = responseJson.getString("token")
                    val userId = responseJson.getString("userId")
                    
                    Log.d(TAG, "✅ Backend sign-in successful!")
                    
                    AuthResult(
                        success = true,
                        token = token,
                        userId = userId,
                        email = email
                    )
                } else {
                    val error = responseJson.optString("message", "Unknown error")
                    Log.e(TAG, "❌ Backend sign-in failed: $error")
                    AuthResult(success = false, error = error)
                }
            } else {
                val errorResponse = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error details"
                Log.e(TAG, "❌ Backend sign-in failed with code $responseCode: $errorResponse")
                
                // Try to parse error message from JSON response
                val errorMessage = try {
                    val errorJson = JSONObject(errorResponse)
                    errorJson.optString("error", "Sign in failed")
                } catch (e: Exception) {
                    "Sign in failed: HTTP $responseCode"
                }
                
                AuthResult(
                    success = false,
                    error = errorMessage
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Backend sign-in exception: ${e.message}", e)
            AuthResult(
                success = false,
                error = "Sign in failed: ${e.message}"
            )
        }
    }
    
    suspend fun signUpViaBackend(
        email: String,
        password: String,
        username: String,
        firstName: String,
        lastName: String
    ): AuthResult = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "📱 Signing up via backend")
            
            val url = URL("https://www.mafutapass.com/api/auth/mobile-signup")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("email", email)
                put("password", password)
                put("username", username)
                put("firstName", firstName)
                put("lastName", lastName)
            }
            
            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }
            
            val responseCode = connection.responseCode
            Log.d(TAG, "📥 Backend response code: $responseCode")
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                
                val responseJson = JSONObject(response)
                
                if (responseJson.getBoolean("success")) {
                    val userId = responseJson.getString("userId")
                    val email = responseJson.getString("email")
                    val signInToken = responseJson.optString("signInToken", null)
                    
                    Log.d(TAG, "✅ Backend sign-up successful!")
                    
                    AuthResult(
                        success = true,
                        userId = userId,
                        email = email,
                        token = signInToken
                    )
                } else {
                    val error = responseJson.optString("error", "Unknown error")
                    Log.e(TAG, "❌ Backend sign-up failed: $error")
                    AuthResult(success = false, error = error)
                }
            } else {
                val errorResponse = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error details"
                Log.e(TAG, "❌ Backend sign-up failed with code $responseCode: $errorResponse")
                
                // Try to parse error message from JSON response
                val errorMessage = try {
                    val errorJson = JSONObject(errorResponse)
                    errorJson.optString("error", "Sign up failed")
                } catch (e: Exception) {
                    "Sign up failed: HTTP $responseCode"
                }
                
                AuthResult(
                    success = false,
                    error = errorMessage
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Backend sign-up exception: ${e.message}", e)
            AuthResult(
                success = false,
                error = "Sign up failed: ${e.message}"
            )
        }
    }
    
    /**
     * Sign in using a Clerk sign-in token (ticket strategy)
     * This provides instant authentication without password delays
     */
    suspend fun signInWithToken(signInToken: String): AuthResult = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "🎫 Signing in with sign-in token via backend...")
            
            val url = URL("https://www.mafutapass.com/api/auth/mobile-signin")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("signInToken", signInToken)
            }
            
            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }
            
            val responseCode = connection.responseCode
            val responseBody = if (responseCode == HttpURLConnection.HTTP_OK) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            }
            
            Log.d(TAG, "📥 Token sign-in response code: $responseCode")
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val json = JSONObject(responseBody)
                if (json.getBoolean("success")) {
                    val jwt = json.getString("token")
                    val userId = json.optString("userId", "")
                    
                    Log.d(TAG, "✅ Sign-in token authentication successful!")
                    
                    AuthResult(
                        success = true,
                        token = jwt,
                        userId = userId
                    )
                } else {
                    val error = json.optString("error", "Authentication failed")
                    Log.e(TAG, "❌ Token authentication failed: $error")
                    AuthResult(success = false, error = error)
                }
            } else {
                Log.e(TAG, "❌ Token authentication failed: HTTP $responseCode")
                AuthResult(
                    success = false,
                    error = "Invalid or expired sign-in token"
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Token sign-in exception: ${e.message}", e)
            AuthResult(
                success = false,
                error = "Sign in failed: ${e.message}"
            )
        }
    }
    
    // Removed: exchangeTicketForSession (no longer needed)
    // Removed: verifyEmailCode (email verification not used)
    
    // Removed: signInOrSignUpWithOAuth (dead code — Credential Manager flow used instead)
    // Removed: generateRandomPassword (unused)
    
    suspend fun signOut() {
        // Clerk sign out will be handled by the SDK
        // This is mainly for consistency with SupabaseAuthManager
    }
}
