
package com.mafutapass.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val supabaseClient: SupabaseClient
) : ViewModel() {

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
                val items = supabaseClient.from("expense_items").select().decodeList<ExpenseItem>()
                _expenseItems.value = items

                val reports = supabaseClient.from("expense_reports").select().decodeList<ExpenseReport>()
                _expenseReports.value = reports
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}
