package com.mafutapass.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class Repository {
    private val apiService = ApiClient.apiService
    
    suspend fun getWorkspaces(): Result<List<Workspace>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getWorkspaces()
            Result.success(response.workspaces)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getExpenseReports(workspaceId: String? = null): Result<List<ExpenseReport>> = withContext(Dispatchers.IO) {
        try {
            val reports = apiService.getExpenseReports(workspaceId)
            Result.success(reports)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getReceipts(workspaceId: String? = null): Result<List<ExpenseItem>> = withContext(Dispatchers.IO) {
        try {
            val receipts = apiService.getReceipts(workspaceId)
            Result.success(receipts)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getUserProfile(): Result<User> = withContext(Dispatchers.IO) {
        try {
            val user = apiService.getUserProfile()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
