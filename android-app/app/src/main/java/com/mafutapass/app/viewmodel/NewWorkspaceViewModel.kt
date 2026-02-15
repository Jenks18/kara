package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.CreateWorkspaceRequest
import com.mafutapass.app.data.Workspace
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NewWorkspaceViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _isCreating = MutableStateFlow(false)
    val isCreating: StateFlow<Boolean> = _isCreating

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun createWorkspace(
        name: String,
        currency: String,
        currencySymbol: String,
        onSuccess: () -> Unit
    ) {
        if (name.isBlank() || _isCreating.value) return
        _isCreating.value = true
        _error.value = null

        viewModelScope.launch {
            try {
                apiService.createWorkspace(
                    CreateWorkspaceRequest(
                        name = name.trim(),
                        currency = currency,
                        currencySymbol = currencySymbol
                    )
                )
                onSuccess()
            } catch (e: Exception) {
                Log.e("NewWorkspaceVM", "Failed to create workspace: ${e.message}", e)
                _error.value = "Failed to create workspace"
                _isCreating.value = false
            }
        }
    }
}
