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
    val email: String? = null
)

object ClerkAuthManager {
    private const val TAG = "ClerkAuthManager"
    
    suspend fun signIn(email: String, password: String): AuthResult = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "🔐 Step 1: Starting sign-in with identifier: $email")
            
            // Step 1: Create sign-in with identifier and strategy
            val url1 = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ins")
            val connection1 = url1.openConnection() as HttpURLConnection
            
            connection1.requestMethod = "POST"
            connection1.setRequestProperty("Content-Type", "application/json")
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
            Log.d(TAG, "📥 Step 1 response: ${responseBody1.take(500)}")
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
            var supportsTicket = false
            
            if (supportedFactors != null) {
                for (i in 0 until supportedFactors.length()) {
                    val factor = supportedFactors.getJSONObject(i)
                    when (factor.getString("strategy")) {
                        "password" -> supportsPassword = true
                        "ticket" -> supportsTicket = true
                    }
                }
            }
            
            Log.d(TAG, "🔍 Supported factors - password: $supportsPassword, ticket: $supportsTicket")
            
            // If email is unverified, Clerk requires email verification first (ticket strategy)
            if (!supportsPassword && supportsTicket) {
                Log.d(TAG, "📧 Email verification required - password not available yet")
                
                // Step 2a: First, update the sign_in with the identifier using attempt_first_factor
                Log.d(TAG, "🔐 Step 2a: Setting identifier with ticket strategy")
                val url2a = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ins/$signInId/attempt_first_factor")
                val connection2a = url2a.openConnection() as HttpURLConnection
                
                connection2a.requestMethod = "POST"
                connection2a.setRequestProperty("Content-Type", "application/json")
                connection2a.setRequestProperty("Cookie", cookies)
                connection2a.doOutput = true
                
                val requestBody2a = JSONObject().apply {
                    put("strategy", "ticket")
                    put("identifier", email)
                }
                
                Log.d(TAG, "📤 Set identifier request: $requestBody2a")
                
                connection2a.outputStream.use { os ->
                    os.write(requestBody2a.toString().toByteArray())
                }
                
                val responseCode2a = connection2a.responseCode
                val response2a = if (responseCode2a == 200) {
                    connection2a.inputStream.bufferedReader().use { it.readText() }
                } else {
                    connection2a.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error details"
                }
                
                Log.d(TAG, "📧 Set identifier response: $responseCode2a")
                Log.d(TAG, "📧 Set identifier body: ${response2a.take(300)}")
                
                if (responseCode2a != 200) {
                    Log.e(TAG, "❌ Failed to set identifier: $response2a")
                    return@withContext AuthResult(
                        success = false,
                        error = "Failed to initiate email verification"
                    )
                }
                
                // Step 2b: Now prepare email code verification
                Log.d(TAG, "📧 Step 2b: Preparing email code")
                val url2b = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ins/$signInId/prepare_first_factor")
                val connection2b = url2b.openConnection() as HttpURLConnection
                
                connection2b.requestMethod = "POST"
                connection2b.setRequestProperty("Content-Type", "application/json")
                connection2b.setRequestProperty("Cookie", cookies)
                connection2b.doOutput = true
                
                val requestBody2b = JSONObject().apply {
                    put("strategy", "email_code")
                }
                
                connection2b.outputStream.use { os ->
                    os.write(requestBody2b.toString().toByteArray())
                }
                
                val responseCode2b = connection2b.responseCode
                val response2b = if (responseCode2b == 200) {
                    connection2b.inputStream.bufferedReader().use { it.readText() }
                } else {
                    connection2b.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error details"
                }
                
                Log.d(TAG, "📧 Prepare email code response: $responseCode2b")
                Log.d(TAG, "📧 Prepare email code body: ${response2b.take(300)}")
                
                if (responseCode2b != 200) {
                    Log.e(TAG, "❌ Failed to prepare email code: $response2b")
                    return@withContext AuthResult(
                        success = false,
                        error = "Failed to send verification email"
                    )
                }
                
                // Return that verification is needed
                return@withContext AuthResult(
                    success = true,
                    needsVerification = true,
                    signUpId = signInId
                )
            }
            
            // Step 2: Attempt first factor (password)
            Log.d(TAG, "🔐 Step 2: Attempting password authentication")
            
            val url2 = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ins/$signInId/attempt_first_factor")
            val connection2 = url2.openConnection() as HttpURLConnection
            
            connection2.requestMethod = "POST"
            connection2.setRequestProperty("Content-Type", "application/json")
            connection2.setRequestProperty("Cookie", cookies)  // Include cookies from first request
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
            Log.d(TAG, "📥 Step 2 response: ${responseBody2.take(1000)}")
            
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
    
    suspend fun signUp(
        email: String,
        password: String,
        username: String,
        firstName: String,
        lastName: String
    ): AuthResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ups")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("email_address", email)
                put("password", password)
                put("username", username)
                put("first_name", firstName)
                put("last_name", lastName)
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
            
            Log.d(TAG, "Sign up response code: $responseCode")
            Log.d(TAG, "Sign up response: ${responseBody.take(500)}")
            
            if (responseCode != HttpURLConnection.HTTP_OK) {
                val errorMessage = try {
                    val errorJson = JSONObject(responseBody)
                    val errors = errorJson.getJSONArray("errors")
                    if (errors.length() > 0) {
                        errors.getJSONObject(0).getString("message")
                    } else {
                        "Sign up failed"
                    }
                } catch (e: Exception) {
                    "Sign up failed"
                }
                
                return@withContext AuthResult(
                    success = false,
                    error = errorMessage
                )
            }
            
            // Parse response for verification status and token
            val json = JSONObject(responseBody)
            val status = json.optString("status", "")
            val signUpId = json.optString("id", "")
            
            Log.d(TAG, "Sign up status: $status, ID: $signUpId")
            
            // Check if email verification is required
            val verifications = json.optJSONObject("verifications")
            val emailAddressVerification = verifications?.optJSONObject("email_address")
            val verificationStatus = emailAddressVerification?.optString("status", "")
            
            // Extract email address ID
            val emailAddressId = try {
                val emailAddress = json.getJSONObject("email_address")
                emailAddress.getString("id")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to extract email address ID: ${e.message}")
                ""
            }
            
            Log.d(TAG, "Verification status: $verificationStatus")
            Log.d(TAG, "Email address ID: $emailAddressId")
            
            // If email verification is required (status should be "unverified")
            if (verificationStatus == "unverified" || status == "missing_requirements") {
                Log.d(TAG, "📧 Email verification required - Clerk will send verification code")
                
                // Prepare email code verification
                val prepareUrl = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ups/$signUpId/prepare_verification")
                val prepareConnection = prepareUrl.openConnection() as HttpURLConnection
                prepareConnection.requestMethod = "POST"
                prepareConnection.setRequestProperty("Content-Type", "application/json")
                prepareConnection.doOutput = true
                
                val prepareBody = JSONObject().apply {
                    put("strategy", "email_code")
                }
                
                prepareConnection.outputStream.use { os ->
                    os.write(prepareBody.toString().toByteArray())
                }
                
                val prepareResponseCode = prepareConnection.responseCode
                val prepareResponseBody = if (prepareResponseCode == HttpURLConnection.HTTP_OK) {
                    prepareConnection.inputStream.bufferedReader().use { it.readText() }
                } else {
                    prepareConnection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                }
                
                Log.d(TAG, "Prepare verification response: $prepareResponseCode")
                Log.d(TAG, "Prepare response body: ${prepareResponseBody.take(300)}")
                
                if (prepareResponseCode == HttpURLConnection.HTTP_OK) {
                    Log.d(TAG, "✅ Clerk sent verification email")
                } else {
                    Log.e(TAG, "❌ Failed to trigger verification email")
                }
                
                AuthResult(
                    success = true,
                    needsVerification = true,
                    signUpId = signUpId,
                    emailAddressId = emailAddressId
                )
            } else {
                // Try to extract session token if verification not required
                val token = try {
                    val client = json.getJSONObject("client")
                    val sessions = client.getJSONArray("sessions")
                    if (sessions.length() > 0) {
                        val firstSession = sessions.getJSONObject(0)
                        val lastActiveToken = firstSession.getJSONObject("last_active_token")
                        lastActiveToken.getString("jwt")
                    } else {
                        null
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to extract token: ${e.message}")
                    null
                }
                
                AuthResult(success = true, token = token)
            }
            
        } catch (e: Exception) {
            AuthResult(
                success = false,
                error = "Sign up failed: ${e.message}"
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
            Log.d(TAG, "📱 Signing in via backend: $email${if (userId != null) " (userId: $userId)" else ""}")
            
            val url = URL("https://www.mafutapass.com/api/auth/mobile-signin")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
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
                Log.d(TAG, "📥 Backend sign-in response: $response")
                
                val responseJson = JSONObject(response)
                
                // Check for needsVerification FIRST (before trying to read token)
                if (responseJson.optBoolean("needsVerification", false)) {
                    // Email verification required
                    val userId = responseJson.getString("userId")
                    Log.d(TAG, "📧 Email verification required for user: $userId")
                    
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
                    
                    Log.d(TAG, "✅ Backend sign-in successful! userId=$userId")
                    
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
            Log.d(TAG, "📱 Signing up via backend (bypasses CAPTCHA): $email")
            
            val url = URL("https://www.mafutapass.com/api/auth/mobile-signup")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("email", email)
                put("password", password)
                put("username", username)
                put("firstName", firstName)
                put("lastName", lastName)
            }
            
            Log.d(TAG, "📤 Backend request: ${requestBody.toString()}")
            
            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }
            
            val responseCode = connection.responseCode
            Log.d(TAG, "📥 Backend response code: $responseCode")
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d(TAG, "📥 Backend response: $response")
                
                val responseJson = JSONObject(response)
                
                if (responseJson.getBoolean("success")) {
                    val userId = responseJson.getString("userId")
                    val token = responseJson.optString("token", null)
                    
                    Log.d(TAG, "✅ Backend sign-up successful! userId=$userId, token=${if(token != null) "received" else "none"}")
                    
                    AuthResult(
                        success = true,
                        userId = userId,
                        token = token,
                        email = email
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
     * Verify email with code sent by Clerk (via backend)
     */
    suspend fun verifyEmailCode(email: String, code: String): AuthResult = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "📧 Verifying email code via backend: $email")
            
            val url = URL("https://www.mafutapass.com/api/auth/mobile-verify")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("email", email)
                put("code", code)
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
            
            Log.d(TAG, "📥 Verification response code: $responseCode")
            Log.d(TAG, "📥 Verification response: ${responseBody.take(500)}")
            
            if (responseCode != HttpURLConnection.HTTP_OK) {
                val errorMessage = try {
                    val errorJson = JSONObject(responseBody)
                    errorJson.optString("error", "Invalid verification code")
                } catch (e: Exception) {
                    "Invalid verification code"
                }
                
                return@withContext AuthResult(
                    success = false,
                    error = errorMessage
                )
            }
            
            // Parse successful verification response
            val json = JSONObject(responseBody)
            val status = json.optString("status", "")
            
            Log.d(TAG, "Verification status: $status")
            
            // Extract session token
            val token = try {
                val createdSessionId = json.optString("created_session_id", "")
                Log.d(TAG, "Created session ID: $createdSessionId")
                
                val client = json.getJSONObject("client")
                val sessions = client.getJSONArray("sessions")
                
                if (sessions.length() > 0) {
                    val firstSession = sessions.getJSONObject(0)
                    val lastActiveToken = firstSession.getJSONObject("last_active_token")
                    val jwt = lastActiveToken.getString("jwt")
                    Log.d(TAG, "✅ Got session token after verification")
                    jwt
                } else {
                    Log.e(TAG, "❌ No sessions in verification response")
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to extract token from verification: ${e.message}")
                null
            }
            
            if (token != null) {
                AuthResult(success = true, token = token)
            } else {
                AuthResult(
                    success = false,
                    error = "Failed to create session after verification"
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Email verification error: ${e.message}", e)
            AuthResult(
                success = false,
                error = "Verification failed: ${e.message}"
            )
        }
    }
    
    /**
     * Sign in or sign up a user who has authenticated via OAuth (Google).
     * Sends Google ID token to backend for verification and Clerk authentication.
     */
    suspend fun signInOrSignUpWithOAuth(
        idToken: String,
        email: String,
        firstName: String,
        lastName: String,
        oauthProvider: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            // Call backend endpoint to verify Google token and create/authenticate Clerk user
            val backendUrl = URL("https://mafutapass.com/api/auth/google-mobile")
            val connection = backendUrl.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            
            val requestBody = JSONObject().apply {
                put("idToken", idToken)
                put("email", email)
                put("firstName", firstName)
                put("lastName", lastName)
            }
            
            Log.d(TAG, "Sending Google ID token to backend for verification...")
            
            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }
            
            val responseCode = connection.responseCode
            val responseBody = if (responseCode == HttpURLConnection.HTTP_OK) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            }
            
            Log.d(TAG, "Backend response code: $responseCode")
            Log.d(TAG, "Backend response: ${responseBody.take(300)}")
            
            if (responseCode != HttpURLConnection.HTTP_OK) {
                val errorMessage = try {
                    val errorJson = JSONObject(responseBody)
                    errorJson.optString("error", "Authentication failed")
                } catch (e: Exception) {
                    "Authentication failed"
                }
                return@withContext Result.failure(Exception(errorMessage))
            }
            
            // Parse successful response
            val json = JSONObject(responseBody)
            val userId = json.getString("userId")
            
            Log.d(TAG, "✅ Backend authenticated user: $userId")
            
            // Return userId as token for now
            // TODO: Backend should return actual session token
            Result.success(userId)
            
        } catch (e: Exception) {
            Log.e(TAG, "OAuth backend authentication error: ${e.message}", e)
            Result.failure(Exception("OAuth sign-in failed: ${e.message}"))
        }
    }

    
    /**
     * Generate a random password for OAuth users (they won't need it)
     */
    private fun generateRandomPassword(): String {
        val allowedChars = ('A'..'Z') + ('a'..'z') + ('0'..'9') + listOf('!', '@', '#', '$', '%')
        return (1..16)
            .map { allowedChars.random() }
            .joinToString("")
    }
    
    suspend fun signOut() {
        // Clerk sign out will be handled by the SDK
        // This is mainly for consistency with SupabaseAuthManager
    }
}
