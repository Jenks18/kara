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
 * Pattern: cache-then-network.  The disk cache is seeded synchronously in
 * [init] so [WorkspacesScreen] renders instantly without a skeleton flash.
 *
 * Screens should collect [activeCurrency] to format amounts correctly.
 * Defaults to "KES" until the real workspace is fetched from the API.
 *
 * Injected via Hilt — use `@Inject constructor(workspaceRepository: WorkspaceRepository)`.
 */
@Singleton
class WorkspaceRepository @Inject constructor(
    private val apiService: ApiService,
    private val workspacesCache: WorkspacesCache
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
        // Seed from disk cache synchronously — WorkspacesScreen renders instantly.
        workspacesCache.load()?.let { cached ->
            _workspaces.value = cached
            val active = cached.firstOrNull { it.isActive } ?: cached.firstOrNull()
            setActiveWorkspace(active)
            _isLoaded.value = true
        }
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
                workspacesCache.save(response.workspaces)  // persist for next launch
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

    /**
     * Clear all in-memory state AND the disk cache.
     *
     * Called on sign-out and when a different user signs in, so the next
     * session never sees a previous account's workspaces.  The in-memory
     * StateFlows must be reset here because this is a @Singleton — its
     * [init] block runs only once at app start and cannot be re-triggered.
     * Consumers (e.g. WorkspacesViewModel) call [refresh] after this to
     * re-populate for the new user.
     */
    fun clearData() {
        _workspaces.value = emptyList()
        _activeWorkspace.value = null
        _activeCurrency.value = "KES"
        _isLoaded.value = false
        CurrencyFormatter.defaultCurrencyCode = "KES"
        workspacesCache.clear()
        Log.d(TAG, "clearData() — in-memory state and disk cache wiped")
    }
}
