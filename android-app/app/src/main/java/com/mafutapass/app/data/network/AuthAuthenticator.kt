package com.mafutapass.app.data.network

import android.util.Log
import com.mafutapass.app.auth.TokenRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp Authenticator that handles 401 responses by refreshing the token and retrying.
 * 
 * This is the modern production-grade approach for JWT authentication:
 * 1. When a 401 is received, this authenticator is called
 * 2. It refreshes the token via TokenRepository
 * 3. Retries the original request with the new token
 * 4. Uses a mutex to prevent multiple simultaneous refreshes
 * 
 * If token refresh fails, returns null to indicate authentication failure.
 */
@Singleton
class AuthAuthenticator @Inject constructor(
    private val tokenRepository: TokenRepository
) : Authenticator {
    
    companion object {
        private const val TAG = "AuthAuthenticator"
        private const val HEADER_AUTHORIZATION = "Authorization"
        private const val MAX_RETRY_COUNT = 2
    }
    
    // Mutex to prevent multiple simultaneous token refresh attempts
    private val refreshMutex = Mutex()
    
    override fun authenticate(route: Route?, response: Response): Request? {
        val failedRequest = response.request
        
        // Count how many times we've tried to authenticate this request
        val retryCount = response.priorResponse?.let { countRetries(it) } ?: 0
        
        if (retryCount >= MAX_RETRY_COUNT) {
            Log.e(TAG, "Max retry count ($MAX_RETRY_COUNT) exceeded for: ${failedRequest.url}")
            // Clear tokens on repeated auth failures - session is invalid
            runBlocking { tokenRepository.clearTokens() }
            return null
        }
        
        Log.d(TAG, "401 received for: ${failedRequest.url}, retry #${retryCount + 1}")
        
        // Try to refresh the token
        val newToken = runBlocking {
            refreshMutex.withLock {
                // Double-check: another thread might have already refreshed
                val currentToken = tokenRepository.getValidTokenAsync()
                val failedToken = failedRequest.header(HEADER_AUTHORIZATION)
                    ?.removePrefix("Bearer ")
                
                // If current token is different from failed one, use the new token
                if (currentToken != null && currentToken != failedToken) {
                    Log.d(TAG, "Using token refreshed by another request")
                    return@withLock currentToken
                }
                
                // Need to actually refresh
                Log.d(TAG, "Refreshing token...")
                refreshToken()
            }
        }
        
        if (newToken == null) {
            Log.e(TAG, "Token refresh failed, giving up")
            return null
        }
        
        Log.d(TAG, "Token refreshed successfully, retrying request")
        
        // Retry with new token
        return failedRequest.newBuilder()
            .removeHeader(HEADER_AUTHORIZATION)
            .addHeader(HEADER_AUTHORIZATION, "Bearer $newToken")
            .build()
    }
    
    /**
     * Refresh the token by calling the backend refresh endpoint.
     * Returns the new token or null if refresh failed.
     */
    private suspend fun refreshToken(): String? {
        return try {
            val oldToken = tokenRepository.getValidTokenAsync() ?: return null

            // Call the refresh endpoint with the current (rejected) token
            val client = okhttp3.OkHttpClient.Builder()
                .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .build()

            val request = okhttp3.Request.Builder()
                .url("https://www.mafutapass.com/api/auth/mobile-refresh")
                .post("{}".toRequestBody("application/json".toMediaType()))
                .addHeader("Authorization", "Bearer $oldToken")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val json = org.json.JSONObject(body)
                val newToken = json.optString("token", "")
                val userId = json.optString("userId", "")
                if (newToken.isNotEmpty() && userId.isNotEmpty()) {
                    tokenRepository.storeToken(newToken, userId, "")
                    Log.d(TAG, "✅ Token refreshed via /api/auth/mobile-refresh")
                    newToken
                } else {
                    Log.e(TAG, "Refresh response missing token or userId")
                    null
                }
            } else {
                Log.e(TAG, "Refresh endpoint returned ${response.code}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Token refresh error: ${e.message}")
            null
        }
    }
    
    /**
     * Count how many prior responses we have (number of retries)
     */
    private fun countRetries(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
