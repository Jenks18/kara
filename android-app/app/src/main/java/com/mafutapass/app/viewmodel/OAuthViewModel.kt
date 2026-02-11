package com.mafutapass.app.viewmodel

import android.app.Application
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel for OAuth authentication via browser redirect.
 * \n * Flow:
 * 1. Opens browser to web app's Google OAuth page
 * 2. User completes OAuth flow in browser
 * 3. Web app redirects back to Android app with session
 * 
 * Requirements:
 * - Google OAuth configured in Clerk Dashboard (already done)
 * - Web app OAuth working (already done)
 * - Deep link configured: com.mafutapass.app://callback
 */
class OAuthViewModel(application: Application) : AndroidViewModel(application) {
    
    companion object {
        private const val TAG = "OAuthViewModel"
        // Add mobile=true parameter so web knows to redirect back to app
        private const val WEB_OAUTH_URL = "https://mafutapass.com/sign-in?mobile=true"
    }

    private val _oauthState = MutableStateFlow<OAuthState>(OAuthState.Idle)
    val oauthState: StateFlow<OAuthState> = _oauthState.asStateFlow()

    /**
     * Sign in with Google by redirecting to web app.
     * Opens Chrome Custom Tab to web app's sign-in page.
     * 
     * @param context Android context for opening browser
     */
    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            try {
                Log.d(TAG, "🚀 Opening web app for Google Sign-In")
                _oauthState.value = OAuthState.Loading

                // Open web app in Chrome Custom Tab
                val customTabsIntent = CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build()

                customTabsIntent.launchUrl(context, Uri.parse(WEB_OAUTH_URL))

                // State will be updated when app receives deep link callback
                Log.d(TAG, "✅ Opened web app for authentication")

            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to open web app", e)
                _oauthState.value = OAuthState.Error(e.message ?: "Failed to open browser")
            }
        }
    }

    /**
     * Reset the OAuth state to idle
     */
    fun resetState() {
        _oauthState.value = OAuthState.Idle
    }
}

/**
 * Represents the state of the OAuth authentication flow
 */
sealed class OAuthState {
    object Idle : OAuthState()
    object Loading : OAuthState()
    object Success : OAuthState()
    data class Error(val message: String) : OAuthState()
}
