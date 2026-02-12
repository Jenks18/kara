package com.mafutapass.app.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState = _authState.asStateFlow()
    
    private val prefs = application.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    
    init {
        try {
            Log.d("AuthViewModel", "Initializing AuthViewModel...")
            checkAuthState()
            Log.d("AuthViewModel", "✅ AuthViewModel initialized")
        } catch (e: Exception) {
            Log.e("AuthViewModel", "❌ Error initializing auth state", e)
            _authState.value = AuthState.SignedOut
        }
    }
    
    private fun checkAuthState() {
        try {
            Log.d("AuthViewModel", "========== Checking auth state ==========")
            
            // Check if we have a stored token (our native OAuth approach)
            val storedToken = prefs.getString("session_token", null)
            val storedUserId = prefs.getString("user_id", null)
            val storedEmail = prefs.getString("user_email", null)
            
            Log.d("AuthViewModel", "Token exists: ${storedToken != null}")
            Log.d("AuthViewModel", "UserId exists: ${storedUserId != null}")
            Log.d("AuthViewModel", "Email: $storedEmail")
            
            if (storedToken != null && storedUserId != null) {
                Log.d("AuthViewModel", "✅ Found stored session - Setting SignedIn")
                _authState.value = AuthState.SignedIn
                Log.d("AuthViewModel", "Current state value: ${_authState.value}")
                return
            }
            
            Log.d("AuthViewModel", "❌ No stored token - Setting SignedOut")
            _authState.value = AuthState.SignedOut
            Log.d("AuthViewModel", "Current state value: ${_authState.value}")
            
        } catch (e: Exception) {
            Log.e("AuthViewModel", "❌ Error in checkAuthState", e)
            _authState.value = AuthState.SignedOut
        }
    }
    
    fun refreshAuthState() {
        Log.d("AuthViewModel", "📱 refreshAuthState() called")
        checkAuthState()
    }

    fun signOut() {
        try {
            Log.d("AuthViewModel", "========== SIGN OUT INITIATED ==========")
            
            // Log current state before clearing
            val tokenBefore = prefs.getString("session_token", null)
            Log.d("AuthViewModel", "Token before clear: ${if (tokenBefore != null) "EXISTS" else "NULL"}")
            
            // Clear stored token and user data using commit() for synchronous write
            val cleared = prefs.edit()
                .clear()
                .commit()  // Use commit() instead of apply() for immediate sync write
            
            Log.d("AuthViewModel", "SharedPreferences cleared: $cleared")
            
            // Verify it was cleared
            val tokenAfter = prefs.getString("session_token", null)
            Log.d("AuthViewModel", "Token after clear: ${if (tokenAfter != null) "STILL EXISTS!" else "NULL (good)"}")
            
            // Immediately update state
            _authState.value = AuthState.SignedOut
            
            Log.d("AuthViewModel", "✅ Auth state set to: ${_authState.value}")
            Log.d("AuthViewModel", "========== SIGN OUT COMPLETE ==========")
            
        } catch (e: Exception) {
            Log.e("AuthViewModel", "❌ Error during sign out", e)
            // Still force sign out state even if there's an error
            _authState.value = AuthState.SignedOut
        }
    }
}

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedIn : AuthState
    data object SignedOut : AuthState
}
