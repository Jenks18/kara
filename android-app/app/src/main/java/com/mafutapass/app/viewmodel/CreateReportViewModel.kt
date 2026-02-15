package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CreateReportViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _isCreating = MutableStateFlow(false)
    val isCreating: StateFlow<Boolean> = _isCreating

    private val _result = MutableStateFlow<String?>(null)
    val result: StateFlow<String?> = _result

    fun createReport(title: String, onSuccess: () -> Unit = {}) {
        if (title.isBlank() || _isCreating.value) return
        _isCreating.value = true
        _result.value = null

        viewModelScope.launch {
            try {
                apiService.createExpenseReport(mapOf("title" to title.trim()))
                _result.value = "✅ Report \"${title.trim()}\" created"
                onSuccess()
            } catch (e: Exception) {
                Log.e("CreateReportVM", "Failed: ${e.message}")
                _result.value = "❌ Failed: ${e.message}"
            } finally {
                _isCreating.value = false
            }
        }
    }

    fun clearResult() {
        _result.value = null
    }
}
