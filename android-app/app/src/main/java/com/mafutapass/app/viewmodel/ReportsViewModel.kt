
package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
        
        // No async work, just set empty lists immediately
        _expenseReports.value = emptyList()
        _expenseItems.value = emptyList()
        _isLoading.value = false
        _error.value = null
        
        Log.d(TAG, "✅ Data fetch complete (empty lists)")
    }
    
    /**
     * Refresh data manually
     */
    fun refresh() {
        fetchExpenseData()
    }
}

