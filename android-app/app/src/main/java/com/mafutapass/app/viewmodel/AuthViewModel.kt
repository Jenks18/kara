package com.mafutapass.app.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState = _authState.asStateFlow()

    private val prefs = application.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)

    init {
        Log.d("AuthViewModel", "Initializing AuthViewModel...")
        checkAuthState()
    }

    fun checkAuthState() {
        viewModelScope.launch {
            val token = prefs.getString("session_token", null)
            val userId = prefs.getString("user_id", null)
            
            _authState.value = if (token != null && userId != null) {
                Log.d("AuthViewModel", "User is signed in (userId: $userId)")
                AuthState.SignedIn
            } else {
                Log.d("AuthViewModel", "User is signed out")
                AuthState.SignedOut
            }
        }
    }

    fun refreshAuthState() {
        Log.d("AuthViewModel", "refreshAuthState() called")
        checkAuthState()
    }

    fun signOut() {
        Log.d("AuthViewModel", "Sign out initiated")
        viewModelScope.launch {
            // Clear all stored auth data
            prefs.edit().clear().commit()
            _authState.value = AuthState.SignedOut
            Log.d("AuthViewModel", "✅ Sign out complete")
        }
    }
}

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedIn : AuthState
    data object SignedOut : AuthState
}
