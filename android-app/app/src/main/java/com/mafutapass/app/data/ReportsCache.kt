package com.mafutapass.app.data

import android.content.Context
import androidx.core.content.edit
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Disk cache for expense items and expense reports.
 *
 * Pattern: cache-then-network (stale-while-revalidate).
 *
 * [ReportsViewModel] seeds its state flows synchronously from cache in [init],
 * so the Reports screen renders real content instantly on every navigation —
 * even after a sign-out/sign-in cycle. A background network refresh then
 * updates the UI silently without a spinner.
 *
 * Cache is serialized as JSON (Gson) in SharedPreferences.  Cleared on sign-out
 * via [AuthViewModel.signOut] so a different account never sees stale data.
 */
@Singleton
class ReportsCache @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    private val prefs by lazy {
        context.getSharedPreferences("kacha_reports_cache_v1", Context.MODE_PRIVATE)
    }

    // ── Expense Items ─────────────────────────────────────────────────────────

    fun saveExpenseItems(items: List<ExpenseItem>) {
        prefs.edit { putString(KEY_EXPENSE_ITEMS, gson.toJson(items)) }
    }

    fun loadExpenseItems(): List<ExpenseItem>? {
        val json = prefs.getString(KEY_EXPENSE_ITEMS, null) ?: return null
        return try {
            val type = object : TypeToken<List<ExpenseItem>>() {}.type
            gson.fromJson(json, type)
        } catch (e: Exception) {
            null
        }
    }

    // ── Expense Reports ───────────────────────────────────────────────────────

    fun saveExpenseReports(reports: List<ExpenseReport>) {
        prefs.edit { putString(KEY_EXPENSE_REPORTS, gson.toJson(reports)) }
    }

    fun loadExpenseReports(): List<ExpenseReport>? {
        val json = prefs.getString(KEY_EXPENSE_REPORTS, null) ?: return null
        return try {
            val type = object : TypeToken<List<ExpenseReport>>() {}.type
            gson.fromJson(json, type)
        } catch (e: Exception) {
            null
        }
    }

    // ── Clear on sign-out ─────────────────────────────────────────────────────

    /** Synchronous (commit=true) so the wipe completes before SignedOut is emitted. */
    fun clear() {
        prefs.edit(commit = true) { clear() }
    }

    private companion object {
        const val KEY_EXPENSE_ITEMS = "expense_items"
        const val KEY_EXPENSE_REPORTS = "expense_reports"
    }
}
