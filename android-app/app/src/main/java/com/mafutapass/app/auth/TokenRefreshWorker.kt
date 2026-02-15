package com.mafutapass.app.auth

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Background worker that refreshes tokens without blocking the UI.
 * Runs when the token is about to expire, even if the app is in background.
 */
class TokenRefreshWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "TokenRefreshWorker"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)  // Longer timeout for background work
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "🔄 Background token refresh started")
        
        val tokenRepository = TokenRepository.getInstance(applicationContext)
        
        try {
            // Get current token from TokenRepository (uses AccountManager -> EncryptedPrefs -> Legacy fallback)
            val oldToken = tokenRepository.getValidTokenAsync()
            
            if (oldToken == null) {
                Log.w(TAG, "❌ No token found for refresh")
                return@withContext Result.failure()
            }

            // Call refresh endpoint
            val request = Request.Builder()
                .url("https://www.mafutapass.com/api/auth/mobile-refresh")
                .post("{}".toRequestBody("application/json".toMediaType()))
                .addHeader("Authorization", "Bearer $oldToken")
                .build()

            val response = client.newCall(request).execute()
            val body = response.body.string()

            if (response.isSuccessful) {
                val json = JSONObject(body)
                val newToken = json.optString("token", "")
                val userId = json.optString("userId", "")
                val userEmail = json.optString("email", "")
                
                if (newToken.isNotEmpty() && userId.isNotEmpty()) {
                    // Store the new token using TokenRepository
                    tokenRepository.storeToken(newToken, userId, userEmail)
                    
                    Log.d(TAG, "✅ Background token refresh successful")
                    Result.success()
                } else {
                    Log.e(TAG, "❌ Invalid refresh response: missing token or userId")
                    Result.failure()
                }
            } else {
                Log.e(TAG, "❌ Background refresh failed: ${response.code}")
                
                // Retry on server errors, fail on auth errors
                if (response.code in 500..599) {
                    Result.retry()  // Temporary server issue
                } else {
                    tokenRepository.clearTokens()  // Invalid auth
                    Result.failure()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Background refresh exception: ${e.message}")
            // Retry on network errors
            Result.retry()
        }
    }
}