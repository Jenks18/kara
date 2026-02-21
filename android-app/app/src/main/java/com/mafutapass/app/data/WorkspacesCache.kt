package com.mafutapass.app.data

import android.content.Context
import androidx.core.content.edit
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Disk cache for the user's workspace list.
 *
 * Pattern: cache-then-network (stale-while-revalidate).
 *
 * [WorkspaceRepository] seeds [_workspaces] synchronously from cache in [init],
 * so the Workspaces screen renders instantly without a skeleton flash on every
 * navigation.  A background network fetch then updates the list silently.
 *
 * Cleared on sign-out so a different account never sees another user's data.
 */
@Singleton
class WorkspacesCache @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    private val prefs by lazy {
        context.getSharedPreferences("kacha_workspaces_cache_v1", Context.MODE_PRIVATE)
    }

    fun save(workspaces: List<Workspace>) {
        prefs.edit { putString(KEY_WORKSPACES, gson.toJson(workspaces)) }
    }

    fun load(): List<Workspace>? {
        val json = prefs.getString(KEY_WORKSPACES, null) ?: return null
        return try {
            val type = object : TypeToken<List<Workspace>>() {}.type
            gson.fromJson(json, type)
        } catch (e: Exception) {
            null
        }
    }

    /** Synchronous (commit=true) so the wipe completes before SignedOut is emitted. */
    fun clear() {
        prefs.edit(commit = true) { clear() }
    }

    private companion object {
        const val KEY_WORKSPACES = "workspaces"
    }
}
