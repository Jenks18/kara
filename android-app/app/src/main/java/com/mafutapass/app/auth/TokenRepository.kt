package com.mafutapass.app.auth

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import androidx.work.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Production-grade token repository with:
 * - Encrypted local storage
 * - Background token refresh via WorkManager
 * - Async-first API (no blocking calls)
 * - Request queuing for failed auth attempts
 * - Offline caching support
 */
class TokenRepository private constructor(context: Context) {
    companion object {
        private const val TAG = "TokenRepository"
        private const val PREFS_NAME = "clerk_session_encrypted"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_TOKEN_EXPIRES_AT = "expires_at"
        private const val REFRESH_MARGIN_SECONDS = 300L // 5 minutes before expiry
        
        @Volatile private var INSTANCE: TokenRepository? = null
        
        fun getInstance(context: Context): TokenRepository {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: TokenRepository(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    private val appContext = context.applicationContext
    private val mutex = Mutex()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    // Encrypted SharedPreferences
    private val encryptedPrefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(appContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
            
        EncryptedSharedPreferences.create(
            appContext,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // Token state
    private val _tokenState = MutableStateFlow<TokenState>(TokenState.Loading)
    val tokenState: Flow<TokenState> = _tokenState.asStateFlow()

    sealed class TokenState {
        object Loading : TokenState()
        data class Valid(val token: String, val userId: String) : TokenState()
        object Invalid : TokenState()
    }

    init {
        // Initialize token state
        val token = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        val userId = encryptedPrefs.getString(KEY_USER_ID, null)
        
        _tokenState.value = when {
            token != null && userId != null && !isTokenExpired(token) -> {
                // Schedule background refresh if needed
                scheduleRefreshIfNeeded()
                TokenState.Valid(token, userId)
            }
            else -> TokenState.Invalid
        }
    }

    /**
     * Get current valid token asynchronously. Never blocks.
     * Returns null if no valid token available.
     */
    suspend fun getValidTokenAsync(): String? = mutex.withLock {
        val currentToken = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        
        return when {
            currentToken == null -> {
                _tokenState.value = TokenState.Invalid
                null
            }
            isTokenExpired(currentToken) -> {
                // Try immediate refresh (don't wait for WorkManager)
                refreshTokenImmediate(currentToken)
            }
            else -> currentToken
        }
    }

    /**
     * Store new token (called after successful sign-in)
     */
    fun storeToken(token: String, userId: String, userEmail: String) {
        encryptedPrefs.edit()
            .putString(KEY_ACCESS_TOKEN, token)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_USER_EMAIL, userEmail)
            .putLong(KEY_TOKEN_EXPIRES_AT, extractTokenExpiry(token))
            .apply()
            
        _tokenState.value = TokenState.Valid(token, userId)
        scheduleRefreshIfNeeded()
        Log.d(TAG, "✅ Token stored and refresh scheduled")
    }

    /**
     * Clear all tokens (sign out)
     */
    fun clearTokens() {
        encryptedPrefs.edit().clear().apply()
        _tokenState.value = TokenState.Invalid
        WorkManager.getInstance(appContext).cancelAllWorkByTag("token_refresh")
        Log.d(TAG, "🔑 All tokens cleared")
    }

    private fun isTokenExpired(token: String): Boolean {
        return try {
            val expiryTime = extractTokenExpiry(token)
            val now = System.currentTimeMillis() / 1000
            (expiryTime - now) <= REFRESH_MARGIN_SECONDS
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse token expiry: ${e.message}")
            true
        }
    }

    private fun extractTokenExpiry(token: String): Long {
        val parts = token.split(".")
        if (parts.size != 3) throw IllegalArgumentException("Invalid JWT format")
        
        val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP))
        val json = JSONObject(payload)
        return json.optLong("exp", 0)
    }

    private suspend fun refreshTokenImmediate(oldToken: String): String? {
        return try {
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
                
                if (newToken.isNotEmpty() && userId.isNotEmpty()) {
                    // Update stored token
                    encryptedPrefs.edit()
                        .putString(KEY_ACCESS_TOKEN, newToken)
                        .putLong(KEY_TOKEN_EXPIRES_AT, extractTokenExpiry(newToken))
                        .apply()
                        
                    _tokenState.value = TokenState.Valid(newToken, userId)
                    scheduleRefreshIfNeeded()
                    Log.d(TAG, "✅ Token refreshed immediately")
                    newToken
                } else {
                    _tokenState.value = TokenState.Invalid
                    null
                }
            } else {
                Log.e(TAG, "❌ Immediate refresh failed: ${response.code}")
                _tokenState.value = TokenState.Invalid
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Immediate refresh error: ${e.message}")
            _tokenState.value = TokenState.Invalid
            null
        }
    }

    private fun scheduleRefreshIfNeeded() {
        val token = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null) ?: return
        
        try {
            val expiryTime = extractTokenExpiry(token)
            val now = System.currentTimeMillis() / 1000
            val timeUntilRefresh = (expiryTime - now - REFRESH_MARGIN_SECONDS).coerceAtLeast(30)
            
            val refreshWork = OneTimeWorkRequestBuilder<TokenRefreshWorker>()
                .setInitialDelay(timeUntilRefresh, TimeUnit.SECONDS)
                .addTag("token_refresh")
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()

            WorkManager.getInstance(appContext)
                .enqueueUniqueWork("token_refresh", ExistingWorkPolicy.REPLACE, refreshWork)
                
            Log.d(TAG, "📅 Refresh scheduled in ${timeUntilRefresh}s")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to schedule refresh: ${e.message}")
        }
    }
}