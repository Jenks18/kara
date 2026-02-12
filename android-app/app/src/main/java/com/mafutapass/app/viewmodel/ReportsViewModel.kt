
package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.data.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ReportsViewModel : ViewModel() {
    private val TAG = "ReportsViewModel"
    private val repository = Repository()

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
                
                Log.d(TAG, "🔄 Fetching expense data...")
                
                // For now, use empty data until Supabase is properly configured
                // TODO: Implement Supabase data fetching once auth is stable
                _expenseReports.value = emptyList()
                _expenseItems.value = emptyList()
                
                Log.d(TAG, "✅ Data fetch complete")
                
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

