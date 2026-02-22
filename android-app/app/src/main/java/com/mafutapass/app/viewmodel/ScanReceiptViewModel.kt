package com.mafutapass.app.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.ReceiptUploadResponse
import com.mafutapass.app.data.WorkspaceRepository
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

    /** Workspaces for the picker — comes from the repository (already cached) */
    val workspaces = workspaceRepository.workspaces

    /** The workspace the user selected for this receipt batch */
    private val _selectedWorkspaceId = MutableStateFlow(
        workspaceRepository.activeWorkspace.value?.id ?: ""
    )
    val selectedWorkspaceId: StateFlow<String> = _selectedWorkspaceId.asStateFlow()

    init {
        // If the repository hadn't finished loading when the ViewModel was created,
        // update _selectedWorkspaceId as soon as the active workspace becomes available.
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
    
    fun goToReview() {
        if (_selectedImages.value.isNotEmpty()) {
            _uiState.value = ScanState.ReviewImages
        }
    }
    
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

            // Build workspace parts from the selected workspace
            val wsId = _selectedWorkspaceId.value.takeIf { it.isNotBlank() }
            val wsName = workspaceRepository.workspaces.value
                .firstOrNull { it.id == wsId }?.name ?: "Personal"
            val wsIdPart = wsId?.toRequestBody("text/plain".toMediaType())
            val wsNamePart = wsName.toRequestBody("text/plain".toMediaType())

            for ((index, imageBytes) in images.withIndex()) {
                _currentUploadIndex.value = index
                try {
                    val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaType())
                    val imagePart = MultipartBody.Part.createFormData("image", "receipt_$index.jpg", requestBody)

                    val reportIdPart = sharedReportId?.toRequestBody("text/plain".toMediaType())

                    // Send QR URL on first upload (the backend will process it)
                    val qrUrlPart = if (index == 0 && qrUrl != null) {
                        qrUrl.toRequestBody("text/plain".toMediaType())
                    } else null

                    val response = apiService.uploadReceipt(
                        image = imagePart,
                        reportId = reportIdPart,
                        workspaceId = wsIdPart,
                        workspaceName = wsNamePart,
                        qrUrl = qrUrlPart
                    )

                    if (sharedReportId == null && response.reportId != null) {
                        sharedReportId = response.reportId
                    }

                    results.add(response)
                } catch (e: HttpException) {
                    // Parse the error body for the real server message
                    val serverError = try {
                        e.response()?.errorBody()?.string()
                    } catch (_: Exception) { null }
                    val msg = if (!serverError.isNullOrBlank()) {
                        val bodySnippet = serverError.take(300)
                        "HTTP ${e.code()}: $bodySnippet"
                    } else {
                        "HTTP ${e.code()}: ${e.message()}"
                    }
                    Log.e(TAG, "Upload failed (HTTP ${e.code()}) for image $index: $serverError")
                    results.add(ReceiptUploadResponse(success = false, error = msg))
                } catch (e: HttpException) {
                    // Read the response body to get the real server error message
                    val serverError = try {
                        e.response()?.errorBody()?.string()
                    } catch (_: Exception) { null }
                    val msg = if (!serverError.isNullOrBlank()) {
                        "HTTP ${e.code()}: ${serverError.take(300)}"
                    } else {
                        "HTTP ${e.code()}: ${e.message()}"
                    }
                    Log.e(TAG, "Upload HTTP ${e.code()} for image $index — $serverError")
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
        _currentUploadIndex.value = 0
        _detectedQrUrl.value = null
        _selectedWorkspaceId.value = workspaceRepository.activeWorkspace.value?.id ?: ""
        _uiState.value = ScanState.ChooseMethod
    }
    
    sealed class ScanState {
        data object ChooseMethod : ScanState()
        data object ReviewImages : ScanState()
        data object Uploading : ScanState()
        data class Results(
            val reportId: String?,
            val successCount: Int,
            val totalCount: Int
        ) : ScanState()
    }
}
