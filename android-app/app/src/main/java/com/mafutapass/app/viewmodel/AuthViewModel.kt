package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.auth.TokenRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val tokenRepository: TokenRepository
) : ViewModel() {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState = _authState.asStateFlow()

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
        viewModelScope.launch {
            tokenRepository.clearTokens()
            Log.d("AuthViewModel", "✅ Sign out complete")
        }
    }
}

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedIn : AuthState
    data object SignedOut : AuthState
}
