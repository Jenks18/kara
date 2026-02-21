package com.mafutapass.app.data

import android.content.Context
import androidx.core.content.edit
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Unified, userId-namespaced disk cache for all user-specific data.
 *
 * ## Why per-user keys?
 * All keys are prefixed with the userId: `"<userId>:<dataKey>"`.
 * This means:
 *  - A different user signing in automatically gets cache misses — no
 *    cross-account data leakage even if `clear()` was never called.
 *  - The same user returning instantly gets a cache hit — no skeleton flash.
 *  - Sign-out only needs to reset in-memory state (StateFlows), not disk.
 *    The old user's disk data stays but is never read for any other userId.
 *
 * ## Replaces
 * ProfileCache, ReportsCache, WorkspacesCache — one class, one SharedPreferences
 * file, one place to reason about caching.
 *
 * ## TTL / eviction
 * For a production app at scale, add per-key write timestamps and evict
 * entries older than N days in [loadProfile] / [loadWorkspaces] etc.
 * Omitted here for brevity — add when device storage becomes a concern.
 */
@Singleton
class AppDataCache @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    private val prefs by lazy {
        context.getSharedPreferences("kacha_data_v2", Context.MODE_PRIVATE)
    }

    // ── Key helpers ───────────────────────────────────────────────────────────

    private fun key(userId: String, dataKey: String) = "$userId:$dataKey"

    private fun <T> save(userId: String, dataKey: String, value: T) {
        prefs.edit { putString(key(userId, dataKey), gson.toJson(value)) }
    }

    private fun <T> loadObj(userId: String, dataKey: String, clazz: Class<T>): T? {
        val json = prefs.getString(key(userId, dataKey), null) ?: return null
        return try { gson.fromJson(json, clazz) } catch (_: Exception) { null }
    }

    private fun <T> loadList(userId: String, dataKey: String, clazz: Class<T>): List<T>? {
        val json = prefs.getString(key(userId, dataKey), null) ?: return null
        return try {
            val type = TypeToken.getParameterized(List::class.java, clazz).type
            gson.fromJson(json, type)
        } catch (_: Exception) { null }
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    fun saveProfile(userId: String, user: User) =
        save(userId, "profile", user)

    fun loadProfile(userId: String): User? =
        loadObj(userId, "profile", User::class.java)

    // ── Workspaces ────────────────────────────────────────────────────────────

    fun saveWorkspaces(userId: String, workspaces: List<Workspace>) =
        save(userId, "workspaces", workspaces)

    fun loadWorkspaces(userId: String): List<Workspace>? =
        loadList(userId, "workspaces", Workspace::class.java)

    // ── Expense Items ─────────────────────────────────────────────────────────

    fun saveExpenseItems(userId: String, items: List<ExpenseItem>) =
        save(userId, "expense_items", items)

    fun loadExpenseItems(userId: String): List<ExpenseItem>? =
        loadList(userId, "expense_items", ExpenseItem::class.java)

    // ── Expense Reports ───────────────────────────────────────────────────────

    fun saveExpenseReports(userId: String, reports: List<ExpenseReport>) =
        save(userId, "expense_reports", reports)

    fun loadExpenseReports(userId: String): List<ExpenseReport>? =
        loadList(userId, "expense_reports", ExpenseReport::class.java)
}
