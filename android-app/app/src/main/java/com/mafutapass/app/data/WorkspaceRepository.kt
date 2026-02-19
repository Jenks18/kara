package com.mafutapass.app.data

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import com.mafutapass.app.util.CurrencyFormatter
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Singleton repository that manages the active workspace and its currency.
 *
 * Screens should collect [activeCurrency] to format amounts correctly.
 * Defaults to "KES" until the real workspace is fetched from the API.
 *
 * Injected via Hilt — use `@Inject constructor(workspaceRepository: WorkspaceRepository)`.
 */
@Singleton
class WorkspaceRepository @Inject constructor(
    private val apiService: ApiService
) {
    private val TAG = "WorkspaceRepository"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _workspaces = MutableStateFlow<List<Workspace>>(emptyList())
    val workspaces: StateFlow<List<Workspace>> = _workspaces.asStateFlow()

    private val _activeWorkspace = MutableStateFlow<Workspace?>(null)
    val activeWorkspace: StateFlow<Workspace?> = _activeWorkspace.asStateFlow()

    /** The currency code of the active workspace (e.g. "KES", "USD"). Defaults to "KES". */
    private val _activeCurrency = MutableStateFlow("KES")
    val activeCurrency: StateFlow<String> = _activeCurrency.asStateFlow()

    private val _isLoaded = MutableStateFlow(false)
    val isLoaded: StateFlow<Boolean> = _isLoaded.asStateFlow()

    init {
        fetchWorkspaces()
    }

    /**
     * Fetch workspaces from the API and auto-select the first active one.
     */
    fun fetchWorkspaces() {
        scope.launch {
            try {
                val response = apiService.getWorkspaces()
                _workspaces.value = response.workspaces
                Log.d(TAG, "✅ Fetched ${response.workspaces.size} workspaces")

                // Auto-select first active workspace (or first overall)
                val active = response.workspaces.firstOrNull { it.isActive }
                    ?: response.workspaces.firstOrNull()
                setActiveWorkspace(active)
            } catch (e: Exception) {
                Log.e(TAG, "⚠️ Failed to fetch workspaces: ${e.message}")
                // Keep defaults — currency stays "KES"
            } finally {
                _isLoaded.value = true
            }
        }
    }

    /**
     * Set the active workspace and update the currency.
     */
    fun setActiveWorkspace(workspace: Workspace?) {
        _activeWorkspace.value = workspace
        _activeCurrency.value = workspace?.currency ?: "KES"
        // Update the global default so all CurrencyFormatter calls use workspace currency
        CurrencyFormatter.defaultCurrencyCode = _activeCurrency.value
        Log.d(TAG, "Active workspace: ${workspace?.name}, currency: ${_activeCurrency.value}")
    }

    /**
     * Refresh (re-fetch) workspaces. Call after creating/deleting a workspace.
     */
    fun refresh() = fetchWorkspaces()
}
