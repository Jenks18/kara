package com.mafutapass.app.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.ReceiptUploadResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import javax.inject.Inject

@HiltViewModel
class ScanReceiptViewModel @Inject constructor(
    private val apiService: ApiService,
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
            
            for ((index, imageBytes) in images.withIndex()) {
                _currentUploadIndex.value = index
                try {
                    val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaType())
                    val imagePart = MultipartBody.Part.createFormData("image", "receipt_$index.jpg", requestBody)
                    
                    val reportIdPart = sharedReportId?.toRequestBody("text/plain".toMediaType())
                    
                    val response = apiService.uploadReceipt(
                        image = imagePart,
                        reportId = reportIdPart
                    )
                    
                    if (sharedReportId == null && response.reportId != null) {
                        sharedReportId = response.reportId
                    }
                    
                    results.add(response)
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
