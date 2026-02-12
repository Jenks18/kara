package com.mafutapass.app.services

import android.content.Context
import android.util.Log
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.Workspace
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns

/**
 * Service for fetching expense data from Supabase
 */
class ExpenseDataService(private val context: Context) {
    private val TAG = "ExpenseDataService"
    
    /**
     * Get all expense reports for the current user
     */
    suspend fun getExpenseReports(): List<ExpenseReport> {
        return try {
            SupabaseDataClient.init(context)
            
            if (!SupabaseDataClient.isReady()) {
                Log.w(TAG, "Supabase client not ready, returning empty list")
                return emptyList()
            }
            
            val client = SupabaseDataClient.getClient()
            
            Log.d(TAG, "Fetching expense reports from Supabase...")
            
            val reports = client.from("expense_reports")
                .select()
                .decodeList<ExpenseReport>()
            
            Log.d(TAG, "✅ Fetched ${reports.size} expense reports")
            reports
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching expense reports: ${e.message}", e)
            emptyList()
        }
    }
    
    /**
     * Get all expense items for a specific report
     */
    suspend fun getExpenseItems(reportId: String): List<ExpenseItem> {
        return try {
            SupabaseDataClient.init(context)
            
            if (!SupabaseDataClient.isReady()) {
                Log.w(TAG, "Supabase client not ready, returning empty list")
                return emptyList()
            }
            
            val client = SupabaseDataClient.getClient()
            
            Log.d(TAG, "Fetching expense items for report $reportId...")
            
            val items = client.from("expense_items")
                .select()
                .decodeList<ExpenseItem>()
                .filter { it.id == reportId } // Filter on client side for now
            
            Log.d(TAG, "✅ Fetched ${items.size} expense items")
            items
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching expense items: ${e.message}", e)
            emptyList()
        }
    }
    
    /**
     * Get all expense items (for inbox view)
     */
    suspend fun getAllExpenseItems(): List<ExpenseItem> {
        return try {
            SupabaseDataClient.init(context)
            
            if (!SupabaseDataClient.isReady()) {
                Log.w(TAG, "Supabase client not ready, returning empty list")
                return emptyList()
            }
            
            val client = SupabaseDataClient.getClient()
            
            Log.d(TAG, "Fetching all expense items...")
            
            val items = client.from("expense_items")
                .select()
                .decodeList<ExpenseItem>()
            
            Log.d(TAG, "✅ Fetched ${items.size} expense items")
            items
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching expense items: ${e.message}", e)
            emptyList()
        }
    }
    
    /**
     * Get all workspaces for the current user
     */
    suspend fun getWorkspaces(): List<Workspace> {
        return try {
            SupabaseDataClient.init(context)
            
            if (!SupabaseDataClient.isReady()) {
                Log.w(TAG, "Supabase client not ready, returning empty list")
                return emptyList()
            }
            
            val client = SupabaseDataClient.getClient()
            
            Log.d(TAG, "Fetching workspaces...")
            
            val workspaces = client.from("workspaces")
                .select()
                .decodeList<Workspace>()
            
            Log.d(TAG, "✅ Fetched ${workspaces.size} workspaces")
            workspaces
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching workspaces: ${e.message}", e)
            emptyList()
        }
    }
}
