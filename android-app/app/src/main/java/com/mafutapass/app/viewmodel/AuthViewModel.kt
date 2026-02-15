package com.mafutapass.app.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.auth.TokenRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState = _authState.asStateFlow()

    private val tokenRepository = TokenRepository.getInstance(application)

    init {
        Log.d("AuthViewModel", "Initializing AuthViewModel...")
        
        // Listen to token repository state changes
        viewModelScope.launch {
            tokenRepository.tokenState.collect { tokenState ->
                _authState.value = when (tokenState) {
                    is TokenRepository.TokenState.Loading -> AuthState.Loading
                    is TokenRepository.TokenState.Valid -> AuthState.SignedIn
                    is TokenRepository.TokenState.Invalid -> AuthState.SignedOut
                }
            }
        }
    }

    fun checkAuthState() {
        // TokenRepository handles state automatically via flows
        Log.d("AuthViewModel", "Auth state managed by TokenRepository")
    }

    fun refreshAuthState() {
        Log.d("AuthViewModel", "refreshAuthState() called")
        checkAuthState()
    }

    fun signOut() {
        Log.d("AuthViewModel", "Sign out initiated")
        tokenRepository.clearTokens()
        Log.d("AuthViewModel", "✅ Sign out complete")
    }
}

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedIn : AuthState
    data object SignedOut : AuthState
}
