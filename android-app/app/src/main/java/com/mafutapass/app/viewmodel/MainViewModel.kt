package com.mafutapass.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class UiState<out T> {
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

class MainViewModel : ViewModel() {
    private val repository = Repository()
    
    private val _workspaces = MutableStateFlow<UiState<List<Workspace>>>(UiState.Loading)
    val workspaces: StateFlow<UiState<List<Workspace>>> = _workspaces.asStateFlow()
    
    private val _expenses = MutableStateFlow<UiState<List<ExpenseItem>>>(UiState.Loading)
    val expenses: StateFlow<UiState<List<ExpenseItem>>> = _expenses.asStateFlow()
    
    private val _reports = MutableStateFlow<UiState<List<ExpenseReport>>>(UiState.Loading)
    val reports: StateFlow<UiState<List<ExpenseReport>>> = _reports.asStateFlow()
    
    private val _user = MutableStateFlow<UiState<User>>(UiState.Loading)
    val user: StateFlow<UiState<User>> = _user.asStateFlow()
    
    init {
        loadWorkspaces()
        loadExpenses()
        loadReports()
        loadUserProfile()
    }
    
    fun loadWorkspaces() {
        viewModelScope.launch {
            _workspaces.value = UiState.Loading
            repository.getWorkspaces().fold(
                onSuccess = { _workspaces.value = UiState.Success(it) },
                onFailure = { _workspaces.value = UiState.Error(it.message ?: "Unknown error") }
            )
        }
    }
    
    fun loadExpenses(workspaceId: String? = null) {
        viewModelScope.launch {
            _expenses.value = UiState.Loading
            repository.getReceipts(workspaceId).fold(
                onSuccess = { _expenses.value = UiState.Success(it) },
                onFailure = { _expenses.value = UiState.Error(it.message ?: "Unknown error") }
            )
        }
    }
    
    fun loadReports(workspaceId: String? = null) {
        viewModelScope.launch {
            _reports.value = UiState.Loading
            repository.getExpenseReports(workspaceId).fold(
                onSuccess = { _reports.value = UiState.Success(it) },
                onFailure = { _reports.value = UiState.Error(it.message ?: "Unknown error") }
            )
        }
    }
    
    fun loadUserProfile() {
        viewModelScope.launch {
            _user.value = UiState.Loading
            repository.getUserProfile().fold(
                onSuccess = { _user.value = UiState.Success(it) },
                onFailure = { _user.value = UiState.Error(it.message ?: "Unknown error") }
            )
        }
    }
}
