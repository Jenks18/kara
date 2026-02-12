
package com.mafutapass.app.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.services.ExpenseDataService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ReportsViewModel(application: Application) : AndroidViewModel(application) {
    private val TAG = "ReportsViewModel"
    private val dataService = ExpenseDataService(application.applicationContext)

    private val _expenseItems = MutableStateFlow<List<ExpenseItem>>(emptyList())
    val expenseItems: StateFlow<List<ExpenseItem>> = _expenseItems

    private val _expenseReports = MutableStateFlow<List<ExpenseReport>>(emptyList())
    val expenseReports: StateFlow<List<ExpenseReport>> = _expenseReports
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        fetchExpenseData()
    }

    private fun fetchExpenseData() {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                _error.value = null
                
                Log.d(TAG, "🔄 Fetching expense data from Supabase...")
                
                // Fetch reports and items from Supabase
                val reports = dataService.getExpenseReports()
                val items = dataService.getAllExpenseItems()
                
                _expenseReports.value = reports
                _expenseItems.value = items
                
                Log.d(TAG, "✅ Loaded ${reports.size} reports and ${items.size} items")
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error fetching expense data: ${e.message}", e)
                _error.value = e.message ?: "Failed to load data"
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

