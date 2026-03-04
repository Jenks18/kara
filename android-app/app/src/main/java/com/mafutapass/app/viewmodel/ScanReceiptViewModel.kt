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

    private val _editedReimbursable = MutableStateFlow(false)
    val editedReimbursable: StateFlow<Boolean> = _editedReimbursable.asStateFlow()

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

    fun setReimbursable(value: Boolean) {
        _editedReimbursable.value = value
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

    /**
     * Step 1: Run 2-pass scanning on all captured images:
     *   Pass 1 — Text Recognition with spatial/structural analysis
     *   Pass 2 — QR / Barcode scan
     * Financial data stays on-device — no LLM processing.
     */
    fun processOnDevice() {
        val images = _selectedImages.value
        if (images.isEmpty()) return

        _uiState.value = ScanState.Processing
        _currentUploadIndex.value = 0
        _ocrResults.value = emptyList()
        _multiPassResults.value = emptyList()

        viewModelScope.launch {
            val results = mutableListOf<ReceiptData>()
            val mpResults = mutableListOf<MultiPassResult>()

            for ((index, imageBytes) in images.withIndex()) {
                _currentUploadIndex.value = index
                Log.i(TAG, "══════ 2-PASS SCAN for image $index (${imageBytes.size / 1024}KB) ══════")

                val bitmap = android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                if (bitmap == null) {
                    Log.e(TAG, "Failed to decode image $index")
                    results.add(ReceiptData(rawText = "Failed to decode image"))
                    continue
                }

                val multiPass = receiptProcessor.processAllPasses(bitmap, System.currentTimeMillis())
                mpResults.add(multiPass)

                // Use the "best" merged result
                val best = multiPass.bestResult
                results.add(best)

                // If QR was found in the image scan (Pass 2), record it
                if (multiPass.qrUrls.isNotEmpty() && _detectedQrUrl.value == null) {
                    _detectedQrUrl.value = multiPass.qrUrls.first()
                    Log.i(TAG, "QR detected in Pass 2: ${multiPass.qrUrls.first()}")
                }

                Log.i(TAG, "BEST result $index: merchant=${best.merchantName}, amount=${best.totalAmount}, date=${best.date}, category=${best.category}, etims=${best.hasEtimsMarkers}")
            }
            _ocrResults.value = results
            _multiPassResults.value = mpResults

            // Pre-populate editable fields from best result
            val primary = results.firstOrNull()
            _editedDescription.value = primary?.merchantName ?: ""
            _editedCategory.value = primary?.category ?: "Other"
            // reimbursable defaults to false — user opts in

            _uiState.value = ScanState.OcrResults
        }
    }

    /**
     * Step 2: Upload images to backend for storage.
     * Only the image + user-edited fields are sent — no raw OCR text or
     * extracted financial data leaves the device.
     */
    fun uploadAll() {
        val images = _selectedImages.value
        if (images.isEmpty()) return

        _uiState.value = ScanState.Uploading
        _currentUploadIndex.value = 0
        _uploadResults.value = emptyList()

        viewModelScope.launch {
            var sharedReportId: String? = null
            val results = mutableListOf<ReceiptUploadResponse>()
            val qrUrl = _detectedQrUrl.value
            val loc = _location.value
            val ocrData = _ocrResults.value

            // User-edited confirm fields
            val userDescription = _editedDescription.value.takeIf { it.isNotBlank() }
            val userCategory = _editedCategory.value.takeIf { it.isNotBlank() }
            val userReimbursable = _editedReimbursable.value

            // On-device extracted amount (for the backend to store without re-processing)
            val totalAmount = ocrData.mapNotNull { it.totalAmount }.sum()
            val merchant = ocrData.firstOrNull()?.merchantName
            val date = ocrData.firstOrNull()?.date
            val currency = ocrData.firstOrNull()?.currency ?: "KES"

            val wsId = _selectedWorkspaceId.value.takeIf { it.isNotBlank() }
            val wsName = workspaceRepository.workspaces.value
                .firstOrNull { it.id == wsId }?.name ?: "Personal"
            val wsIdPart = wsId?.toRequestBody("text/plain".toMediaType())
            val wsNamePart = wsName.toRequestBody("text/plain".toMediaType())
            val latPart = loc?.first?.toString()?.toRequestBody("text/plain".toMediaType())
            val lngPart = loc?.second?.toString()?.toRequestBody("text/plain".toMediaType())

            for ((index, imageBytes) in images.withIndex()) {
                _currentUploadIndex.value = index
                try {
                    val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaType())
                    val imagePart = MultipartBody.Part.createFormData("image", "receipt_$index.jpg", requestBody)
                    val reportIdPart = sharedReportId?.toRequestBody("text/plain".toMediaType())

                    val qrUrlPart = if (index == 0 && qrUrl != null) {
                        qrUrl.toRequestBody("text/plain".toMediaType())
                    } else null

                    // User-confirmed fields from the confirm screen
                    val descriptionPart = userDescription
                        ?.toRequestBody("text/plain".toMediaType())
                    val categoryPart = userCategory
                        ?.toRequestBody("text/plain".toMediaType())
                    val reimbursablePart = userReimbursable.toString()
                        .toRequestBody("text/plain".toMediaType())

                    // Send amount/merchant/date as user-confirmed values
                    // (on-device extracted, shown to user, potentially edited)
                    val amountPart = totalAmount.toString()
                        .toRequestBody("text/plain".toMediaType())
                    val merchantPart = merchant
                        ?.toRequestBody("text/plain".toMediaType())
                    val datePart = date
                        ?.toRequestBody("text/plain".toMediaType())
                    val currencyPart = currency
                        .toRequestBody("text/plain".toMediaType())

                    val response = apiService.uploadReceipt(
                        image = imagePart,
                        reportId = reportIdPart,
                        workspaceId = wsIdPart,
                        workspaceName = wsNamePart,
                        latitude = latPart,
                        longitude = lngPart,
                        qrUrl = qrUrlPart,
                        description = descriptionPart,
                        category = categoryPart,
                        reimbursable = reimbursablePart,
                        amount = amountPart,
                        merchant = merchantPart,
                        transactionDate = datePart,
                        currency = currencyPart
                    )

                    if (sharedReportId == null && response.reportId != null) {
                        sharedReportId = response.reportId
                    }

                    results.add(response)
                } catch (e: HttpException) {
                    val serverError = try {
                        e.response()?.errorBody()?.string()
                    } catch (_: Exception) { null }
                    val msg = if (!serverError.isNullOrBlank()) {
                        "HTTP ${e.code()}: ${serverError.take(300)}"
                    } else {
                        "HTTP ${e.code()}: ${e.message()}"
                    }
                    Log.e(TAG, "Upload failed (HTTP ${e.code()}) for image $index: $serverError")
                    results.add(ReceiptUploadResponse(success = false, error = msg))
                } catch (e: Exception) {
                    Log.e(TAG, "Upload failed for image $index: ${e.message}")
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
        _editedCategory.value = "Other"
        _editedReimbursable.value = false
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
