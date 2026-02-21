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
                val ws = apiService.getWorkspace(workspaceId)
                _workspace.value = ws
                Log.d(TAG, "✅ Loaded workspace: ${ws.name}")
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
                val updated = apiService.updateWorkspace(workspaceId, mapOf(field to value))
                _workspace.value = updated
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
                val updated = apiService.updateWorkspace(workspaceId, mapOf(
                    "currency" to code,
                    "currencySymbol" to symbol
                ))
                _workspace.value = updated
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
}
