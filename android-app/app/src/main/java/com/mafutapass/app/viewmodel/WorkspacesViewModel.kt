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
class WorkspacesViewModel @Inject constructor(
    private val workspaceRepository: WorkspaceRepository,
    private val apiService: ApiService
) : ViewModel() {
    private val TAG = "WorkspacesViewModel"

    val workspaces: StateFlow<List<Workspace>> = workspaceRepository.workspaces
    val isLoaded: StateFlow<Boolean> = workspaceRepository.isLoaded

    init {
        // Always trigger a fresh fetch on ViewModel creation.  Because Hilt
        // scopes this VM to the NavBackStackEntry AND AuthViewModel wraps the
        // entire SignedIn branch with key(sessionKey), a new instance is
        // created on every login session — guaranteeing fresh data per user.
        workspaceRepository.refresh()
    }

    private val _isDeleting = MutableStateFlow<String?>(null)
    val isDeleting: StateFlow<String?> = _isDeleting.asStateFlow()

    fun refresh() {
        workspaceRepository.refresh()
    }

    fun deleteWorkspace(id: String) {
        viewModelScope.launch {
            _isDeleting.value = id
            try {
                apiService.deleteWorkspace(id)
                workspaceRepository.refresh()
            } catch (e: Exception) {
                // Silent failure — could add error state
            } finally {
                _isDeleting.value = null
            }
        }
    }

    fun createWorkspace(name: String, currency: String = "KES", currencySymbol: String = "KSh") {
        viewModelScope.launch {
            try {
                val response = apiService.createWorkspace(
                    com.mafutapass.app.data.CreateWorkspaceRequest(
                        name = name,
                        currency = currency,
                        currencySymbol = currencySymbol
                    )
                )
                Log.d(TAG, "✅ Created workspace: ${response.workspace.name}")
                workspaceRepository.refresh()
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to create workspace: ${e.message}", e)
            }
        }
    }
}
