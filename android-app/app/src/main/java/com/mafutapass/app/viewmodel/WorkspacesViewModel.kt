package com.mafutapass.app.viewmodel

import android.util.Log
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
class WorkspacesViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _workspaces = MutableStateFlow<List<Workspace>>(emptyList())
    val workspaces: StateFlow<List<Workspace>> = _workspaces

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        fetchWorkspaces()
    }

    fun fetchWorkspaces() {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val response = apiService.getWorkspaces()
                _workspaces.value = response.workspaces
            } catch (e: Exception) {
                Log.e("WorkspacesVM", "Failed to fetch workspaces: ${e.message}", e)
                _error.value = e.message
                _workspaces.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteWorkspace(id: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                apiService.deleteWorkspace(id)
                // Refresh list after deletion
                fetchWorkspaces()
                onSuccess()
            } catch (e: Exception) {
                Log.e("WorkspacesVM", "Delete failed: ${e.message}")
                _error.value = "Failed to delete workspace"
            }
        }
    }
}
