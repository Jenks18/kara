package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
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

class AuthViewModel : ViewModel() {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState = _authState.asStateFlow()
    
    init {
        try {
            // Monitor both userFlow AND sessionFlow for OAuth callback detection
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
            Log.e("AuthViewModel", "Error in init", e)
            _authState.value = AuthState.SignedOut
        }
    }

    fun signOut() {
        viewModelScope.launch {
            Clerk.signOut()
                .onSuccess { _authState.value = AuthState.SignedOut }
                .onFailure {
                    Log.e("AuthViewModel", it.errorMessage, it.throwable)
                }
        }
    }
}

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedIn : AuthState
    data object SignedOut : AuthState
}
