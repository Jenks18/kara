
package com.mafutapass.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.data.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ReportsViewModel : ViewModel() {
    private val repository = Repository()

    private val _expenseItems = MutableStateFlow<List<ExpenseItem>>(emptyList())
    val expenseItems: StateFlow<List<ExpenseItem>> = _expenseItems

    private val _expenseReports = MutableStateFlow<List<ExpenseReport>>(emptyList())
    val expenseReports: StateFlow<List<ExpenseReport>> = _expenseReports

    init {
        fetchExpenseData()
    }

    private fun fetchExpenseData() {
        viewModelScope.launch {
            try {
                // Mock data for now - replace with actual API calls
                _expenseItems.value = emptyList()
                _expenseReports.value = emptyList()
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}

