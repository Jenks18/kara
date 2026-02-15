package com.mafutapass.app.auth

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import androidx.work.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
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
 * - Primary storage: Android AccountManager (system-level accounts)
 * - Fallback: EncryptedSharedPreferences (for migration)
 * - Legacy support: Plain SharedPreferences (old app versions)
 * - Background token refresh via WorkManager
 * - Async-first API (no blocking calls)
 */
class TokenRepository private constructor(context: Context) {
    companion object {
        private const val TAG = "TokenRepository"
        private const val PREFS_NAME = "clerk_session_encrypted"
        private const val LEGACY_PREFS_NAME = "clerk_session" // Old non-encrypted location
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
    
    // AccountHelper for system-level account management (PRIMARY)
    private val accountHelper: AccountHelper by lazy {
        AccountHelper.getInstance(appContext)
    }

    // Legacy SharedPreferences (for backward compatibility)
    private val legacyPrefs: SharedPreferences by lazy {
        appContext.getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE)
    }

    // Encrypted SharedPreferences (FALLBACK)
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
        // Initialize token state - check AccountManager first, then fallbacks
        val (token, userId) = getTokenFromBestSource()
        
        _tokenState.value = when {
            token != null && userId != null && !isTokenExpired(token) -> {
                try {
                    scheduleRefreshIfNeeded()
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to schedule refresh: ${e.message}")
                }
                TokenState.Valid(token, userId)
            }
            else -> TokenState.Invalid
        }
    }
    
    /**
     * Get token from the best available source.
     * Priority: AccountManager > EncryptedPrefs > LegacyPrefs
     */
    private fun getTokenFromBestSource(): Pair<String?, String?> {
        // 1. Try AccountManager (primary)
        val accountToken = accountHelper.getClerkToken()
        val accountUserId = accountHelper.getUserId()
        if (accountToken != null && accountUserId != null) {
            Log.d(TAG, "✅ Token loaded from AccountManager")
            return accountToken to accountUserId
        }
        
        // 2. Try EncryptedSharedPreferences
        val encryptedToken = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        val encryptedUserId = encryptedPrefs.getString(KEY_USER_ID, null)
        if (encryptedToken != null && encryptedUserId != null) {
            val encryptedEmail = encryptedPrefs.getString(KEY_USER_EMAIL, "") ?: ""
            Log.d(TAG, "🔄 Migrating token from EncryptedPrefs to AccountManager")
            migrateToAccountManager(encryptedToken, encryptedUserId, encryptedEmail)
            return encryptedToken to encryptedUserId
        }
        
        // 3. Try legacy SharedPreferences
        val legacyToken = legacyPrefs.getString("session_token", null)
        val legacyUserId = legacyPrefs.getString("user_id", null)
        if (legacyToken != null && legacyUserId != null) {
            val legacyEmail = legacyPrefs.getString("user_email", "") ?: ""
            Log.d(TAG, "🔄 Migrating token from LegacyPrefs to AccountManager")
            migrateToAccountManager(legacyToken, legacyUserId, legacyEmail)
            return legacyToken to legacyUserId
        }
        
        return null to null
    }
    
    private fun migrateToAccountManager(token: String, userId: String, email: String) {
        // Run migration asynchronously to avoid blocking main thread
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val expiry = extractTokenExpiry(token) * 1000 // Convert to milliseconds
                accountHelper.signIn(
                    email = email,
                    userId = userId,
                    clerkToken = token,
                    expiresAt = expiry
                )
                // Clear old storage after successful migration
                encryptedPrefs.edit().clear().apply()
                legacyPrefs.edit().clear().apply()
                Log.d(TAG, "✅ Migration to AccountManager complete")
            } catch (e: Exception) {
                Log.w(TAG, "Migration to AccountManager failed: ${e.message}")
            }
        }
    }

    /**
     * Get current valid token asynchronously. Never blocks.
     * Returns null if no valid token available.
     */
    suspend fun getValidTokenAsync(): String? = mutex.withLock {
        // Check AccountManager first
        val accountToken = accountHelper.getClerkToken()
        val accountUserId = accountHelper.getUserId()
        
        if (accountToken != null && accountUserId != null) {
            return if (isTokenExpired(accountToken)) {
                refreshTokenImmediate(accountToken)
            } else {
                accountToken
            }
        }
        
        // Fallback to encrypted prefs
        val encryptedToken = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        if (encryptedToken != null) {
            val userId = encryptedPrefs.getString(KEY_USER_ID, null) ?: ""
            val email = encryptedPrefs.getString(KEY_USER_EMAIL, "") ?: ""
            migrateToAccountManager(encryptedToken, userId, email)
            return encryptedToken
        }
        
        // Fallback to legacy prefs
        val legacyToken = legacyPrefs.getString("session_token", null)
        if (legacyToken != null) {
            val userId = legacyPrefs.getString("user_id", null) ?: ""
            val email = legacyPrefs.getString("user_email", "") ?: ""
            migrateToAccountManager(legacyToken, userId, email)
            return legacyToken
        }
        
        _tokenState.value = TokenState.Invalid
        null
    }

    /**
     * Store new token (called after successful sign-in)
     * Now uses AccountManager as primary storage
     */
    suspend fun storeToken(token: String, userId: String, userEmail: String) {
        val expiry = try {
            extractTokenExpiry(token) * 1000 // Convert to milliseconds
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Failed to parse token expiry, using 1-hour default: ${e.message}")
            System.currentTimeMillis() + (3600 * 1000) // 1 hour default
        }
        
        // Store in AccountManager (primary)
        val success = accountHelper.signIn(
            email = userEmail,
            userId = userId,
            clerkToken = token,
            expiresAt = expiry
        )
        
        if (success) {
            _tokenState.value = TokenState.Valid(token, userId)
            scheduleRefreshIfNeeded()
            Log.d(TAG, "✅ Token stored in AccountManager")
        } else {
            // Fallback to EncryptedPrefs if AccountManager fails
            encryptedPrefs.edit()
                .putString(KEY_ACCESS_TOKEN, token)
                .putString(KEY_USER_ID, userId)
                .putString(KEY_USER_EMAIL, userEmail)
                .putLong(KEY_TOKEN_EXPIRES_AT, extractTokenExpiry(token))
                .apply()
            
            _tokenState.value = TokenState.Valid(token, userId)
            scheduleRefreshIfNeeded()
            Log.w(TAG, "⚠️ AccountManager failed, stored in EncryptedPrefs")
        }
    }
    
    /**
     * Legacy sync method for backward compatibility.
     * Uses CoroutineScope to avoid blocking the calling thread.
     */
    fun storeTokenSync(token: String, userId: String, userEmail: String) {
        CoroutineScope(Dispatchers.IO).launch {
            storeToken(token, userId, userEmail)
        }
    }

    /**
     * Clear all tokens (sign out)
     */
    suspend fun clearTokens() {
        // Clear AccountManager
        accountHelper.signOut()
        
        // Clear encrypted prefs
        encryptedPrefs.edit().clear().apply()
        
        // Clear legacy prefs
        legacyPrefs.edit().clear().apply()
        
        _tokenState.value = TokenState.Invalid
        WorkManager.getInstance(appContext).cancelAllWorkByTag("token_refresh")
        Log.d(TAG, "🔑 All tokens cleared from all storage locations")
    }
    
    /**
     * Legacy sync method for backward compatibility.
     * Uses CoroutineScope to avoid blocking the calling thread.
     */
    fun clearTokensSync() {
        CoroutineScope(Dispatchers.IO).launch {
            clearTokens()
        }
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
                val userEmail = json.optString("email", accountHelper.getUserEmail() ?: "")
                
                if (newToken.isNotEmpty() && userId.isNotEmpty()) {
                    // Update token in AccountManager (primary)
                    val expiry = extractTokenExpiry(newToken) * 1000
                    accountHelper.updateTokens(newToken, null, expiry)
                        
                    _tokenState.value = TokenState.Valid(newToken, userId)
                    scheduleRefreshIfNeeded()
                    Log.d(TAG, "✅ Token refreshed immediately (stored in AccountManager)")
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
        // Try AccountManager first, then encrypted prefs
        val token = accountHelper.getClerkToken() 
            ?: encryptedPrefs.getString(KEY_ACCESS_TOKEN, null) 
            ?: return
        
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