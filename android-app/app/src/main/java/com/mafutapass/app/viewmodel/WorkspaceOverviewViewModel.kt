package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.data.WorkspaceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WorkspaceOverviewViewModel @Inject constructor(
    private val apiService: ApiService,
    private val workspaceRepository: WorkspaceRepository
) : ViewModel() {
    private val TAG = "WorkspaceOverviewVM"

    private val _workspace = MutableStateFlow<Workspace?>(null)
    val workspace: StateFlow<Workspace?> = _workspace.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadWorkspace(workspaceId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getWorkspace(workspaceId)
                _workspace.value = response.workspace
                Log.d(TAG, "✅ Loaded workspace: ${response.workspace.name}")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to load workspace: ${e.message}", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateField(workspaceId: String, field: String, value: String) {
        viewModelScope.launch {
            try {
                val response = apiService.updateWorkspace(workspaceId, mapOf(field to value))
                _workspace.value = response.workspace
                workspaceRepository.refresh()
                Log.d(TAG, "✅ Updated $field")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to update $field: ${e.message}", e)
            }
        }
    }

    fun updateCurrency(workspaceId: String, code: String, symbol: String) {
        viewModelScope.launch {
            try {
                val response = apiService.updateWorkspace(workspaceId, mapOf(
                    "currency" to code,
                    "currencySymbol" to symbol
                ))
                _workspace.value = response.workspace
                workspaceRepository.refresh()
                Log.d(TAG, "✅ Updated currency to $code")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to update currency: ${e.message}", e)
            }
        }
    }

    fun deleteWorkspace(workspaceId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                apiService.deleteWorkspace(workspaceId)
                workspaceRepository.refresh()
                Log.d(TAG, "✅ Workspace deleted")
                onSuccess()
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to delete workspace: ${e.message}", e)
            }
        }
    }

    /** Creates a real workspace invite link via the API, with a fallback join URL. */
    suspend fun createInviteLink(workspaceId: String): String {
        return try {
            val response = apiService.createWorkspaceInvite(workspaceId, mapOf("contact" to "share"))
            response.inviteUrl ?: "https://web.kachalabs.com/workspaces/$workspaceId/join"
        } catch (e: Exception) {
            Log.e(TAG, "⚠️ Failed to create invite link, using fallback: ${e.message}")
            "https://web.kachalabs.com/workspaces/$workspaceId/join"
        }
    }
}
