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
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WorkspaceMembersViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {
    private val TAG = "WorkspaceMembersVM"

    private val _workspace = MutableStateFlow<Workspace?>(null)
    val workspace: StateFlow<Workspace?> = _workspace.asStateFlow()

    private val _members = MutableStateFlow<List<WorkspaceMember>>(emptyList())
    val members: StateFlow<List<WorkspaceMember>> = _members.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadWorkspaceAndMembers(workspaceId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Fetch workspace details
                val ws = try {
                    apiService.getWorkspace(workspaceId)
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ Failed to fetch workspace: ${e.message}")
                    null
                }
                _workspace.value = ws

                // Fetch members
                val response = try {
                    apiService.getWorkspaceMembers(workspaceId)
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ Failed to fetch members: ${e.message}")
                    null
                }
                _members.value = response?.members ?: emptyList()
                Log.d(TAG, "✅ Loaded ${_members.value.size} members for workspace ${ws?.name}")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error loading workspace members: ${e.message}", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteWorkspace(workspaceId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                apiService.deleteWorkspace(workspaceId)
                Log.d(TAG, "✅ Workspace deleted")
                onSuccess()
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to delete workspace: ${e.message}", e)
            }
        }
    }
}
