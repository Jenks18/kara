package com.mafutapass.app.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Singleton holding [ExpenseItem] entries that are currently being scanned / uploaded
 * in the background.  Both [BackgroundScanService] (writes) and [ReportsViewModel] (reads)
 * depend on this repository so they can communicate without being coupled.
 *
 * Lifecycle: outlives any individual ViewModel, so background work started in
 * [BackgroundScanService] continues — and this state remains visible — even after
 * the Create screen has been popped from the back stack.
 */
@Singleton
class PendingExpensesRepository @Inject constructor() {

    private val _items = MutableStateFlow<List<ExpenseItem>>(emptyList())

    /** All in-flight / recently-completed items, newest first.  Consumed by [ReportsViewModel]. */
    val items: StateFlow<List<ExpenseItem>> = _items.asStateFlow()

    /** reportId (or tempId) of the most recently uploaded item — drives the halo animation. */
    private val _newlyCompletedId = MutableStateFlow<String?>(null)
    val newlyCompletedId: StateFlow<String?> = _newlyCompletedId.asStateFlow()

    /**
     * Local image bytes cache, keyed by temp ID.
     * Lets the detail screen show the camera image before upload has finished.
     * Automatically cleaned up when the item is removed or cleared.
     */
    private val _imageBytes = mutableMapOf<String, ByteArray>()

    fun setImageBytes(id: String, bytes: ByteArray) { _imageBytes[id] = bytes }
    fun getImageBytes(id: String): ByteArray? = _imageBytes[id]

    /**
     * Persistent mapping from temp IDs to real server IDs.
     * Unlike [newlyCompletedId] (which can be cleared by ReportsScreen's halo timer),
     * this map survives so that ExpenseDetailScreen can always resolve the real ID
     * even if it reads late.
     */
    private val _completedIdMap = mutableMapOf<String, String>()
    fun getCompletedId(tempId: String): String? = _completedIdMap[tempId]

    /**
     * Full completed [ExpenseItem] keyed by temp ID.
     * The detail screen uses this as an immediate fallback when the API fetch after
     * completion fails (e.g., race condition where the server DB hasn't propagated yet).
     */
    private val _completedItems = mutableMapOf<String, ExpenseItem>()
    fun getCompletedItem(tempId: String): ExpenseItem? = _completedItems[tempId]

    /** Prepend placeholder items (shown immediately with scanning indicator). */
    fun addAll(newItems: List<ExpenseItem>) {
        _items.value = newItems + _items.value
    }

    /**
     * Replace the placeholder identified by [tempId] with [replacement].
     * If [replacement.processingStatus] == "processed" the [newlyCompletedId] signal fires
     * so the halo animation starts in [ReportsScreen].
     */
    fun update(tempId: String, replacement: ExpenseItem) {
        _items.value = _items.value.map { if (it.id == tempId) replacement else it }
        if (replacement.processingStatus == "processed") {
            _completedIdMap[tempId] = replacement.id
            _completedItems[tempId] = replacement
            _newlyCompletedId.value = replacement.reportId ?: replacement.id
        }
    }

    fun markFailed(tempId: String) {
        _items.value = _items.value.map {
            if (it.id == tempId) it.copy(processingStatus = "error") else it
        }
    }

    /** Called by [ReportsViewModel] after the halo timer has expired. */
    fun clearNewlyCompleted() {
        _newlyCompletedId.value = null
    }

    /** Remove an item once it has been confirmed in the server-fetched list. */
    fun remove(id: String) {
        _items.value = _items.value.filter { it.id != id }
        _imageBytes.remove(id)
    }

    fun clear() {
        _items.value = emptyList()
        _imageBytes.clear()
    }
}
