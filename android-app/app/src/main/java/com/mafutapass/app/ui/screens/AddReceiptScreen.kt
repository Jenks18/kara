package com.mafutapass.app.ui.screens

import android.Manifest
import android.app.Activity
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.android.gms.location.LocationServices
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import com.mafutapass.app.data.ReceiptUploadResponse
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.CurrencyFormatter
import com.mafutapass.app.viewmodel.ScanReceiptViewModel
import com.mafutapass.app.viewmodel.ScanReceiptViewModel.ScanState
import java.io.File
import java.util.concurrent.Executors

private const val TAG = "AddReceiptScreen"

/**
 * AddReceiptScreen — the "Create" / middle tab in the bottom navigation.
 *
 * Two capture methods:
 *  1. Scan Receipt — ML Kit Document Scanner (detects receipt edges, crops,
 *     perspective-corrects, supports multi-page). Falls back to CameraX
 *     multi-capture if Document Scanner fails to initialise.
 *  2. Gallery — pick from existing images
 *
 * After capture (either method), captured images are scanned for eTIMS QR codes
 * via ML Kit Barcode Scanner before upload.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddReceiptScreen(
    onNavigateToReport: (String) -> Unit = {},
    viewModel: ScanReceiptViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val uiState by viewModel.uiState.collectAsState()
    val selectedImages by viewModel.selectedImages.collectAsState()
    val uploadResults by viewModel.uploadResults.collectAsState()
    val currentUploadIndex by viewModel.currentUploadIndex.collectAsState()
    val workspaces by viewModel.workspaces.collectAsState()
    val selectedWorkspaceId by viewModel.selectedWorkspaceId.collectAsState()

    // Gallery picker — also scans each image for eTIMS QR codes
    // Limit to 10 images max (consistent with iOS and webapp)
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        uris.take(10).forEach { uri ->
            viewModel.addImageFromUri(uri)
            // Scan gallery image for QR code
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                inputStream?.use { stream ->
                    val bytes = stream.readBytes()
                    scanImageForQrCode(context, bytes) { qrUrl ->
                        viewModel.setDetectedQrUrl(qrUrl)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to scan gallery image for QR: ${e.message}")
            }
        }
    }

    // === ML Kit Document Scanner ===
    val scannerOptions = remember {
        GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(true)
            .setPageLimit(10)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build()
    }
    val scanner = remember { GmsDocumentScanning.getClient(scannerOptions) }

    val scannerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val scanResult = GmsDocumentScanningResult.fromActivityResultIntent(result.data)
            scanResult?.pages?.forEach { page ->
                try {
                    val inputStream = context.contentResolver.openInputStream(page.imageUri)
                    inputStream?.use { stream ->
                        val bytes = stream.readBytes()
                        viewModel.addImageBytes(bytes)
                        // Scan each captured image for eTIMS QR codes
                        scanImageForQrCode(context, bytes) { qrUrl ->
                            viewModel.setDetectedQrUrl(qrUrl)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to read scanned page: ${e.message}")
                }
            }
        }
    }

    // Camera permission + state (for fallback multi-capture camera)
    var showCamera by remember { mutableStateOf(false) }
    var hasCameraPermission by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (granted) showCamera = true
        else Toast.makeText(context, "Camera permission required to scan receipts", Toast.LENGTH_SHORT).show()
    }

    // Request location once when the screen appears (best-effort, non-blocking)
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { perms: Map<String, Boolean> ->
        val locationGranted = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (locationGranted) {
            try {
                // Use lastLocation to avoid Priority @IntDef cross-language type inference issues.
                // lastLocation is sufficient for attaching approximate location to a receipt.
                val fusedClient: com.google.android.gms.location.FusedLocationProviderClient =
                    LocationServices.getFusedLocationProviderClient(context)
                @Suppress("MissingPermission")
                fusedClient.lastLocation
                    .addOnSuccessListener { loc: android.location.Location? ->
                        if (loc != null) viewModel.setLocation(loc.latitude, loc.longitude)
                    }
            } catch (e: SecurityException) {
                Log.e(TAG, "Location permission revoked: ${e.message}")
            }
        }
    }

    LaunchedEffect(Unit) {
        locationPermissionLauncher.launch(
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        )
    }

    // QR scanning is integrated into MultiCaptureCamera via the QR mode toggle button

    // Full-screen fallback camera — used only if Document Scanner fails to start
    if (showCamera && hasCameraPermission) {
        MultiCaptureCamera(
            onImageCaptured = { bytes -> viewModel.addImageBytes(bytes) },
            onQrCodeDetected = { url -> viewModel.setDetectedQrUrl(url) },
            captureCount = selectedImages.size,
            onDone = { showCamera = false }
        )
        return
    }

    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
            .nestedScroll(scrollBehavior.nestedScrollConnection)
    ) {
        val isLanding = uiState is ScanState.ChooseMethod
        val title = when (uiState) {
            is ScanState.ChooseMethod -> "Add Receipt"
            is ScanState.ReviewImages -> "Review Receipts"
            is ScanState.Uploading    -> "Processing"
            is ScanState.Results      -> "Results"
        }

        TopAppBar(
            title = { Text(title, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                if (!isLanding) {
                    IconButton(onClick = { viewModel.reset() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface,
                scrolledContainerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
            ),
            scrollBehavior = scrollBehavior
        )

        when (val state = uiState) {
            is ScanState.ChooseMethod -> ChooseMethodSection(
                onScanReceipt = {
                    if (activity != null) {
                        scanner.getStartScanIntent(activity)
                            .addOnSuccessListener { intentSender ->
                                scannerLauncher.launch(IntentSenderRequest.Builder(intentSender).build())
                            }
                            .addOnFailureListener { e ->
                                Log.e(TAG, "Document scanner failed to start: ${e.message}")
                                // Fall back to multi-capture camera
                                permissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                    }
                },
                onChooseFromGallery = { galleryLauncher.launch("image/*") }
            )
            is ScanState.ReviewImages -> ReviewImagesSection(
                images = selectedImages,
                workspaces = workspaces,
                selectedWorkspaceId = selectedWorkspaceId,
                onWorkspaceSelected = { viewModel.setWorkspaceId(it) },
                onRemoveImage = { viewModel.removeImage(it) },
                onAddMore = { galleryLauncher.launch("image/*") },
                onTakeAnother = {
                    // Launch Document Scanner (same as main scan) — NOT the fallback CameraX
                    if (activity != null) {
                        scanner.getStartScanIntent(activity)
                            .addOnSuccessListener { intentSender ->
                                scannerLauncher.launch(IntentSenderRequest.Builder(intentSender).build())
                            }
                            .addOnFailureListener { e ->
                                Log.e(TAG, "Document scanner failed to start: ${e.message}")
                                // Fall back to multi-capture camera only if doc scanner unavailable
                                permissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                    }
                },
                onSubmit = { viewModel.uploadAll() }
            )
            is ScanState.Uploading -> UploadingSection(
                currentIndex = currentUploadIndex,
                totalCount = selectedImages.size
            )
            is ScanState.Results -> ResultsSection(
                state = state,
                results = uploadResults,
                onViewReport = { onNavigateToReport(it) },
                onScanAnother = { viewModel.reset() }
            )
        }
    }
}

// ── Sub-composables ──────────────────────────────────────────────────────────

@Composable
private fun ChooseMethodSection(
    onScanReceipt: () -> Unit,
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
            "Auto-detects receipt edges and supports multi-page capture",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(32.dp))

        // Primary: Scan Receipt (ML Kit Document Scanner)
        Button(
            onClick = onScanReceipt,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Filled.DocumentScanner, null, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Text("Scan Receipt", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Auto-detects edges, crops & corrects perspective",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(16.dp))

        // Gallery — QR scanning is available via the toggle inside the camera view
        OutlinedButton(
            onClick = onChooseFromGallery,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.outline)
        ) {
            Icon(Icons.Filled.Image, null, modifier = Modifier.size(22.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(12.dp))
            Text("Choose from Gallery", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ReviewImagesSection(
    images: List<ByteArray>,
    workspaces: List<com.mafutapass.app.data.Workspace>,
    selectedWorkspaceId: String,
    onWorkspaceSelected: (String) -> Unit,
    onRemoveImage: (Int) -> Unit,
    onAddMore: () -> Unit,
    onTakeAnother: () -> Unit,
    onSubmit: () -> Unit
) {
    var workspaceMenuExpanded by remember { mutableStateOf(false) }
    val selectedWorkspace = workspaces.firstOrNull { it.id == selectedWorkspaceId }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp)
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

        // Workspace picker
        if (workspaces.isNotEmpty()) {
            Text(
                "Workspace",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Box {
                OutlinedButton(
                    onClick = { workspaceMenuExpanded = true },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Filled.Business, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        selectedWorkspace?.name ?: "Select workspace",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(Icons.Filled.KeyboardArrowDown, null, modifier = Modifier.size(18.dp))
                }
                DropdownMenu(
                    expanded = workspaceMenuExpanded,
                    onDismissRequest = { workspaceMenuExpanded = false }
                ) {
                    workspaces.forEach { ws ->
                        DropdownMenuItem(
                            text = { Text(ws.name) },
                            leadingIcon = {
                                if (ws.isActive) Icon(
                                    Icons.Filled.Check,
                                    null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(16.dp)
                                )
                            },
                            onClick = {
                                onWorkspaceSelected(ws.id)
                                workspaceMenuExpanded = false
                            }
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
        }

        Spacer(Modifier.height(16.dp))

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
                            modifier = Modifier.fillMaxHeight().clip(RoundedCornerShape(16.dp))
                        )
                    }
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
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp).size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text("${index + 1}", color = MaterialTheme.colorScheme.onPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

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

        Button(
            onClick = onSubmit,
            enabled = images.isNotEmpty(),
            modifier = Modifier.fillMaxWidth().height(56.dp),
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
private fun UploadingSection(currentIndex: Int, totalCount: Int) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
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
            "Extracting receipt details...",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(24.dp))
        LinearProgressIndicator(
            progress = { if (totalCount > 0) (currentIndex + 1).toFloat() / totalCount else 0f },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            color = MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
private fun ResultsSection(
    state: ScanState.Results,
    results: List<ReceiptUploadResponse>,
    onViewReport: (String) -> Unit,
    onScanAnother: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(32.dp))

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

        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f).verticalScroll(rememberScrollState())
        ) {
            results.forEachIndexed { index, result ->
                ReceiptResultCard(index = index, result = result)
            }
        }

        Spacer(Modifier.height(16.dp))

        if (state.reportId != null) {
            Button(
                onClick = { onViewReport(state.reportId) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Icon(Icons.Filled.Description, null, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(12.dp))
                Text("View Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
        }

        OutlinedButton(
            onClick = onScanAnother,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Filled.AddAPhoto, null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Scan Another Receipt", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun ReceiptResultCard(index: Int, result: ReceiptUploadResponse) {
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
                    result.cleanMerchant(),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (result.success && result.amount > 0) {
                    Text(
                        CurrencyFormatter.formatSimple(result.amount),
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

// ── Multi-Capture Camera with QR Detection ────────────────────────────────────

/**
 * Dedicated QR code scanner — full-screen camera that:
 * 1. Scans frames for eTIMS/KRA QR codes via ML Kit
 * 2. Once detected, shows a success banner and prompts user to also capture the receipt image
 * 3. User taps "Capture Receipt" to take a photo, then "Done"
 */
@Composable
private fun QrCodeScanner(
    onQrCodeDetected: (String) -> Unit,
    onCaptureReceipt: (ByteArray) -> Unit,
    onDone: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val imageCapture = remember { ImageCapture.Builder().build() }
    var detectedQr by remember { mutableStateOf<String?>(null) }
    var hasCaptured by remember { mutableStateOf(false) }
    var isCapturing by remember { mutableStateOf(false) }

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

                        val barcodeScanner = BarcodeScanning.getClient()
                        val analysisExecutor = Executors.newSingleThreadExecutor()
                        val imageAnalysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                            .also { analysis ->
                                analysis.setAnalyzer(analysisExecutor) { imageProxy ->
                                    processQrFrame(imageProxy, barcodeScanner) { qrUrl ->
                                        // Accept any URL-like QR (eTIMS + others)
                                        if (detectedQr == null) {
                                            detectedQr = qrUrl
                                            onQrCodeDetected(qrUrl)
                                        }
                                    }
                                }
                            }

                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_BACK_CAMERA,
                                preview,
                                imageCapture,
                                imageAnalysis
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "QR Camera bind failed", e)
                        }
                    }, ContextCompat.getMainExecutor(ctx))
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // QR scanning overlay — crosshair / guide
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(48.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(250.dp)
                    .border(3.dp, if (detectedQr != null) MaterialTheme.colorScheme.primary else Color.White.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
            )
        }

        // Close button
        IconButton(
            onClick = onDone,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp)
                .size(48.dp)
                .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.8f), CircleShape)
        ) {
            Icon(Icons.Filled.Close, "Close", tint = MaterialTheme.colorScheme.onSurface)
        }

        // Status banner
        val bannerInfo = when {
            detectedQr != null && hasCaptured -> "QR captured + Receipt photo taken!"
            detectedQr != null -> "QR Code Detected! Now capture the full receipt."
            else -> "Point camera at the eTIMS QR code on your receipt"
        }
        val bannerColor = if (detectedQr != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface.copy(alpha = 0.85f)
        val bannerTextColor = if (detectedQr != null) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface

        Surface(
            shape = RoundedCornerShape(12.dp),
            color = bannerColor,
            shadowElevation = 4.dp,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 80.dp, start = 24.dp, end = 24.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    if (detectedQr != null) Icons.Filled.CheckCircle else Icons.Filled.QrCodeScanner,
                    null,
                    tint = bannerTextColor,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    bannerInfo,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = bannerTextColor
                )
            }
        }

        // Bottom controls
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 48.dp, start = 24.dp, end = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (detectedQr != null && !hasCaptured) {
                // QR detected → show capture button for the full receipt
                Button(
                    onClick = {
                        if (isCapturing) return@Button
                        isCapturing = true
                        val outputFile = File(context.cacheDir, "qr_receipt_${System.currentTimeMillis()}.jpg")
                        val outputOptions = ImageCapture.OutputFileOptions.Builder(outputFile).build()
                        imageCapture.takePicture(
                            outputOptions,
                            ContextCompat.getMainExecutor(context),
                            object : ImageCapture.OnImageSavedCallback {
                                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                    val bytes = outputFile.readBytes()
                                    outputFile.delete()
                                    onCaptureReceipt(bytes)
                                    hasCaptured = true
                                    isCapturing = false
                                }
                                override fun onError(e: ImageCaptureException) {
                                    Log.e(TAG, "QR receipt capture failed: ${e.message}")
                                    Toast.makeText(context, "Capture failed", Toast.LENGTH_SHORT).show()
                                    isCapturing = false
                                }
                            }
                        )
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    enabled = !isCapturing
                ) {
                    Icon(Icons.Filled.CameraAlt, null, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("Capture Receipt Photo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                }
            }

            if (hasCaptured) {
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = onDone,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Filled.Check, null, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("Done — Review & Process", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                }
            }

            if (detectedQr != null && !hasCaptured) {
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = onDone) {
                    Text("Skip photo — process QR only", color = Color.White.copy(alpha = 0.8f))
                }
            }
        }
    }
}

// ── Multi-Capture Camera with QR Detection ────────────────────────────────────

/**
 * Full-screen camera that stays open between captures.
 * While the camera is live, ML Kit barcode scanning runs on each frame
 * to detect eTIMS QR codes. When one is found, it's highlighted briefly.
 */
@Composable
private fun MultiCaptureCamera(
    onImageCaptured: (ByteArray) -> Unit,
    onQrCodeDetected: (String) -> Unit,
    captureCount: Int,
    onDone: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val imageCapture = remember { ImageCapture.Builder().build() }
    var localCaptureCount by remember { mutableIntStateOf(captureCount) }
    var detectedQr by remember { mutableStateOf<String?>(null) }
    var isCapturing by remember { mutableStateOf(false) }
    var qrMode by remember { mutableStateOf(false) }
    // Stable holder for background-thread reads inside the camera analyzer
    val qrModeHolder = remember { arrayOf(false) }
    LaunchedEffect(qrMode) { qrModeHolder[0] = qrMode }

    // QR banner auto-dismiss — receipt mode only; in QR mode banner stays until user dismisses
    LaunchedEffect(detectedQr) {
        if (detectedQr != null && !qrMode) {
            kotlinx.coroutines.delay(3000)
            detectedQr = null
        }
    }

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

                        // Barcode analysis for eTIMS QR codes
                        val barcodeScanner = BarcodeScanning.getClient()
                        val analysisExecutor = Executors.newSingleThreadExecutor()
                        val imageAnalysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                            .also { analysis ->
                                analysis.setAnalyzer(analysisExecutor) { imageProxy ->
                                    processQrFrame(imageProxy, barcodeScanner) { qrUrl ->
                                        if (qrModeHolder[0]) {
                                            // QR mode: capture ANY QR/barcode URL
                                            if (detectedQr == null) {
                                                detectedQr = qrUrl
                                                onQrCodeDetected(qrUrl)
                                            }
                                        } else if (qrUrl.contains("etims", ignoreCase = true) ||
                                            qrUrl.contains("kra.go.ke", ignoreCase = true) ||
                                            qrUrl.contains("itax", ignoreCase = true)) {
                                            detectedQr = qrUrl
                                            onQrCodeDetected(qrUrl)
                                        }
                                    }
                                }
                            }

                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_BACK_CAMERA,
                                preview,
                                imageCapture,
                                imageAnalysis
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "Camera bind failed", e)
                        }
                    }, ContextCompat.getMainExecutor(ctx))
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Overlay: receipt guide in normal mode, QR crosshair in QR mode
        if (!qrMode) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.75f)
                        .align(Alignment.Center)
                        .border(2.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                )
            }
        } else {
            Box(
                modifier = Modifier.fillMaxSize().padding(48.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(250.dp)
                        .border(3.dp, if (detectedQr != null) MaterialTheme.colorScheme.primary else Color.White.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                )
            }
        }

        // QR detection banner
        AnimatedVisibility(
            visible = detectedQr != null,
            enter = slideInVertically { -it } + fadeIn(),
            exit = slideOutVertically { -it } + fadeOut(),
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 80.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 4.dp,
                modifier = Modifier.padding(horizontal = 24.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Filled.QrCodeScanner, null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(
                            if (qrMode) "QR Code Captured!" else "eTIMS QR Detected!",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Text(
                            if (qrMode) "Capture receipt photo too — tap ✓ when done" else "KRA link captured for verification",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }

        // Close button
        IconButton(
            onClick = onDone,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp)
                .size(48.dp)
                .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.8f), CircleShape)
        ) {
            Icon(Icons.Filled.Close, "Close camera", tint = MaterialTheme.colorScheme.onSurface)
        }

        // Capture count badge
        if (localCaptureCount > 0) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
            ) {
                Text(
                    "$localCaptureCount captured",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                )
            }
        }

        // Bottom controls: Gallery | Capture | Done
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 48.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // QR mode toggle — tap to switch between receipt capture and QR scanning
            IconButton(
                onClick = {
                    qrMode = !qrMode
                    detectedQr = null // clear stale banner on mode switch
                },
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        if (qrMode) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                        CircleShape
                    )
            ) {
                Icon(
                    Icons.Filled.QrCodeScanner, "Toggle QR mode",
                    tint = if (qrMode) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                )
            }

            // Capture button
            IconButton(
                onClick = {
                    if (isCapturing) return@IconButton
                    isCapturing = true
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
                                localCaptureCount++
                                isCapturing = false
                            }
                            override fun onError(e: ImageCaptureException) {
                                Log.e(TAG, "Capture failed: ${e.message}")
                                Toast.makeText(context, "Capture failed", Toast.LENGTH_SHORT).show()
                                isCapturing = false
                            }
                        }
                    )
                },
                modifier = Modifier
                    .size(80.dp)
                    .background(
                        if (isCapturing) MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                        else MaterialTheme.colorScheme.primary,
                        CircleShape
                    )
                    .border(4.dp, MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f), CircleShape)
            ) {
                Icon(
                    Icons.Filled.CameraAlt, "Capture",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(36.dp)
                )
            }

            // Done button (appears after first capture)
            if (localCaptureCount > 0) {
                IconButton(
                    onClick = onDone,
                    modifier = Modifier
                        .size(48.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                ) {
                    Icon(Icons.Filled.Check, "Done", tint = MaterialTheme.colorScheme.onPrimary)
                }
            } else {
                Spacer(Modifier.size(48.dp))
            }
        }

        // Hint text
        if (localCaptureCount == 0) {
            Text(
                "Position receipt within the frame",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 140.dp)
            )
        } else {
            Text(
                "Tap capture for more pages, or tap ✓ when done",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                color = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 140.dp)
            )
        }
    }
}

/**
 * ML Kit barcode analysis on a camera frame.
 * Only reports URL-type barcodes (QR codes with links).
 */
@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
private fun processQrFrame(
    imageProxy: ImageProxy,
    barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    onUrlDetected: (String) -> Unit
) {
    val mediaImage = imageProxy.image
    if (mediaImage == null) {
        imageProxy.close()
        return
    }

    val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    barcodeScanner.process(inputImage)
        .addOnSuccessListener { barcodes ->
            for (barcode in barcodes) {
                when (barcode.valueType) {
                    Barcode.TYPE_URL -> {
                        barcode.url?.url?.let { onUrlDetected(it) }
                    }
                    Barcode.TYPE_TEXT -> {
                        val text = barcode.rawValue ?: ""
                        if (text.startsWith("http")) {
                            onUrlDetected(text)
                        }
                    }
                }
            }
        }
        .addOnCompleteListener {
            imageProxy.close()
        }
}

/**
 * Scan a captured image (byte array) for eTIMS/KRA QR codes.
 * Used after Document Scanner or Gallery capture to detect QR URLs
 * without needing real-time camera-frame scanning.
 */
private fun scanImageForQrCode(
    context: android.content.Context,
    imageBytes: ByteArray,
    onQrDetected: (String) -> Unit
) {
    try {
        val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size) ?: return
        val inputImage = InputImage.fromBitmap(bitmap, 0)
        val scanner = BarcodeScanning.getClient()

        scanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val url = when (barcode.valueType) {
                        Barcode.TYPE_URL -> barcode.url?.url
                        Barcode.TYPE_TEXT -> barcode.rawValue?.takeIf { it.startsWith("http") }
                        else -> null
                    }
                    if (url != null &&
                        (url.contains("etims", ignoreCase = true) ||
                         url.contains("kra.go.ke", ignoreCase = true) ||
                         url.contains("itax", ignoreCase = true))) {
                        onQrDetected(url)
                        return@addOnSuccessListener
                    }
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "QR scan on image failed: ${e.message}")
            }
    } catch (e: Exception) {
        Log.e(TAG, "Failed to decode image for QR scan: ${e.message}")
    }
}
