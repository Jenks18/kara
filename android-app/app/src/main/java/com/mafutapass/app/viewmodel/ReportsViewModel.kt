
package com.mafutapass.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.AppDataCache
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.data.MobileStats
import com.mafutapass.app.data.PendingExpensesRepository
import com.mafutapass.app.data.UserSession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import javax.inject.Inject

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val apiService: ApiService,
    private val appDataCache: AppDataCache,
    private val userSession: UserSession,
    private val pendingExpensesRepository: PendingExpensesRepository
) : ViewModel() {
    private val TAG = "ReportsViewModel"

    /**
     * Fetched (server-side) expense items.  Do not expose directly — use [expenseItems]
     * which merges this with [PendingExpensesRepository.items] so in-flight scanning
     * entries appear immediately at the top of the list.
     */
    private val _fetchedExpenseItems = MutableStateFlow<List<ExpenseItem>>(emptyList())

    /**
     * Merged list: pending (scanning / uploading) items first, then server-fetched items.
     * De-duplicates by reportId so a completed upload doesn't appear twice after a refresh.
     */
    val expenseItems: StateFlow<List<ExpenseItem>> = combine(
        pendingExpensesRepository.items,
        _fetchedExpenseItems
    ) { pending, fetched ->
        val fetchedReportIds = fetched.mapNotNull { it.reportId }.toSet()
        // Keep a pending item only while it is still scanning / errored OR its reportId
        // hasn't shown up in the server-fetched list yet.
        val filteredPending = pending.filter { p ->
            p.processingStatus == "scanning" ||
            p.processingStatus == "error" ||
            (p.reportId == null || p.reportId !in fetchedReportIds)
        }
        filteredPending + fetched
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    /** Fires when a background upload finishes — drives the halo in ReportsScreen. */
    val newlyCompletedExpenseId: StateFlow<String?> = pendingExpensesRepository.newlyCompletedId

    /** Call after the halo timer has expired. */
    fun clearNewlyCompleted() = pendingExpensesRepository.clearNewlyCompleted()

    private val _expenseReports = MutableStateFlow<List<ExpenseReport>>(emptyList())
    val expenseReports: StateFlow<List<ExpenseReport>> = _expenseReports

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    // ── Pagination state ────────────────────────────────────────────────
    private val _expensesHasMore = MutableStateFlow(false)
    val expensesHasMore: StateFlow<Boolean> = _expensesHasMore

    private val _reportsHasMore = MutableStateFlow(false)
    val reportsHasMore: StateFlow<Boolean> = _reportsHasMore

    private val _isLoadingMoreExpenses = MutableStateFlow(false)
    val isLoadingMoreExpenses: StateFlow<Boolean> = _isLoadingMoreExpenses

    private val _isLoadingMoreReports = MutableStateFlow(false)
    val isLoadingMoreReports: StateFlow<Boolean> = _isLoadingMoreReports

    private var nextExpenseCursor: String? = null
    private var nextReportCursor: String? = null

    // ── Server-side stats ────────────────────────────────────────────────
    private val _stats = MutableStateFlow<MobileStats?>(null)
    val stats: StateFlow<MobileStats?> = _stats

    init {
        try {
            Log.d(TAG, "Initializing ReportsViewModel...")
            val userId = userSession.userId.value
            if (userId != null) {
                appDataCache.loadExpenseItems(userId)?.let { _fetchedExpenseItems.value = it }
                appDataCache.loadExpenseReports(userId)?.let { _expenseReports.value = it }
                appDataCache.loadStats(userId)?.let { _stats.value = it }
            }
            fetchExpenseData()

            // Auto-refresh reports+expenses when a background upload batch completes.
            // This ensures newly-created reports (including from manual entries)
            // appear in the reports list without requiring a manual pull-to-refresh.
            viewModelScope.launch {
                var last = pendingExpensesRepository.batchCompleted.value
                pendingExpensesRepository.batchCompleted.collect { counter ->
                    if (counter > last) {
                        last = counter
                        Log.d(TAG, "Background batch completed — refreshing reports")
                        fetchExpenseData()
                    }
                }
            }

            Log.d(TAG, "✅ ReportsViewModel initialized")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start data fetch: ${e.message}", e)
            _error.value = "Failed to initialize"
            _isLoading.value = false
        }
    }

    private fun fetchExpenseData() {
        Log.d(TAG, "🔄 Fetching expense data...")
        if (_fetchedExpenseItems.value.isEmpty() && _expenseReports.value.isEmpty()) {
            _isLoading.value = true
        }
        _error.value = null

        viewModelScope.launch {
            try {
                val userId = userSession.userId.value

                // Fire all 3 API calls in parallel — cuts latency from ~3x to ~1x
                supervisorScope {
                    val reportsDeferred = async {
                        try { apiService.getExpenseReports() }
                        catch (e: Exception) { Log.e(TAG, "⚠️ Failed to fetch reports: ${e.message}"); null }
                    }
                    val expensesDeferred = async {
                        try { apiService.getReceipts() }
                        catch (e: Exception) { Log.e(TAG, "⚠️ Failed to fetch receipts: ${e.message}"); null }
                    }
                    val statsDeferred = async {
                        try { apiService.getStats() }
                        catch (e: Exception) { Log.w(TAG, "⚠️ Stats fetch failed: ${e.message}"); null }
                    }

                    val pagedReports = reportsDeferred.await()
                    val pagedExpenses = expensesDeferred.await()
                    val freshStats = statsDeferred.await()

                    if (pagedReports != null) {
                        _expenseReports.value = pagedReports.items
                        _reportsHasMore.value = pagedReports.hasMore
                        nextReportCursor = pagedReports.nextCursor
                        userId?.let { appDataCache.saveExpenseReports(it, pagedReports.items) }
                        Log.d(TAG, "✅ Fetched ${pagedReports.items.size} expense reports (hasMore=${pagedReports.hasMore})")
                    }

                    if (pagedExpenses != null) {
                        _fetchedExpenseItems.value = pagedExpenses.items
                        _expensesHasMore.value = pagedExpenses.hasMore
                        nextExpenseCursor = pagedExpenses.nextCursor
                        userId?.let { appDataCache.saveExpenseItems(it, pagedExpenses.items) }
                        Log.d(TAG, "✅ Fetched ${pagedExpenses.items.size} expense items (hasMore=${pagedExpenses.hasMore})")
                    }

                    if (freshStats != null) {
                        _stats.value = freshStats
                        userId?.let { appDataCache.saveStats(it, freshStats) }
                        Log.d(TAG, "✅ Fetched server stats")
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "❌ Error fetching expense data: ${e.message}", e)
                _error.value = "Failed to load data: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /** Append the next page of expenses. Call when the user scrolls to the bottom of the list. */
    fun loadMoreExpenses() {
        if (!_expensesHasMore.value || _isLoadingMoreExpenses.value) return
        val cursor = nextExpenseCursor ?: return
        _isLoadingMoreExpenses.value = true
        viewModelScope.launch {
            try {
                val paged = apiService.getReceipts(cursor = cursor)
                _fetchedExpenseItems.value = _fetchedExpenseItems.value + paged.items
                _expensesHasMore.value = paged.hasMore
                nextExpenseCursor = paged.nextCursor
                Log.d(TAG, "✅ Loaded ${paged.items.size} more expenses")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Load-more expenses failed: ${e.message}")
            } finally {
                _isLoadingMoreExpenses.value = false
            }
        }
    }

    /** Append the next page of reports. */
    fun loadMoreReports() {
        if (!_reportsHasMore.value || _isLoadingMoreReports.value) return
        val cursor = nextReportCursor ?: return
        _isLoadingMoreReports.value = true
        viewModelScope.launch {
            try {
                val paged = apiService.getExpenseReports(cursor = cursor)
                _expenseReports.value = _expenseReports.value + paged.items
                _reportsHasMore.value = paged.hasMore
                nextReportCursor = paged.nextCursor
                Log.d(TAG, "✅ Loaded ${paged.items.size} more reports")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Load-more reports failed: ${e.message}")
            } finally {
                _isLoadingMoreReports.value = false
            }
        }
    }

    /** Manual full refresh — resets cursors and reloads page 1. */
    fun refresh() {
        nextExpenseCursor = null
        nextReportCursor = null
        fetchExpenseData()
    }
}
