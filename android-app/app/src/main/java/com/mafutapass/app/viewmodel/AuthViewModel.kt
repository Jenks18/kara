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
        checkAuthState()
    }
    
    private fun checkAuthState() {
        try {
            // Check if we have a stored token (our native OAuth approach)
            val storedToken = prefs.getString("session_token", null)
            val storedUserId = prefs.getString("user_id", null)
            
            if (storedToken != null && storedUserId != null) {
                Log.d("AuthViewModel", "✓ Found stored session token for user: $storedUserId")
                _authState.value = AuthState.SignedIn
                return
            }
            
            // Fallback: Monitor Clerk SDK flows (for web-based OAuth)
            combine(Clerk.isInitialized, Clerk.userFlow, Clerk.sessionFlow) { isInitialized, user, session ->
                Log.d("AuthViewModel", "Auth state update - initialized: $isInitialized, user: ${user?.id}, session: ${session?.id}")
                _authState.value = when {
                    !isInitialized -> {
                        Log.d("AuthViewModel", "State: Loading (not initialized)")
                        AuthState.Loading
                    }
                    user != null && session != null -> {
                        Log.d("AuthViewModel", "✓ State: SignedIn (user: ${user.id}, session: ${session.id})")
                        AuthState.SignedIn
                    }
                    else -> {
                        Log.d("AuthViewModel", "State: SignedOut (no active session)")
                        AuthState.SignedOut
                    }
                }
            }
            .launchIn(viewModelScope)
        } catch (e: Exception) {
            Log.e("AuthViewModel", "Error in checkAuthState", e)
            _authState.value = AuthState.SignedOut
        }
    }
    
    fun refreshAuthState() {
        checkAuthState()
    }

    fun signOut() {
        viewModelScope.launch {
            // Clear stored token
            prefs.edit().clear().apply()
            
            // Also sign out from Clerk SDK if applicable
            Clerk.signOut()
                .onSuccess { _authState.value = AuthState.SignedOut }
                .onFailure {
                    Log.e("AuthViewModel", it.errorMessage, it.throwable)
                    _authState.value = AuthState.SignedOut
                }
        }
    }
}

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedIn : AuthState
    data object SignedOut : AuthState
}
