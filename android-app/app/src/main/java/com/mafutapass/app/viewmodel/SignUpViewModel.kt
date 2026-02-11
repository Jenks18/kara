package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.auth.ClerkAuthManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SignUpViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<SignUpUiState>(SignUpUiState.SignedOut)
    val uiState = _uiState.asStateFlow()

    fun signUp(email: String, password: String, firstName: String = "", lastName: String = "") {
        viewModelScope.launch {
            _uiState.value = SignUpUiState.Loading
            
            val result = ClerkAuthManager.signUp(email, password, firstName, lastName)
            
            _uiState.value = when {
                result.success -> SignUpUiState.Success
                result.error == "EMAIL_VERIFICATION_REQUIRED" -> SignUpUiState.NeedsVerification
                else -> SignUpUiState.Error(result.error ?: "Sign up failed")
            }
        }
    }

    fun verify(code: String) {
        // TODO: Implement email verification via Clerk API
        // For now, just show success
        _uiState.value = SignUpUiState.Success
    }

    sealed interface SignUpUiState {
        data object SignedOut : SignUpUiState
        data object Loading : SignUpUiState
        data object Success : SignUpUiState
        data object NeedsVerification : SignUpUiState
        data class Error(val message: String) : SignUpUiState
    }
}
