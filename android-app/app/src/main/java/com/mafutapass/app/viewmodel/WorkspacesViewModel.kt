package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.CreateWorkspaceRequest
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.data.WorkspaceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
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
        workspaceRepository.refresh()
    }

    private val _isDeleting = MutableStateFlow<String?>(null)
    val isDeleting: StateFlow<String?> = _isDeleting.asStateFlow()

    // ── Workspace creation state ──
    sealed class CreateState {
        data object Idle : CreateState()
        data object Loading : CreateState()
        data class Success(val workspace: Workspace) : CreateState()
        data class Error(val message: String) : CreateState()
    }

    private val _createState = MutableStateFlow<CreateState>(CreateState.Idle)
    val createState: StateFlow<CreateState> = _createState.asStateFlow()

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
                Log.e(TAG, "❌ Failed to delete workspace: ${e.message}", e)
            } finally {
                _isDeleting.value = null
            }
        }
    }

    fun createWorkspace(name: String, currency: String = "KES", currencySymbol: String = "KSh") {
        viewModelScope.launch {
            _createState.value = CreateState.Loading
            try {
                val response = apiService.createWorkspace(
                    CreateWorkspaceRequest(
                        name = name,
                        currency = currency,
                        currencySymbol = currencySymbol
                    )
                )
                Log.d(TAG, "✅ Created workspace: ${response.workspace.name}")
                workspaceRepository.refresh()
                _createState.value = CreateState.Success(response.workspace)
            } catch (e: HttpException) {
                val errorBody = e.response()?.errorBody()?.string() ?: "No details"
                Log.e(TAG, "❌ Create workspace HTTP ${e.code()}: $errorBody", e)
                _createState.value = CreateState.Error(
                    when (e.code()) {
                        401 -> "Authentication failed. Please sign out and sign in again."
                        400 -> "Invalid workspace data: $errorBody"
                        else -> "Server error (${e.code()}). Please try again."
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to create workspace: ${e.message}", e)
                _createState.value = CreateState.Error(e.message ?: "Failed to create workspace")
            }
        }
    }

    fun resetCreateState() {
        _createState.value = CreateState.Idle
    }

    /** Duplicate an existing workspace under a new name ("Copy of …"). */
    fun duplicateWorkspace(workspace: Workspace) {
        viewModelScope.launch {
            _createState.value = CreateState.Loading
            try {
                val response = apiService.createWorkspace(
                    CreateWorkspaceRequest(
                        name = "Copy of ${workspace.name}",
                        currency = workspace.currency,
                        currencySymbol = workspace.currencySymbol
                    )
                )
                Log.d(TAG, "✅ Duplicated workspace: ${response.workspace.name}")
                workspaceRepository.refresh()
                _createState.value = CreateState.Success(response.workspace)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to duplicate workspace: ${e.message}", e)
                _createState.value = CreateState.Error(e.message ?: "Failed to duplicate workspace")
            }
        }
    }

    /** Creates a real workspace invite link via the API. Returns the invite URL or null on failure. */
    suspend fun createInviteLink(workspaceId: String): String? {
        return try {
            val response = apiService.createWorkspaceInvite(workspaceId, mapOf("contact" to "share"))
            response.inviteUrl
        } catch (e: Exception) {
            Log.e(TAG, "⚠️ Failed to create invite link: ${e.message}")
            null
        }
    }
}
