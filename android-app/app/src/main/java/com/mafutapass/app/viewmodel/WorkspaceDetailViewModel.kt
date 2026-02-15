package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.Workspace
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WorkspaceDetailViewModel @Inject constructor(
    private val apiService: ApiService,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _workspace = MutableStateFlow<Workspace?>(null)
    val workspace: StateFlow<Workspace?> = _workspace

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun fetchWorkspace(workspaceId: String, fallbackName: String = "Workspace") {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                _workspace.value = apiService.getWorkspace(workspaceId)
            } catch (e: Exception) {
                Log.e("WorkspaceDetailVM", "Failed to fetch: ${e.message}", e)
                _error.value = e.message
                // Provide fallback workspace so UI doesn't break
                _workspace.value = Workspace(
                    id = workspaceId,
                    name = fallbackName.ifEmpty { "Workspace" },
                    currency = "KES",
                    currencySymbol = "KSh"
                )
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteWorkspace(workspaceId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                apiService.deleteWorkspace(workspaceId)
                onSuccess()
            } catch (e: Exception) {
                Log.e("WorkspaceDetailVM", "Delete failed: ${e.message}")
                _error.value = "Failed to delete workspace"
            }
        }
    }
}
