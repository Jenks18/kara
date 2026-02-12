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
    val emailAddressId: String? = null
)

object ClerkAuthManager {
    private const val TAG = "ClerkAuthManager"
    
    suspend fun signIn(email: String, password: String): AuthResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ins")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("identifier", email)
                put("password", password)
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
            
            if (responseCode != HttpURLConnection.HTTP_OK) {
                return@withContext AuthResult(
                    success = false,
                    error = "Invalid email or password"
                )
            }
            
            val json = JSONObject(responseBody)
            val client = json.getJSONObject("client")
            val sessions = client.getJSONArray("sessions")
            
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
     * Verify email with code sent by Clerk
     */
    suspend fun verifyEmailCode(signUpId: String, code: String): AuthResult = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Verifying email code for sign-up: $signUpId")
            
            val url = URL("${ClerkConfig.FRONTEND_API}/v1/client/sign_ups/$signUpId/attempt_verification")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            val requestBody = JSONObject().apply {
                put("strategy", "email_code")
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
            
            Log.d(TAG, "Verification response code: $responseCode")
            Log.d(TAG, "Verification response: ${responseBody.take(500)}")
            
            if (responseCode != HttpURLConnection.HTTP_OK) {
                val errorMessage = try {
                    val errorJson = JSONObject(responseBody)
                    val errors = errorJson.optJSONArray("errors")
                    if (errors != null && errors.length() > 0) {
                        errors.getJSONObject(0).optString("message", "Invalid code")
                    } else {
                        "Invalid verification code"
                    }
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
