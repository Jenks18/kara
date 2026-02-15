package com.mafutapass.app.ui.screens

import android.Manifest
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.ScanReceiptViewModel
import com.mafutapass.app.viewmodel.ScanReceiptViewModel.ScanState
import java.io.ByteArrayOutputStream
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanReceiptScreen(
    onBack: () -> Unit,
    onNavigateToReport: (String) -> Unit = {},
    viewModel: ScanReceiptViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val selectedImages by viewModel.selectedImages.collectAsState()
    val uploadResults by viewModel.uploadResults.collectAsState()
    val currentUploadIndex by viewModel.currentUploadIndex.collectAsState()

    // Gallery picker
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        uris.forEach { uri -> viewModel.addImageFromUri(uri) }
    }

    // Camera state
    var showCamera by remember { mutableStateOf(false) }
    var hasCameraPermission by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (granted) showCamera = true
        else Toast.makeText(context, "Camera permission required to scan receipts", Toast.LENGTH_SHORT).show()
    }

    // Full-screen camera overlay
    if (showCamera && hasCameraPermission) {
        CameraCapture(
            onImageCaptured = { bytes ->
                viewModel.addImageBytes(bytes)
                showCamera = false
            },
            onClose = { showCamera = false }
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        TopAppBar(
            title = { Text("Scan Receipt", fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = {
                    if (uiState is ScanState.ReviewImages) {
                        viewModel.reset()
                    } else {
                        onBack()
                    }
                }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0)
        )

        when (val state = uiState) {
            is ScanState.ChooseMethod -> ChooseMethodContent(
                onTakePhoto = {
                    permissionLauncher.launch(Manifest.permission.CAMERA)
                },
                onChooseFromGallery = {
                    galleryLauncher.launch("image/*")
                }
            )
            is ScanState.ReviewImages -> ReviewImagesContent(
                images = selectedImages,
                onRemoveImage = { viewModel.removeImage(it) },
                onAddMore = {
                    galleryLauncher.launch("image/*")
                },
                onTakeAnother = {
                    permissionLauncher.launch(Manifest.permission.CAMERA)
                },
                onSubmit = { viewModel.uploadAll() }
            )
            is ScanState.Uploading -> UploadingContent(
                currentIndex = currentUploadIndex,
                totalCount = selectedImages.size
            )
            is ScanState.Results -> ResultsContent(
                state = state,
                results = uploadResults,
                onViewReport = { reportId ->
                    onNavigateToReport(reportId)
                },
                onDone = {
                    viewModel.reset()
                    onBack()
                }
            )
        }
    }
}

@Composable
private fun ChooseMethodContent(
    onTakePhoto: () -> Unit,
    onChooseFromGallery: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Filled.Receipt,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(Modifier.height(16.dp))
        Text(
            "How would you like to add your receipt?",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Take a photo or choose from your gallery",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(32.dp))

        // Take Photo button
        Button(
            onClick = onTakePhoto,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Filled.CameraAlt, null, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Text("Take Photo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }

        Spacer(Modifier.height(12.dp))

        // Choose from Gallery button
        OutlinedButton(
            onClick = onChooseFromGallery,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Filled.Image, null, modifier = Modifier.size(22.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(12.dp))
            Text("Choose from Gallery", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun ReviewImagesContent(
    images: List<ByteArray>,
    onRemoveImage: (Int) -> Unit,
    onAddMore: () -> Unit,
    onTakeAnother: () -> Unit,
    onSubmit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            "${images.size} receipt${if (images.size > 1) "s" else ""} selected",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            "Review your images before processing",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(Modifier.height(16.dp))

        // Image preview grid
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            itemsIndexed(images) { index, imageBytes ->
                val bitmap = remember(imageBytes) {
                    BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                }
                Box(modifier = Modifier.width(240.dp)) {
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap.asImageBitmap(),
                            contentDescription = "Receipt ${index + 1}",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(16.dp))
                        )
                    }
                    // Remove button
                    IconButton(
                        onClick = { onRemoveImage(index) },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                            .size(32.dp)
                            .background(MaterialTheme.colorScheme.error, CircleShape)
                    ) {
                        Icon(Icons.Filled.Close, "Remove", tint = MaterialTheme.colorScheme.onError, modifier = Modifier.size(18.dp))
                    }
                    // Index badge
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                            .size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text("${index + 1}", color = MaterialTheme.colorScheme.onPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Add more buttons
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = onTakeAnother,
                modifier = Modifier.weight(1f).height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Filled.CameraAlt, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Camera", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            }
            OutlinedButton(
                onClick = onAddMore,
                modifier = Modifier.weight(1f).height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Filled.Add, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Gallery", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            }
        }

        Spacer(Modifier.height(12.dp))

        // Submit button
        Button(
            onClick = onSubmit,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Filled.CloudUpload, null, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Text(
                "Process ${images.size} Receipt${if (images.size > 1) "s" else ""}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun UploadingContent(currentIndex: Int, totalCount: Int) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(64.dp),
            color = MaterialTheme.colorScheme.primary,
            strokeWidth = 5.dp
        )
        Spacer(Modifier.height(24.dp))
        Text(
            "Processing receipts...",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Receipt ${currentIndex + 1} of $totalCount",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "AI is extracting merchant, amount, and date",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(24.dp))
        LinearProgressIndicator(
            progress = { if (totalCount > 0) (currentIndex + 1).toFloat() / totalCount else 0f },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
private fun ResultsContent(
    state: ScanState.Results,
    results: List<com.mafutapass.app.data.ReceiptUploadResponse>,
    onViewReport: (String) -> Unit,
    onDone: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(32.dp))

        // Success/Partial icon
        val allSuccess = state.successCount == state.totalCount
        Icon(
            if (allSuccess) Icons.Filled.CheckCircle else Icons.Filled.Warning,
            contentDescription = null,
            modifier = Modifier.size(72.dp),
            tint = if (allSuccess) MaterialTheme.colorScheme.primary else AppTheme.colors.statusPending
        )
        Spacer(Modifier.height(16.dp))
        Text(
            if (allSuccess) "All receipts processed!" else "${state.successCount}/${state.totalCount} processed",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(Modifier.height(24.dp))

        // Result cards
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            results.forEachIndexed { index, result ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            if (result.success) Icons.Filled.CheckCircle else Icons.Filled.Error,
                            null,
                            tint = if (result.success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                result.merchant ?: "Receipt ${index + 1}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (result.success && result.amount > 0) {
                                Text(
                                    "KES ${String.format("%.2f", result.amount)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            if (!result.success) {
                                Text(
                                    result.error ?: "Processing failed",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                        if (result.kraVerified) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                            ) {
                                Text(
                                    "KRA ✓",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // View Report button
        if (state.reportId != null) {
            Button(
                onClick = { onViewReport(state.reportId) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Icon(Icons.Filled.Description, null, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(12.dp))
                Text("View Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
        }

        // Done button
        OutlinedButton(
            onClick = onDone,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Done", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun CameraCapture(
    onImageCaptured: (ByteArray) -> Unit,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val imageCapture = remember { ImageCapture.Builder().build() }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).also { previewView ->
                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener({
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }
                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_BACK_CAMERA,
                                preview,
                                imageCapture
                            )
                        } catch (e: Exception) {
                            Log.e("CameraCapture", "Camera bind failed", e)
                        }
                    }, ContextCompat.getMainExecutor(ctx))
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Close button
        IconButton(
            onClick = onClose,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp)
                .size(48.dp)
                .background(
                    MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                    CircleShape
                )
        ) {
            Icon(Icons.Filled.Close, "Close camera", tint = MaterialTheme.colorScheme.onSurface)
        }

        // Capture button
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 48.dp)
        ) {
            IconButton(
                onClick = {
                    val outputFile = File(context.cacheDir, "receipt_${System.currentTimeMillis()}.jpg")
                    val outputOptions = ImageCapture.OutputFileOptions.Builder(outputFile).build()
                    imageCapture.takePicture(
                        outputOptions,
                        ContextCompat.getMainExecutor(context),
                        object : ImageCapture.OnImageSavedCallback {
                            override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                val bytes = outputFile.readBytes()
                                outputFile.delete()
                                onImageCaptured(bytes)
                            }
                            override fun onError(e: ImageCaptureException) {
                                Log.e("CameraCapture", "Capture failed: ${e.message}")
                                Toast.makeText(context, "Capture failed", Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                },
                modifier = Modifier
                    .size(80.dp)
                    .background(MaterialTheme.colorScheme.primary, CircleShape)
                    .border(4.dp, MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f), CircleShape)
            ) {
                Icon(
                    Icons.Filled.CameraAlt,
                    "Capture",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(36.dp)
                )
            }
        }

        // Gallery button
        IconButton(
            onClick = onClose, // Will be handled by caller re-opening gallery
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 32.dp, bottom = 56.dp)
                .size(48.dp)
                .background(
                    MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                    CircleShape
                )
        ) {
            Icon(Icons.Filled.Image, "Gallery", tint = MaterialTheme.colorScheme.onSurface)
        }
    }
}

private object Log {
    fun e(tag: String, msg: String, e: Exception? = null) {
        android.util.Log.e(tag, msg, e)
    }
}
