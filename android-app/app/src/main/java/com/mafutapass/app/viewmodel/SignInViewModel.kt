package com.mafutapass.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.auth.ClerkAuthManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SignInViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<SignInUiState>(SignInUiState.Idle)
    val uiState = _uiState.asStateFlow()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = SignInUiState.Loading
            
            val result = ClerkAuthManager.signIn(email, password)
            
            _uiState.value = if (result.success) {
                SignInUiState.Success
            } else {
                SignInUiState.Error(result.error ?: "Failed to sign in")
            }
        }
    }

    sealed interface SignInUiState {
        data object Idle : SignInUiState
        data object Loading : SignInUiState
        data class Error(val message: String) : SignInUiState
        data object Success : SignInUiState
    }
}
