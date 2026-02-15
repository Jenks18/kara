package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.data.WorkspaceMember
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WorkspaceMembersViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _workspace = MutableStateFlow<Workspace?>(null)
    val workspace: StateFlow<Workspace?> = _workspace

    private val _members = MutableStateFlow<List<WorkspaceMember>>(emptyList())
    val members: StateFlow<List<WorkspaceMember>> = _members

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadWorkspaceAndMembers(workspaceId: String) {
        _isLoading.value = true
        _error.value = null

        viewModelScope.launch {
            try {
                // Fetch workspace details
                _workspace.value = apiService.getWorkspace(workspaceId)

                // Fetch members
                try {
                    val response = apiService.getWorkspaceMembers(workspaceId)
                    _members.value = response.members
                } catch (e: Exception) {
                    Log.w("WorkspaceMembersVM", "Members endpoint not available: ${e.message}")
                    _members.value = emptyList()
                }
            } catch (e: Exception) {
                Log.e("WorkspaceMembersVM", "Failed to fetch: ${e.message}", e)
                _error.value = e.message
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
                Log.e("WorkspaceMembersVM", "Delete failed: ${e.message}")
                _error.value = "Failed to delete workspace"
            }
        }
    }
}
