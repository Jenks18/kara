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
     * After successful authentication, syncs the user to Clerk.
     * 
     * @param idToken The Google ID token obtained from Credential Manager
     */
    suspend fun signInWithGoogleIdToken(idToken: String): Result<String> {
        return try {
            Log.d(TAG, "🚀 Starting Google Sign-In with ID token")
            _authState.value = SupabaseAuthState.Loading

            // Authenticate with Supabase using the Google ID token
            supabase.auth.signInWith(IDToken) {
                this.idToken = idToken
                provider = Google
            }

            // After successful authentication, get the user
            val user = supabase.auth.currentUserOrNull()
            if (user == null) {
                Log.e(TAG, "❌ No user after Supabase authentication")
                _authState.value = SupabaseAuthState.Error("Authentication failed")
                return Result.failure(Exception("No user after authentication"))
            }

            Log.d(TAG, "✅ Supabase authentication successful")
            Log.d(TAG, "User ID: ${user.id}")
            Log.d(TAG, "User email: ${user.email}")

            // Now sync this user to Clerk
            val email = user.email ?: run {
                Log.e(TAG, "❌ No email from Supabase user")
                _authState.value = SupabaseAuthState.Error("No email provided")
                return Result.failure(Exception("No email from OAuth"))
            }

            // Get user's full name from metadata
            val userMetadata = user.userMetadata
            val fullName = userMetadata?.get("full_name")?.toString() ?: ""
            val firstName = userMetadata?.get("given_name")?.toString() ?: fullName.split(" ").firstOrNull() ?: ""
            val lastName = userMetadata?.get("family_name")?.toString() ?: fullName.split(" ").getOrNull(1) ?: ""
            
            Log.d(TAG, "🔄 Syncing user to Clerk: $email")
            
            // Sync user to Clerk (sign in or sign up)
            // Note: This path is not currently used - we use Credential Manager instead
            val clerkResult = clerkAuthManager.signInOrSignUpWithOAuth(
                idToken = "", // Not available in Supabase flow
                email = email,
                firstName = firstName,
                lastName = lastName,
                oauthProvider = "google"
            )

            clerkResult.fold(
                onSuccess = { sessionToken ->
                    Log.d(TAG, "✅ Clerk session created successfully")
                    _authState.value = SupabaseAuthState.Success(email)
                    Result.success(sessionToken)
                },
                onFailure = { error ->
                    Log.e(TAG, "❌ Failed to create Clerk session: ${error.message}")
                    _authState.value = SupabaseAuthState.Error(error.message ?: "Clerk sync failed")
                    Result.failure(error)
                }
            )
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
