package com.mafutapass.app.auth

import android.util.Log

/**
 * Clerk configuration constants.
 * The publishable key is used by Credential Manager for Google OAuth.
 */
object ClerkConfig {
    const val PUBLISHABLE_KEY = "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k"
    const val FRONTEND_API = "https://clerk.mafutapass.com"
}

/**
 * Minimal ClerkAuthManager — all auth is handled by backend endpoints.
 * Android ViewModels talk to backend APIs which return valid JWTs.
 * This object only provides signOut() for session cleanup.
 */
object ClerkAuthManager {
    private const val TAG = "ClerkAuthManager"

    suspend fun signOut() {
        // Clerk sign out will be handled by the SDK
        // This is mainly for consistency with SupabaseAuthManager
        Log.d(TAG, "Signing out")
    }
}
