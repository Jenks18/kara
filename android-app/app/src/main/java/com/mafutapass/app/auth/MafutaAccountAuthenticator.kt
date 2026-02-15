package com.mafutapass.app.auth

import android.accounts.AbstractAccountAuthenticator
import android.accounts.Account
import android.accounts.AccountAuthenticatorResponse
import android.accounts.AccountManager
import android.accounts.NetworkErrorException
import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.mafutapass.app.MainActivity

/**
 * AccountManager Authenticator for Mafuta Pass.
 * 
 * This integrates with the Android system account management:
 * - Accounts appear in Settings > Accounts
 * - Supports system-managed token storage
 * - Enables account syncing and backup
 * - Provides native Android account experience
 */
class MafutaAccountAuthenticator(
    private val context: Context
) : AbstractAccountAuthenticator(context) {

    companion object {
        const val ACCOUNT_TYPE = "com.mafutapass.app"
        const val AUTH_TOKEN_TYPE_CLERK = "clerk_session"
        const val KEY_USER_EMAIL = "user_email"
        const val KEY_USER_ID = "user_id"
        const val KEY_TOKEN_EXPIRY = "token_expiry"
    }

    override fun addAccount(
        response: AccountAuthenticatorResponse?,
        accountType: String?,
        authTokenType: String?,
        requiredFeatures: Array<out String>?,
        options: Bundle?
    ): Bundle {
        // Return intent to launch MainActivity (which contains SignInScreen)
        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra(AccountManager.KEY_ACCOUNT_AUTHENTICATOR_RESPONSE, response)
            putExtra("action", "add_account")
        }
        
        return Bundle().apply {
            putParcelable(AccountManager.KEY_INTENT, intent)
        }
    }

    override fun getAuthToken(
        response: AccountAuthenticatorResponse?,
        account: Account?,
        authTokenType: String?,
        options: Bundle?
    ): Bundle {
        if (account == null) {
            return Bundle().apply {
                putInt(AccountManager.KEY_ERROR_CODE, AccountManager.ERROR_CODE_BAD_ARGUMENTS)
                putString(AccountManager.KEY_ERROR_MESSAGE, "Account is null")
            }
        }

        val accountManager = AccountManager.get(context)
        
        // Try to get cached auth token
        val authToken = accountManager.peekAuthToken(account, authTokenType)
        
        if (!authToken.isNullOrEmpty()) {
            // Check if token is still valid
            val expiryStr = accountManager.getUserData(account, KEY_TOKEN_EXPIRY)
            val expiry = expiryStr?.toLongOrNull() ?: 0L
            
            if (System.currentTimeMillis() < expiry) {
                return Bundle().apply {
                    putString(AccountManager.KEY_ACCOUNT_NAME, account.name)
                    putString(AccountManager.KEY_ACCOUNT_TYPE, account.type)
                    putString(AccountManager.KEY_AUTHTOKEN, authToken)
                }
            } else {
                // Token expired, invalidate it
                accountManager.invalidateAuthToken(ACCOUNT_TYPE, authToken)
            }
        }
        
        // No valid token, need to re-authenticate
        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra(AccountManager.KEY_ACCOUNT_AUTHENTICATOR_RESPONSE, response)
            putExtra(AccountManager.KEY_ACCOUNT_NAME, account.name)
            putExtra(AccountManager.KEY_ACCOUNT_TYPE, account.type)
            putExtra("action", "re_authenticate")
        }
        
        return Bundle().apply {
            putParcelable(AccountManager.KEY_INTENT, intent)
        }
    }

    override fun confirmCredentials(
        response: AccountAuthenticatorResponse?,
        account: Account?,
        options: Bundle?
    ): Bundle? = null

    override fun editProperties(
        response: AccountAuthenticatorResponse?,
        accountType: String?
    ): Bundle? = null

    override fun getAuthTokenLabel(authTokenType: String?): String {
        return when (authTokenType) {
            AUTH_TOKEN_TYPE_CLERK -> "Clerk Session"
            else -> "Session Token"
        }
    }

    override fun hasFeatures(
        response: AccountAuthenticatorResponse?,
        account: Account?,
        features: Array<out String>?
    ): Bundle {
        return Bundle().apply {
            putBoolean(AccountManager.KEY_BOOLEAN_RESULT, false)
        }
    }

    override fun updateCredentials(
        response: AccountAuthenticatorResponse?,
        account: Account?,
        authTokenType: String?,
        options: Bundle?
    ): Bundle? = null
}
