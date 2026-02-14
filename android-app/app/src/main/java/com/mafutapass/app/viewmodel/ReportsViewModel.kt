
package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiClient
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ReportsViewModel : ViewModel() {
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
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                // Fetch expense reports from API
                val reports = try {
                    ApiClient.apiService.getExpenseReports()
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ Failed to fetch reports: ${e.message}")
                    emptyList()
                }
                _expenseReports.value = reports
                Log.d(TAG, "✅ Fetched ${reports.size} expense reports")
                
                // Fetch receipts/expense items from API
                val items = try {
                    ApiClient.apiService.getReceipts()
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ Failed to fetch receipts: ${e.message}")
                    emptyList()
                }
                _expenseItems.value = items
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
