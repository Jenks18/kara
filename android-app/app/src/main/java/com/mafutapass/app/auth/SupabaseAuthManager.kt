package com.mafutapass.app.auth

import android.content.Context
import android.util.Log
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.builtin.IDToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Manages Supabase authentication using Google ID tokens.
 * After Supabase authentication succeeds, syncs the user to Clerk.
 */
class SupabaseAuthManager(
    private val context: Context,
    private val clerkAuthManager: ClerkAuthManager
) {
    companion object {
        private const val TAG = "SupabaseAuthManager"
        
        // Supabase configuration from web app
        private const val SUPABASE_URL = "https://bkypfuyiknytkuhxtduc.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXBmdXlpa255dGt1aHh0ZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODkxNjAsImV4cCI6MjA4MzA2NTE2MH0.7OqBp3VbfffoYt2xOYUuzYy_dOvDchvGftE4gqCfVKo"
    }

    private val supabase: SupabaseClient = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Auth)
    }

    private val _authState = MutableStateFlow<SupabaseAuthState>(SupabaseAuthState.Idle)
    val authState: StateFlow<SupabaseAuthState> = _authState.asStateFlow()

    /**
     * Sign in with Google using ID token (native sign-in).
     * 
     * @deprecated This flow is not used. Google Sign-In goes through
     * NativeOAuthViewModel -> Credential Manager -> /api/auth/google-native
     */
    @Suppress("unused")
    suspend fun signInWithGoogleIdToken(idToken: String): Result<String> {
        return try {
            Log.d(TAG, "🚀 Starting Google Sign-In with ID token")
            _authState.value = SupabaseAuthState.Loading

            // Authenticate with Supabase using the Google ID token
            supabase.auth.signInWith(IDToken) {
                this.idToken = idToken
                provider = Google
            }

            val user = supabase.auth.currentUserOrNull()
            if (user == null) {
                Log.e(TAG, "❌ No user after Supabase authentication")
                _authState.value = SupabaseAuthState.Error("Authentication failed")
                return Result.failure(Exception("No user after authentication"))
            }

            val email = user.email ?: "unknown"
            Log.d(TAG, "✅ Supabase authentication successful")
            _authState.value = SupabaseAuthState.Success(email)
            Result.success(user.id)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Google Sign-In with ID token failed", e)
            _authState.value = SupabaseAuthState.Error(e.message ?: "Unknown error")
            Result.failure(e)
        }
    }

    /**
     * Sign out from both Supabase and Clerk
     */
    suspend fun signOut() {
        try {
            supabase.auth.signOut()
            clerkAuthManager.signOut()
            _authState.value = SupabaseAuthState.Idle
            Log.d(TAG, "✅ Signed out successfully")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Sign out failed", e)
        }
    }
}

sealed class SupabaseAuthState {
    object Idle : SupabaseAuthState()
    object Loading : SupabaseAuthState()
    data class Success(val email: String) : SupabaseAuthState()
    data class Error(val message: String) : SupabaseAuthState()
}
