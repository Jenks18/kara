package com.mafutapass.app.auth

import android.accounts.Account
import android.accounts.AccountManager
import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Helper class for managing Android AccountManager accounts.
 * 
 * This provides a clean API for:
 * - Creating and removing accounts
 * - Storing and retrieving auth tokens
 * - Managing user data (email, userId, expiry)
 * - Account discovery and validation
 * 
 * Accounts appear in Settings > Accounts and survive app reinstalls (with backup).
 */
class AccountHelper private constructor(private val context: Context) {
    
    private val accountManager: AccountManager = AccountManager.get(context)
    
    companion object {
        private const val TAG = "AccountHelper"
        
        @Volatile
        private var instance: AccountHelper? = null
        
        fun getInstance(context: Context): AccountHelper {
            return instance ?: synchronized(this) {
                instance ?: AccountHelper(context.applicationContext).also { instance = it }
            }
        }
    }
    
    /**
     * Get the current signed-in account, if any.
     */
    fun getCurrentAccount(): Account? {
        val accounts = accountManager.getAccountsByType(MafutaAccountAuthenticator.ACCOUNT_TYPE)
        return accounts.firstOrNull()
    }
    
    /**
     * Check if user is signed in with a valid account.
     */
    fun isSignedIn(): Boolean = getCurrentAccount() != null
    
    /**
     * Create or update an account with the given credentials.
     * 
     * @param email User's email (used as account name)
     * @param userId Clerk/Supabase user ID
     * @param clerkToken Clerk session token
     * @param supabaseToken Supabase access token
     * @param expiresAt Token expiry timestamp in milliseconds
     */
    suspend fun signIn(
        email: String,
        userId: String,
        clerkToken: String,
        supabaseToken: String? = null,
        expiresAt: Long
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            // Remove existing account if present
            getCurrentAccount()?.let { existing ->
                accountManager.removeAccountExplicitly(existing)
            }
            
            // Create new account
            val account = Account(email, MafutaAccountAuthenticator.ACCOUNT_TYPE)
            
            val userData = mapOf(
                MafutaAccountAuthenticator.KEY_USER_ID to userId,
                MafutaAccountAuthenticator.KEY_USER_EMAIL to email,
                MafutaAccountAuthenticator.KEY_TOKEN_EXPIRY to expiresAt.toString()
            )
            
            val success = accountManager.addAccountExplicitly(
                account,
                null, // No password needed, we use tokens
                android.os.Bundle().apply {
                    userData.forEach { (key, value) -> putString(key, value) }
                }
            )
            
            if (success) {
                // Store auth tokens
                accountManager.setAuthToken(
                    account, 
                    MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_CLERK, 
                    clerkToken
                )
                
                supabaseToken?.let {
                    accountManager.setAuthToken(
                        account,
                        MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_SUPABASE,
                        it
                    )
                }
                
                Log.d(TAG, "Account created successfully for $email")
            } else {
                // Account might already exist, try to update tokens
                accountManager.setAuthToken(
                    account,
                    MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_CLERK,
                    clerkToken
                )
                accountManager.setUserData(account, MafutaAccountAuthenticator.KEY_TOKEN_EXPIRY, expiresAt.toString())
                Log.d(TAG, "Updated existing account for $email")
            }
            
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create account", e)
            false
        }
    }
    
    /**
     * Get the Clerk session token for the current account.
     */
    fun getClerkToken(): String? {
        val account = getCurrentAccount() ?: return null
        return accountManager.peekAuthToken(account, MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_CLERK)
    }
    
    /**
     * Get the Supabase access token for the current account.
     */
    fun getSupabaseToken(): String? {
        val account = getCurrentAccount() ?: return null
        return accountManager.peekAuthToken(account, MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_SUPABASE)
    }
    
    /**
     * Get the token expiry timestamp.
     */
    fun getTokenExpiry(): Long? {
        val account = getCurrentAccount() ?: return null
        return accountManager.getUserData(account, MafutaAccountAuthenticator.KEY_TOKEN_EXPIRY)?.toLongOrNull()
    }
    
    /**
     * Get the user ID for the current account.
     */
    fun getUserId(): String? {
        val account = getCurrentAccount() ?: return null
        return accountManager.getUserData(account, MafutaAccountAuthenticator.KEY_USER_ID)
    }
    
    /**
     * Get the user email for the current account.
     */
    fun getUserEmail(): String? {
        return getCurrentAccount()?.name
    }
    
    /**
     * Check if the current token is valid (not expired).
     */
    fun isTokenValid(): Boolean {
        val expiry = getTokenExpiry() ?: return false
        // Add 5 minute buffer before expiry
        return System.currentTimeMillis() < (expiry - 5 * 60 * 1000)
    }
    
    /**
     * Update the auth tokens for the current account.
     */
    suspend fun updateTokens(
        clerkToken: String,
        supabaseToken: String? = null,
        expiresAt: Long
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val account = getCurrentAccount() ?: return@withContext false
            
            // Invalidate old tokens
            accountManager.peekAuthToken(account, MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_CLERK)?.let {
                accountManager.invalidateAuthToken(MafutaAccountAuthenticator.ACCOUNT_TYPE, it)
            }
            
            // Set new tokens
            accountManager.setAuthToken(
                account,
                MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_CLERK,
                clerkToken
            )
            
            supabaseToken?.let {
                accountManager.setAuthToken(
                    account,
                    MafutaAccountAuthenticator.AUTH_TOKEN_TYPE_SUPABASE,
                    it
                )
            }
            
            // Update expiry
            accountManager.setUserData(
                account,
                MafutaAccountAuthenticator.KEY_TOKEN_EXPIRY,
                expiresAt.toString()
            )
            
            Log.d(TAG, "Tokens updated successfully")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update tokens", e)
            false
        }
    }
    
    /**
     * Sign out by removing the account.
     */
    suspend fun signOut(): Boolean = withContext(Dispatchers.IO) {
        try {
            val account = getCurrentAccount() ?: return@withContext true
            val result = accountManager.removeAccountExplicitly(account)
            Log.d(TAG, "Account removed: $result")
            result
        } catch (e: Exception) {
            Log.e(TAG, "Failed to remove account", e)
            false
        }
    }
}
