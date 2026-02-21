
package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.AppDataCache
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.data.UserSession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val apiService: ApiService,
    private val appDataCache: AppDataCache,
    private val userSession: UserSession
) : ViewModel() {
    private val TAG = "ReportsViewModel"

    private val _expenseItems = MutableStateFlow<List<ExpenseItem>>(emptyList())
    val expenseItems: StateFlow<List<ExpenseItem>> = _expenseItems

    private val _expenseReports = MutableStateFlow<List<ExpenseReport>>(emptyList())
    val expenseReports: StateFlow<List<ExpenseReport>> = _expenseReports
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        try {
            Log.d(TAG, "Initializing ReportsViewModel...")
            // Seed from userId-keyed cache — instant render, no skeleton flash.
            // If this is a different user, their userId key won't exist in cache,
            // so this is a no-op and fetchExpenseData() shows the spinner correctly.
            val userId = userSession.userId.value
            if (userId != null) {
                appDataCache.loadExpenseItems(userId)?.let { _expenseItems.value = it }
                appDataCache.loadExpenseReports(userId)?.let { _expenseReports.value = it }
            }
            fetchExpenseData()
            Log.d(TAG, "✅ ReportsViewModel initialized")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start data fetch: ${e.message}", e)
            _error.value = "Failed to initialize"
            _isLoading.value = false
        }
    }

    private fun fetchExpenseData() {
        Log.d(TAG, "🔄 Fetching expense data...")
        // Only show loading spinner on initial fetch (no existing data)
        if (_expenseItems.value.isEmpty() && _expenseReports.value.isEmpty()) {
            _isLoading.value = true
        }
        _error.value = null
        
        viewModelScope.launch {
            try {
                val userId = userSession.userId.value

                val reports = try {
                    apiService.getExpenseReports()
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ Failed to fetch reports: ${e.message}")
                    emptyList()
                }
                _expenseReports.value = reports
                userId?.let { appDataCache.saveExpenseReports(it, reports) }
                Log.d(TAG, "✅ Fetched ${reports.size} expense reports")
                
                val items = try {
                    apiService.getReceipts()
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ Failed to fetch receipts: ${e.message}")
                    emptyList()
                }
                _expenseItems.value = items
                userId?.let { appDataCache.saveExpenseItems(it, items) }
                Log.d(TAG, "✅ Fetched ${items.size} expense items")
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error fetching expense data: ${e.message}", e)
                _error.value = "Failed to load data: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Refresh data manually
     */
    fun refresh() {
        fetchExpenseData()
    }
}
