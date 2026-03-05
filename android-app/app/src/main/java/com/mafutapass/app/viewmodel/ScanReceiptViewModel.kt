package com.mafutapass.app.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
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
     * Step 1: Run 2-pass scanning on all captured images:
     *   Pass 1 — Text Recognition with spatial/structural analysis
     *   Pass 2 — QR / Barcode scan
     * Financial data stays on-device — no LLM processing.
     */
    fun processOnDevice() {
        val images = _selectedImages.value
        if (images.isEmpty()) return

        // Show the confirm page immediately with blank fields — one placeholder per captured image.
        // No on-device OCR before the user confirms. The server handles AI/OCR processing after upload.
        _currentExpenseIndex.value = 0
        _expenseStates.value = images.map { imgBytes ->
            ExpenseEditState(
                imageBytes = imgBytes,
                description = "",
                amount = "",
                currency = "KES",
                category = "Automatic",
                reimbursable = false,
                ocrResult = null
            )
        }
        _uiState.value = ScanState.OcrResults
    }

    /**
     * Called when the user presses "Create expense".
     *
     * Step 1 — ML Kit OCR: runs on-device 2-pass scan on every image.
     * Step 2 — Merge: OCR supplies amount / merchant / date / currency.
     *           User-edited description, category, reimbursable always win.
     * Step 3 — Upload: sends image + merged fields to the backend.
     *
     * Financial data is read entirely on-device — raw OCR text never leaves the phone.
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

                // ── Step 1: ML Kit OCR ────────────────────────────────────────
                var ocr: ReceiptData? = null
                val imageBytes = state.imageBytes

                if (imageBytes != null) {
                    Log.i(TAG, "══════ OCR for image $index (${imageBytes.size / 1024}KB) ══════")
                    val bitmap = android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    if (bitmap != null) {
                        val multiPass = receiptProcessor.processAllPasses(bitmap, System.currentTimeMillis())
                        ocr = multiPass.bestResult
                        if (multiPass.qrUrls.isNotEmpty() && _detectedQrUrl.value == null) {
                            _detectedQrUrl.value = multiPass.qrUrls.first()
                        }
                        Log.i(TAG, "OCR $index: merchant=${ocr.merchantName}, amount=${ocr.totalAmount}, date=${ocr.date}, currency=${ocr.currency}")
                    } else {
                        Log.e(TAG, "Failed to decode image $index for OCR")
                    }
                }

                // ── Step 2: Merge user edits + OCR ───────────────────────────
                // User values (description, category, reimbursable) always take priority.
                // OCR fills in amount, merchant name (if user left description blank), date, currency.
                val finalDescription = state.description.takeIf { it.isNotBlank() }
                    ?: ocr?.merchantName ?: ""
                val finalAmount = ocr?.totalAmount ?: state.amount.toDoubleOrNull() ?: 0.0
                val finalCurrency = ocr?.currency?.takeIf { it.isNotBlank() } ?: state.currency
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
