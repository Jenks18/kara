package com.mafutapass.app.auth

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Singleton token manager that handles JWT refresh transparently.
 *
 * Call [getValidToken] before any API request. If the stored JWT is expired
 * or about to expire (within 5 minutes), it will automatically call the
 * /api/auth/mobile-refresh endpoint to obtain a fresh token.
 */
object TokenManager {
    private const val TAG = "TokenManager"
    private const val REFRESH_MARGIN_SECONDS = 30L // refresh 30 seconds before actual expiry
    private val mutex = Mutex() // prevent concurrent refresh races

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Returns a valid (non-expired) session token, refreshing if needed.
     * Returns null if no token is stored or refresh fails.
     */
    suspend fun getValidToken(context: Context): String? {
        val prefs = context.getSharedPreferences("clerk_session", Context.MODE_PRIVATE)
        val token = prefs.getString("session_token", null) ?: return null

        // Check if token is actually expired or expiring soon
        if (!isTokenExpiringSoon(token)) {
            return token
        }

        // Token is expired or expiring soon — try to refresh
        return mutex.withLock {
            // Re-read after acquiring lock (another coroutine may have refreshed)
            val currentToken = prefs.getString("session_token", null) ?: return@withLock null
            if (!isTokenExpiringSoon(currentToken)) {
                return@withLock currentToken
            }

            Log.d(TAG, "Token expiring in <30s, refreshing...")
            refreshToken(currentToken, prefs)
        }
    }

    /**
     * Check if a JWT is expiring within [REFRESH_MARGIN_SECONDS].
     */
    private fun isTokenExpiringSoon(token: String): Boolean {
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return true
            val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP))
            val json = JSONObject(payload)
            val exp = json.optLong("exp", 0)
            if (exp == 0L) return true
            val now = System.currentTimeMillis() / 1000
            (exp - now) < REFRESH_MARGIN_SECONDS
        } catch (e: Exception) {
            Log.w(TAG, "Failed to decode token expiry: ${e.message}")
            true // assume expired if we can't decode
        }
    }

    /**
     * Call the backend refresh endpoint to get a fresh JWT.
     */
    private suspend fun refreshToken(oldToken: String, prefs: SharedPreferences): String? {
        return try {
            withContext(Dispatchers.IO) {
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
                    if (newToken.isNotEmpty()) {
                        prefs.edit().putString("session_token", newToken).apply()
                        Log.d(TAG, "✅ Token refreshed successfully")
                        newToken
                    } else {
                        Log.e(TAG, "Refresh response missing token")
                        null
                    }
                } else {
                    Log.e(TAG, "Refresh failed: ${response.code} — $body")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Refresh error: ${e.message}")
            null
        }
    }
}
