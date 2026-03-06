package com.mafutapass.app.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.BackgroundScanService
import com.mafutapass.app.data.PendingExpensesRepository
import com.mafutapass.app.data.ReceiptUploadResponse
import com.mafutapass.app.data.WorkspaceRepository
import com.mafutapass.app.receipt.MultiPassResult
import com.mafutapass.app.receipt.ReceiptData
import com.mafutapass.app.receipt.ReceiptProcessor
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException
import java.io.ByteArrayOutputStream
import javax.inject.Inject

/**
 * Per-expense editable state — one entry per captured/selected image (or one for manual entry).
 * Populated after OCR completes; each field can be edited independently before upload.
 */
data class ExpenseEditState(
    val imageBytes: ByteArray? = null,
    val description: String = "",
    val amount: String = "",
    val currency: String = "KES",
    val category: String = "Automatic",
    val reimbursable: Boolean = false,
    val ocrResult: ReceiptData? = null
)

@HiltViewModel
class ScanReceiptViewModel @Inject constructor(
    private val apiService: ApiService,
    private val workspaceRepository: WorkspaceRepository,
    private val receiptProcessor: ReceiptProcessor,
    private val backgroundScanService: BackgroundScanService,
    private val pendingExpensesRepository: PendingExpensesRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {
    
    private val TAG = "ScanReceiptVM"
    
    private val _uiState = MutableStateFlow<ScanState>(ScanState.ChooseMethod)
    val uiState: StateFlow<ScanState> = _uiState.asStateFlow()
    
    private val _selectedImages = MutableStateFlow<List<ByteArray>>(emptyList())
    val selectedImages: StateFlow<List<ByteArray>> = _selectedImages.asStateFlow()
    
    private val _uploadResults = MutableStateFlow<List<ReceiptUploadResponse>>(emptyList())
    val uploadResults: StateFlow<List<ReceiptUploadResponse>> = _uploadResults.asStateFlow()
    
    private val _currentUploadIndex = MutableStateFlow(0)
    val currentUploadIndex: StateFlow<Int> = _currentUploadIndex.asStateFlow()
    
    /** eTIMS QR URL detected by the camera during scanning */
    private val _detectedQrUrl = MutableStateFlow<String?>(null)
    val detectedQrUrl: StateFlow<String?> = _detectedQrUrl.asStateFlow()

    /** Device location at time of scan (lat, lng) */
    private val _location = MutableStateFlow<Pair<Double, Double>?>(null)
    val location: StateFlow<Pair<Double, Double>?> = _location.asStateFlow()

    /** On-device OCR results — one per image */
    private val _ocrResults = MutableStateFlow<List<ReceiptData>>(emptyList())
    val ocrResults: StateFlow<List<ReceiptData>> = _ocrResults.asStateFlow()

    /** Multi-pass results for debugging / comparison */
    private val _multiPassResults = MutableStateFlow<List<MultiPassResult>>(emptyList())
    val multiPassResults: StateFlow<List<MultiPassResult>> = _multiPassResults.asStateFlow()

    // ── User-editable confirm fields (pre-populated from OCR) ────────────
    private val _editedDescription = MutableStateFlow("")
    val editedDescription: StateFlow<String> = _editedDescription.asStateFlow()

    private val _editedCategory = MutableStateFlow("Other")
    val editedCategory: StateFlow<String> = _editedCategory.asStateFlow()

    private val _editedAmount = MutableStateFlow("")
    val editedAmount: StateFlow<String> = _editedAmount.asStateFlow()

    private val _editedReimbursable = MutableStateFlow(false)
    val editedReimbursable: StateFlow<Boolean> = _editedReimbursable.asStateFlow()

    // ── Per-expense states (one entry per receipt / image) ─────────────────
    private val _expenseStates = MutableStateFlow<List<ExpenseEditState>>(emptyList())
    val expenseStates: StateFlow<List<ExpenseEditState>> = _expenseStates.asStateFlow()

    private val _currentExpenseIndex = MutableStateFlow(0)
    val currentExpenseIndex: StateFlow<Int> = _currentExpenseIndex.asStateFlow()

    /** Workspaces for the picker — comes from the repository (already cached) */
    val workspaces = workspaceRepository.workspaces

    /** The workspace the user selected for this receipt batch */
    private val _selectedWorkspaceId = MutableStateFlow(
        workspaceRepository.activeWorkspace.value?.id ?: ""
    )
    val selectedWorkspaceId: StateFlow<String> = _selectedWorkspaceId.asStateFlow()

    init {
        viewModelScope.launch {
            workspaceRepository.activeWorkspace.collect { ws ->
                if (_selectedWorkspaceId.value.isEmpty() && ws != null) {
                    _selectedWorkspaceId.value = ws.id
                }
            }
        }
    }

    fun setWorkspaceId(id: String) {
        _selectedWorkspaceId.value = id
    }

    fun setDescription(value: String) {
        _editedDescription.value = value
    }

    fun setCategory(value: String) {
        _editedCategory.value = value
    }

    fun setAmount(value: String) {
        _editedAmount.value = value
    }

    fun setReimbursable(value: Boolean) {
        _editedReimbursable.value = value
    }

    fun setCurrentExpenseIndex(index: Int) {
        _currentExpenseIndex.value = index.coerceIn(0, (_expenseStates.value.size - 1).coerceAtLeast(0))
    }

    fun updateExpenseField(index: Int, update: (ExpenseEditState) -> ExpenseEditState) {
        val list = _expenseStates.value.toMutableList()
        if (index in list.indices) {
            list[index] = update(list[index])
            _expenseStates.value = list
        }
    }

    fun removeExpenseAtIndex(index: Int) {
        val list = _expenseStates.value.toMutableList()
        if (index !in list.indices) return
        list.removeAt(index)
        _expenseStates.value = list
        _selectedImages.value = _selectedImages.value.filterIndexed { i, _ -> i != index }
        _ocrResults.value = _ocrResults.value.filterIndexed { i, _ -> i != index }
        val newSize = list.size
        if (newSize == 0) { _uiState.value = ScanState.ChooseMethod; return }
        if (_currentExpenseIndex.value >= newSize) _currentExpenseIndex.value = newSize - 1
    }

    fun addImageFromUri(uri: Uri) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return
            val buffer = ByteArrayOutputStream()
            inputStream.use { it.copyTo(buffer) }
            _selectedImages.value = _selectedImages.value + buffer.toByteArray()
            _uiState.value = ScanState.ReviewImages
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read image: ${e.message}")
        }
    }
    
    fun addImageBytes(bytes: ByteArray) {
        _selectedImages.value = _selectedImages.value + bytes
        _uiState.value = ScanState.ReviewImages
    }
    
    fun removeImage(index: Int) {
        _selectedImages.value = _selectedImages.value.filterIndexed { i, _ -> i != index }
        if (_selectedImages.value.isEmpty()) {
            _uiState.value = ScanState.ChooseMethod
        }
    }
    
    fun setDetectedQrUrl(url: String) {
        if (_detectedQrUrl.value == null) {
            Log.i(TAG, "eTIMS QR detected: $url")
            _detectedQrUrl.value = url
        }
    }

    fun setLocation(lat: Double, lng: Double) {
        _location.value = Pair(lat, lng)
    }
    
    fun goToReview() {
        if (_selectedImages.value.isNotEmpty()) {
            _uiState.value = ScanState.ReviewImages
        }
    }

    /** Skip scanning — go straight to confirm screen with a user-entered amount */
    fun beginManualFlow(amount: String) {
        _editedAmount.value = amount
        _expenseStates.value = listOf(
            ExpenseEditState(
                imageBytes = null,
                description = "",
                amount = amount,
                currency = "KES",
                category = "Automatic",
                reimbursable = false,
                ocrResult = null
            )
        )
        _currentExpenseIndex.value = 0
        _ocrResults.value = emptyList()
        _selectedImages.value = emptyList()
        _uiState.value = ScanState.OcrResults
    }

    /**
     * Create blank [ExpenseEditState] entries for each captured image and navigate
     * immediately to the confirm screen — no OCR at this point.
     *
     * OCR (Pass 1: Text Recognition + Entity Extraction, Pass 2: KRA eTIMS barcode)
     * runs entirely in the background AFTER the user presses “Create expense”, via
     * [submitAndScanInBackground] → [BackgroundScanService].  This keeps the confirm
     * screen instant and never shows a spinner between capture and confirm.
     */
    fun processOnDevice() {
        val images = _selectedImages.value
        if (images.isEmpty()) return

        _currentExpenseIndex.value = 0
        _expenseStates.value = images.map { bytes ->
            ExpenseEditState(
                imageBytes   = bytes,
                description  = "",
                amount       = "",
                currency     = "KES",
                category     = "Automatic",
                reimbursable = false,
                ocrResult    = null
            )
        }
        _uiState.value = ScanState.OcrResults
    }

    /**
     * Called when the user presses “Create expense”:
     *   1. Register scanning placeholder [ExpenseItem]s in [PendingExpensesRepository]
     *      so [ReportsViewModel] surfaces them in the expense list immediately.
     *   2. Call [onNavigate] — screen navigates to Reports right away (no spinner).
     *   3. Hand off OCR + upload to [BackgroundScanService] whose [CoroutineScope]
     *      is NOT tied to this ViewModel and keeps running after the Create route
     *      is popped from the back stack.
     *   4. Reset this ViewModel so it is ready for the next scan.
     */
    fun submitAndScanInBackground(onNavigate: () -> Unit) {
        val states = _expenseStates.value
        if (states.isEmpty()) return

        val wsId   = _selectedWorkspaceId.value.takeIf { it.isNotBlank() }
        val wsName = workspaceRepository.workspaces.value
            .firstOrNull { it.id == wsId }?.name ?: "Personal"

        // 1. Build placeholder entries (shown immediately with scanning indicator)
        val tempIds = states.map { java.util.UUID.randomUUID().toString() }
        val placeholders = states.mapIndexed { i, state ->
            com.mafutapass.app.data.ExpenseItem(
                id               = tempIds[i],
                amount           = state.amount.toDoubleOrNull() ?: 0.0,
                description      = state.description.takeIf { it.isNotBlank() },
                category         = state.category.takeIf { it != "Automatic" } ?: "Uncategorized",
                workspaceName    = wsName,
                processingStatus = "scanning"
            )
        }
        // Newest first so they appear at the top of the expense list
        pendingExpensesRepository.addAll(placeholders.reversed())

        // 2. Navigate immediately
        onNavigate()

        // 3. OCR + upload in an app-scoped coroutine (survives ViewModel destruction)
        backgroundScanService.submit(
            states        = states,
            tempIds       = tempIds,
            workspaceId   = wsId,
            workspaceName = wsName,
            qrUrl         = _detectedQrUrl.value,
            location      = _location.value
        )

        // 4. Reset for next scan
        reset()
    }

    /**
     * Called when the user presses "Create expense".
     *
     * At this point all OCR work is already done:
     *   Pass 1 — Text Recognition v2 (ML Kit) with spatial bounding-box analysis.
     *            Full receipt text is fed through ML Kit Entity Extraction to
     *            find money amounts (locale-aware: KSh, 1,000.00, 1.000,00, etc.)
     *            and dates.  Merchant name comes from the top-of-page spatial heuristic.
     *            Category is auto-guessed from merchant + item keywords.
     *   Pass 2 — Barcode scan (QR_CODE + DATA_MATRIX) looking for the KRA eTIMS
     *            URL printed at the bottom of Kenyan tax invoices.
     *
     * Both passes ran in [processOnDevice] before the confirm screen was shown,
     * so [ExpenseEditState.ocrResult] is already populated per image.
     *
     * Here we only:
     *   Step 1 — Read: pull cached [ReceiptData] from each [ExpenseEditState].
     *   Step 2 — Merge: user-edited fields always win over OCR-detected values.
     *   Step 3 — Upload: send image + merged fields to the backend API.
     *
     * No raw OCR text ever leaves the device.
     */
    fun uploadAll() {
        val states = _expenseStates.value
        if (states.isEmpty()) return

        _uiState.value = ScanState.Uploading
        _currentUploadIndex.value = 0
        _uploadResults.value = emptyList()

        viewModelScope.launch {
            var sharedReportId: String? = null
            val results = mutableListOf<ReceiptUploadResponse>()
            val qrUrl = _detectedQrUrl.value
            val loc = _location.value

            val wsId = _selectedWorkspaceId.value.takeIf { it.isNotBlank() }
            val wsName = workspaceRepository.workspaces.value
                .firstOrNull { it.id == wsId }?.name ?: "Personal"
            val wsIdPart = wsId?.toRequestBody("text/plain".toMediaType())
            val wsNamePart = wsName.toRequestBody("text/plain".toMediaType())
            val latPart = loc?.first?.toString()?.toRequestBody("text/plain".toMediaType())
            val lngPart = loc?.second?.toString()?.toRequestBody("text/plain".toMediaType())

            for ((index, state) in states.withIndex()) {
                _currentUploadIndex.value = index

                // ── Step 1: Read cached OCR result (computed in processOnDevice) ──
                // Pass 1 (Text Recognition + spatial analysis + Entity Extraction) and
                // Pass 2 (KRA eTIMS QR/barcode scan) both already completed before the
                // confirm screen was shown.  No re-scan needed.
                val ocr: ReceiptData? = state.ocrResult
                val imageBytes = state.imageBytes
                if (ocr != null) {
                    Log.i(TAG, "Upload $index: merchant=${ocr.merchantName}, " +
                        "amount=${ocr.totalAmount}, category=${state.category}, " +
                        "currency=${ocr.currency}, date=${ocr.date}")
                } else {
                    Log.w(TAG, "Upload $index: no cached OCR result (manual entry or OCR failed)")
                }

                // ── Step 2: Merge user edits + OCR ───────────────────────────
                // User-edited fields (description, category, reimbursable) always win.
                // OCR fields (amount, currency, merchant, date) are used as-stored.
                val finalDescription = state.description.takeIf { it.isNotBlank() }
                    ?: ocr?.merchantName ?: ""
                val finalAmount = state.amount.toDoubleOrNull() ?: ocr?.totalAmount ?: 0.0
                val finalCurrency = state.currency.takeIf { it.isNotBlank() } ?: "KES"
                val finalCategory = state.category.takeIf { it != "Automatic" && it.isNotBlank() }
                val finalMerchant = ocr?.merchantName
                val finalDate = ocr?.date

                // ── Step 3: Upload ────────────────────────────────────────────
                if (imageBytes == null) continue
                try {
                    val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaType())
                    val imagePart = MultipartBody.Part.createFormData("image", "receipt_$index.jpg", requestBody)
                    val reportIdPart = sharedReportId?.toRequestBody("text/plain".toMediaType())
                    val qrUrlPart = if (index == 0 && qrUrl != null) qrUrl.toRequestBody("text/plain".toMediaType()) else null

                    val response = apiService.uploadReceipt(
                        image = imagePart,
                        reportId = reportIdPart,
                        workspaceId = wsIdPart,
                        workspaceName = wsNamePart,
                        latitude = latPart,
                        longitude = lngPart,
                        qrUrl = qrUrlPart,
                        description = finalDescription.takeIf { it.isNotBlank() }?.toRequestBody("text/plain".toMediaType()),
                        category = finalCategory?.toRequestBody("text/plain".toMediaType()),
                        reimbursable = state.reimbursable.toString().toRequestBody("text/plain".toMediaType()),
                        amount = finalAmount.toString().toRequestBody("text/plain".toMediaType()),
                        merchant = finalMerchant?.toRequestBody("text/plain".toMediaType()),
                        transactionDate = finalDate?.toRequestBody("text/plain".toMediaType()),
                        currency = finalCurrency.toRequestBody("text/plain".toMediaType())
                    )
                    if (sharedReportId == null && response.reportId != null) sharedReportId = response.reportId
                    results.add(response)
                } catch (e: HttpException) {
                    val serverError = try { e.response()?.errorBody()?.string() } catch (_: Exception) { null }
                    val msg = if (!serverError.isNullOrBlank()) "HTTP ${e.code()}: ${serverError.take(300)}" else "HTTP ${e.code()}: ${e.message()}"
                    Log.e(TAG, "Upload failed (HTTP ${e.code()}) for expense $index: $serverError")
                    results.add(ReceiptUploadResponse(success = false, error = msg))
                } catch (e: Exception) {
                    Log.e(TAG, "Upload failed for expense $index: ${e.message}")
                    results.add(ReceiptUploadResponse(success = false, error = e.message ?: "Upload failed"))
                }
            }

            _uploadResults.value = results
            _uiState.value = ScanState.Results(
                reportId = sharedReportId,
                successCount = results.count { it.success },
                totalCount = results.size
            )
        }
    }
    
    fun reset() {
        _selectedImages.value = emptyList()
        _uploadResults.value = emptyList()
        _ocrResults.value = emptyList()
        _multiPassResults.value = emptyList()
        _editedDescription.value = ""
        _editedAmount.value = ""
        _editedCategory.value = "Other"
        _editedReimbursable.value = false
        _expenseStates.value = emptyList()
        _currentExpenseIndex.value = 0
        _currentUploadIndex.value = 0
        _detectedQrUrl.value = null
        _location.value = null
        _selectedWorkspaceId.value = workspaceRepository.activeWorkspace.value?.id ?: ""
        _uiState.value = ScanState.ChooseMethod
    }
    
    sealed class ScanState {
        data object ChooseMethod : ScanState()
        data object ReviewImages : ScanState()
        /** On-device ML Kit OCR in progress */
        data object Processing : ScanState()
        /** On-device OCR complete — show extracted data */
        data object OcrResults : ScanState()
        data object Uploading : ScanState()
        data class Results(
            val reportId: String?,
            val successCount: Int,
            val totalCount: Int
        ) : ScanState()
    }
}
