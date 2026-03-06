package com.mafutapass.app.ui.screens

import android.Manifest
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.android.gms.location.LocationServices
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.ReceiptUploadResponse
import com.mafutapass.app.receipt.ReceiptData
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.CurrencyFormatter
import com.mafutapass.app.util.correctExifOrientation
import com.mafutapass.app.util.rotateJpeg
import com.mafutapass.app.viewmodel.ExpenseEditState
import com.mafutapass.app.viewmodel.ScanReceiptViewModel
import com.mafutapass.app.viewmodel.ScanReceiptViewModel.ScanState
import java.io.File
import java.util.concurrent.Executors

private const val TAG = "AddReceiptScreen"

/**
 * AddReceiptScreen — receipt capture with on-device ML Kit processing.
 *
 * Flow: CameraX / Gallery → Review →
 *       On-device OCR (ML Kit Text Recognition v2, spatial analysis) →
 *       Show extracted data → Upload image to backend.
 *
 * Financial data is read entirely on-device — raw OCR text never leaves the phone.
 * Only user-confirmed structured fields (amount, merchant, date) are sent.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddReceiptScreen(
    onDone: (reportId: String?) -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    viewModel: ScanReceiptViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val selectedImages by viewModel.selectedImages.collectAsState()
    val uploadResults by viewModel.uploadResults.collectAsState()
    val currentUploadIndex by viewModel.currentUploadIndex.collectAsState()
    val workspaces by viewModel.workspaces.collectAsState()
    val selectedWorkspaceId by viewModel.selectedWorkspaceId.collectAsState()
    val ocrResults by viewModel.ocrResults.collectAsState()

    val editedDescription by viewModel.editedDescription.collectAsState()
    val editedAmount by viewModel.editedAmount.collectAsState()
    val editedCategory by viewModel.editedCategory.collectAsState()
    val editedReimbursable by viewModel.editedReimbursable.collectAsState()
    val expenseStates by viewModel.expenseStates.collectAsState()
    val currentExpenseIndex by viewModel.currentExpenseIndex.collectAsState()

    // Sub-screen overlays (workspace picker, image fullscreen, description editor)
    var showWorkspacePicker by remember { mutableStateOf(false) }
    var showImageFullscreenIdx by remember { mutableIntStateOf(-1) }
    var showDescriptionEditorIdx by remember { mutableIntStateOf(-1) }

    // ── Manual / Camera mode toggles ──────────────────────────────────
    var showCamera by remember { mutableStateOf(false) }
    var showManual by remember { mutableStateOf(false) }
    var hasCameraPermission by remember { mutableStateOf(false) }

    // Camera permission launcher — declared before galleryLauncher so the gallery callback
    // can reference it for the "cancel with no permission" edge case.
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (granted) showCamera = true
        else Toast.makeText(context, "Camera permission required", Toast.LENGTH_SHORT).show()
    }

    // Gallery picker
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        // Always clear camera mode now that we're back from the gallery activity.
        // (showCamera may have been left true to keep the navbar hidden while gallery was open.)
        showCamera = false
        val validUris = uris.filterNotNull().take(10)
        validUris.forEach { uri ->
            viewModel.addImageFromUri(uri)
            val imageIndex = viewModel.selectedImages.value.size - 1
            scanForQrCode(context, uri) { qrUrl ->
                viewModel.setImageQrUrl(imageIndex, qrUrl)
            }
        }
        if (validUris.isNotEmpty()) {
            // Skip ReviewImages — jump directly to on-device OCR
            viewModel.processOnDevice()
        } else if (uiState is ScanState.ChooseMethod) {
            // Gallery cancelled with nothing selected — re-open camera instead of exiting.
            // (onDone(null) would popBackStack all the way to Home, which is wrong here.)
            if (hasCameraPermission) showCamera = true
            else permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // Location (best-effort)
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        val granted = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            try {
                val fusedClient = LocationServices.getFusedLocationProviderClient(context)
                @Suppress("MissingPermission")
                fusedClient.lastLocation.addOnSuccessListener { loc ->
                    if (loc != null) viewModel.setLocation(loc.latitude, loc.longitude)
                }
            } catch (e: SecurityException) {
                Log.e(TAG, "Location error: ${e.message}")
            }
        }
    }

    LaunchedEffect(Unit) {
        locationPermissionLauncher.launch(
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        )
    }

    // Auto-open camera whenever the screen is in ChooseMethod and no overlay is visible.
    // Using uiState as the key ensures the camera re-opens after Retake (which resets
    // the ViewModel back to ChooseMethod while this composable is still live).
    LaunchedEffect(uiState) {
        if (uiState is ScanState.ChooseMethod && !showCamera && !showManual) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // ── Within-flow back navigation ───────────────────────────────────────
    // Intercept the Android system back button at every step of the scan workflow and walk
    // backward through it rather than popping the entire Create route. Captured images and all
    // ViewModel state are preserved as the user steps back through camera → confirm etc.
    val isAtScanRoot = uiState is ScanState.ChooseMethod &&
        !showCamera && !showManual &&
        !showWorkspacePicker && showImageFullscreenIdx < 0 && showDescriptionEditorIdx < 0
    BackHandler(enabled = !isAtScanRoot) {
        when {
            // Sub-overlays — close the top-most one first
            showWorkspacePicker           -> showWorkspacePicker = false
            showImageFullscreenIdx >= 0   -> showImageFullscreenIdx = -1
            showDescriptionEditorIdx >= 0 -> showDescriptionEditorIdx = -1
            showManual                    -> showManual = false
            // Camera is showing: back always exits the entire scan flow.
            // processOnDevice() is only called via the camera's own Done/✓ button — never on back.
            // This breaks the Confirm→Camera→Confirm loop that would otherwise occur.
            showCamera -> {
                showCamera = false
                // Reset ViewModel BEFORE calling onDone so uiState drops to ChooseMethod
                // in the same frame. Without this, the frame between showCamera=false and
                // popBackStack completing renders the filled-out confirm page as a flash.
                viewModel.reset()
                onDone(null)
            }
            // Confirm or Review screens: clear all captured state and re-open the camera
            // for a completely fresh scan. Without reset() here, the next capture appends
            // to the existing _selectedImages/_expenseStates list, causing duplicate receipts.
            // reset() sets uiState → ChooseMethod; the LaunchedEffect(uiState) camera guard
            // (!showCamera) stays false because showCamera=true is set in the same block,
            // so the permission launcher won't double-fire.
            uiState is ScanState.OcrResults || uiState is ScanState.ReviewImages -> {
                viewModel.reset()
                showCamera = true
            }
            else -> { /* ChooseMethod — isAtScanRoot guards this; should not occur */ }
        }
    }

    // Full-screen workspace picker overlay
    if (showWorkspacePicker) {
        WorkspacePickerView(
            workspaces = workspaces,
            selectedId = selectedWorkspaceId,
            onSelect = { id -> viewModel.setWorkspaceId(id); showWorkspacePicker = false },
            onBack = { showWorkspacePicker = false }
        )
        return
    }

    // Full-screen image viewer
    if (showImageFullscreenIdx >= 0) {
        val imgBytes = expenseStates.getOrNull(showImageFullscreenIdx)?.imageBytes
        if (imgBytes != null) {
            ReceiptFullscreenView(
                imageBytes = imgBytes,
                onBack = { showImageFullscreenIdx = -1 },
                onRotate = {
                    viewModel.rotateImage(showImageFullscreenIdx)
                },
                onReplaceFromCamera = {
                    showImageFullscreenIdx = -1
                    showCamera = true
                },
                onReplaceFromGallery = {
                    showImageFullscreenIdx = -1
                    galleryLauncher.launch("image/*")
                }
            )
            return
        } else {
            showImageFullscreenIdx = -1
        }
    }

    // Full-screen description editor
    if (showDescriptionEditorIdx >= 0) {
        val currentState = expenseStates.getOrNull(showDescriptionEditorIdx)
        DescriptionEditorView(
            current = currentState?.description ?: "",
            onSave = { desc ->
                viewModel.updateExpenseField(showDescriptionEditorIdx) { it.copy(description = desc) }
                showDescriptionEditorIdx = -1
            },
            onBack = { showDescriptionEditorIdx = -1 }
        )
        return
    }

    // Full-screen manual entry
    if (showManual && uiState is ScanState.ChooseMethod) {
        ManualEntrySection(
            onClose = { showManual = false },
            onSwitchToScan = { showManual = false; permissionLauncher.launch(Manifest.permission.CAMERA) },
            onNext = { amount ->
                viewModel.beginManualFlow(amount)
                showManual = false
            }
        )
        return
    }

    // Full-screen camera
    if (showCamera && hasCameraPermission) {
        ReceiptCamera(
            onImageCaptured = { bytes ->
                viewModel.addImageBytes(bytes)
                val imageIndex = viewModel.selectedImages.value.size - 1
                scanBytesForQrCode(context, bytes) { qrUrl ->
                    viewModel.setImageQrUrl(imageIndex, qrUrl)
                }
            },
            captureCount = selectedImages.size,
            onDone = {
                showCamera = false
                // Use .value directly — Compose state delegate may be stale in a callback.
                if (viewModel.selectedImages.value.isNotEmpty()) {
                    viewModel.processOnDevice()
                } else {
                    // No images captured — navigate back instead of showing a blank screen.
                    onDone(null)
                }
            },
            onSwitchToManual = { showCamera = false; showManual = true },
            // Do NOT set showCamera=false here — keep it true so the navbar stays hidden
            // while the gallery activity is open. showCamera is cleared in the galleryLauncher callback.
            onOpenGallery = { galleryLauncher.launch("image/*") }
        )
        return
    }

    // Full-screen confirm details (OcrResults) — early-return to avoid double TopAppBar.
    // OCR fills in description/amount in the background; the confirm page is shown immediately.
    if (uiState is ScanState.OcrResults) {
        if (expenseStates.isNotEmpty()) {
            ConfirmDetailsSection(
                expenseStates = expenseStates,
                currentIndex = currentExpenseIndex,
                workspaces = workspaces,
                selectedWorkspaceId = selectedWorkspaceId,
                onNavigateIndex = { viewModel.setCurrentExpenseIndex(it) },
                onUpdateExpense = { idx, update -> viewModel.updateExpenseField(idx, update) },
                onRemoveExpense = { viewModel.removeExpenseAtIndex(it) },
                onShowWorkspacePicker = { showWorkspacePicker = true },
                onShowImageFullscreen = { idx -> showImageFullscreenIdx = idx },
                onShowDescriptionEditor = { idx -> showDescriptionEditorIdx = idx },
                // Press "Create expense": create scanning placeholders immediately and
                // navigate to Reports. OCR + upload runs in BackgroundScanService (app-scoped
                // coroutine — survives this ViewModel being cleared on navigation).
                onConfirmUpload = { viewModel.submitAndScanInBackground(onNavigateToReports) },
                onRetake = { viewModel.reset() }
            )
        }
        return
    }

    // Uploading + Results states are never reached: submitAndScanInBackground()
    // navigates immediately and hands off to BackgroundScanService before any upload runs.

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
            is ScanState.Processing   -> "Reading Receipt..."
            is ScanState.OcrResults   -> "Extracted Data"
            is ScanState.Uploading    -> "Saving"
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
            // ChooseMethod: camera/gallery auto-launched; show only a dark blank placeholder
            // so no old picker UI ever shows as a background behind the camera or gallery overlay.
            is ScanState.ChooseMethod -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(AppTheme.colors.backgroundGradient)
            )
            is ScanState.ReviewImages -> ReviewImagesSection(
                images = selectedImages,
                workspaces = workspaces,
                selectedWorkspaceId = selectedWorkspaceId,
                onWorkspaceSelected = { viewModel.setWorkspaceId(it) },
                onRemoveImage = { viewModel.removeImage(it) },
                onAddMore = { galleryLauncher.launch("image/*") },
                onTakeAnother = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                onProcess = { viewModel.processOnDevice() }
            )
            is ScanState.Processing -> ProcessingSection(
                currentIndex = currentUploadIndex,
                totalCount = selectedImages.size
            )
            // OcrResults is handled as a full-screen early-return above; this branch is unreachable.
            is ScanState.OcrResults -> Unit
            is ScanState.Uploading -> UploadingSection(
                currentIndex = currentUploadIndex,
                totalCount = selectedImages.size
            )
            is ScanState.Results -> ResultsSection(
                state = state,
                results = uploadResults,
                onViewReport = { onDone(null) },
                onScanAnother = { viewModel.reset() }
            )
        }
    }
}

// ── Choose Method ────────────────────────────────────────────────────────────

@Composable
private fun ChooseMethodSection(
    onScanReceipt: () -> Unit,
    onChooseFromGallery: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Filled.Receipt, null, Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary)
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
            "Receipt text is read on-device — your data stays private",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(32.dp))

        Button(
            onClick = onScanReceipt,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Filled.CameraAlt, null, Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Text("Scan Receipt", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Auto-detects receipt edges and straightens",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(16.dp))

        OutlinedButton(
            onClick = onChooseFromGallery,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.outline)
        ) {
            Icon(Icons.Filled.Image, null, Modifier.size(22.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(12.dp))
            Text("Choose from Gallery", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ── Review Images ────────────────────────────────────────────────────────────

@Composable
private fun ReviewImagesSection(
    images: List<ByteArray>,
    workspaces: List<com.mafutapass.app.data.Workspace>,
    selectedWorkspaceId: String,
    onWorkspaceSelected: (String) -> Unit,
    onRemoveImage: (Int) -> Unit,
    onAddMore: () -> Unit,
    onTakeAnother: () -> Unit,
    onProcess: () -> Unit
) {
    var workspaceMenuExpanded by remember { mutableStateOf(false) }
    val selectedWorkspace = workspaces.firstOrNull { it.id == selectedWorkspaceId }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            "${images.size} page${if (images.size > 1) "s" else ""} captured",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            "Review images, then process on-device",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(16.dp))

        // Workspace picker
        if (workspaces.isNotEmpty()) {
            Text("Workspace", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 4.dp))
            Box {
                OutlinedButton(
                    onClick = { workspaceMenuExpanded = true },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Filled.Business, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(selectedWorkspace?.name ?: "Select workspace", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                    Icon(Icons.Filled.KeyboardArrowDown, null, Modifier.size(18.dp))
                }
                DropdownMenu(expanded = workspaceMenuExpanded, onDismissRequest = { workspaceMenuExpanded = false }) {
                    workspaces.forEach { ws ->
                        DropdownMenuItem(
                            text = { Text(ws.name) },
                            leadingIcon = { if (ws.isActive) Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp)) },
                            onClick = { onWorkspaceSelected(ws.id); workspaceMenuExpanded = false }
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
        }

        Spacer(Modifier.height(4.dp))

        // Image strip
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.weight(1f)) {
            itemsIndexed(images) { index, imageBytes ->
                val bitmap = remember(imageBytes) { BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size) }
                Box(modifier = Modifier.width(240.dp)) {
                    if (bitmap != null) {
                        Image(bitmap.asImageBitmap(), "Page ${index + 1}", contentScale = ContentScale.Fit, modifier = Modifier.fillMaxHeight().clip(RoundedCornerShape(16.dp)))
                    }
                    IconButton(
                        onClick = { onRemoveImage(index) },
                        modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(32.dp).background(MaterialTheme.colorScheme.error, CircleShape)
                    ) { Icon(Icons.Filled.Close, "Remove", tint = MaterialTheme.colorScheme.onError, modifier = Modifier.size(18.dp)) }
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primary, modifier = Modifier.align(Alignment.TopStart).padding(8.dp).size(28.dp)) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("${index + 1}", color = MaterialTheme.colorScheme.onPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold) }
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onTakeAnother, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Filled.DocumentScanner, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp))
                Text("Scan More", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            }
            OutlinedButton(onClick = onAddMore, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Filled.Image, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp))
                Text("Gallery", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            }
        }
        Spacer(Modifier.height(12.dp))

        Button(
            onClick = onProcess,
            enabled = images.isNotEmpty(),
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Filled.DocumentScanner, null, Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Text("Read Receipt${if (images.size > 1) "s" else ""}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Processed on-device with ML Kit — data stays private",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

// ── Processing (On-Device OCR) ───────────────────────────────────────────────

@Composable
private fun ProcessingSection(currentIndex: Int, totalCount: Int) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator(Modifier.size(64.dp), color = MaterialTheme.colorScheme.primary, strokeWidth = 5.dp)
        Spacer(Modifier.height(24.dp))
        Text("Reading receipt on-device...", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(8.dp))
        Text("Page ${currentIndex + 1} of $totalCount", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(4.dp))
        Text("Using ML Kit Text Recognition", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(24.dp))
        LinearProgressIndicator(
            progress = { if (totalCount > 0) (currentIndex + 1).toFloat() / totalCount else 0f },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            color = MaterialTheme.colorScheme.primary
        )
        Spacer(Modifier.height(16.dp))
        Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)) {
            Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Security, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Data stays on your device", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
            }
        }
    }
}

// ── Confirm Details ───────────────────────────────────────────────────────────

private val CATEGORIES = listOf(
    "Automatic", "Fuel", "Food", "Transport", "Accommodation", "Office Supplies",
    "Communication", "Maintenance", "Shopping", "Entertainment",
    "Utilities", "Health", "Groceries", "Other"
)

/** New Expensify-style confirm screen: per-expense pagination, dark bg, workspace picker, image tap. */
@Composable
private fun ConfirmDetailsSection(
    expenseStates: List<com.mafutapass.app.viewmodel.ExpenseEditState>,
    currentIndex: Int,
    workspaces: List<com.mafutapass.app.data.Workspace>,
    selectedWorkspaceId: String,
    onNavigateIndex: (Int) -> Unit,
    onUpdateExpense: (Int, (com.mafutapass.app.viewmodel.ExpenseEditState) -> com.mafutapass.app.viewmodel.ExpenseEditState) -> Unit,
    onRemoveExpense: (Int) -> Unit,
    onShowWorkspacePicker: () -> Unit,
    onShowImageFullscreen: (Int) -> Unit,
    onShowDescriptionEditor: (Int) -> Unit,
    onConfirmUpload: () -> Unit,
    onRetake: () -> Unit
) {
    val state = expenseStates.getOrNull(currentIndex) ?: return
    val total = expenseStates.size
    val selectedWorkspace = workspaces.firstOrNull { it.id == selectedWorkspaceId }
    val bitmap = remember(state.imageBytes) {
        state.imageBytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
    }
    var showCategoryDropdown by remember { mutableStateOf(false) }
    var showAmountEditor by remember { mutableStateOf(false) }

    if (showAmountEditor) {
        AmountEditorView(
            current = state.amount,
            currency = state.currency,
            onSave = { amt ->
                onUpdateExpense(currentIndex) { it.copy(amount = amt) }
                showAmountEditor = false
            },
            onBack = { showAmountEditor = false }
        )
        return
    }

    val dividerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.10f)
    val rowPadding = 18.dp

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Top bar ────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(start = 4.dp, end = 12.dp, top = 4.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onRetake) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack, "Back",
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
                Spacer(Modifier.width(4.dp))
                Text(
                    if (total > 1) "Confirm details  ${currentIndex + 1} of $total" else "Confirm details",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f)
                )
                // Chevrons for multi-receipt
                if (total > 1) {
                    IconButton(
                        onClick = { if (currentIndex > 0) onNavigateIndex(currentIndex - 1) },
                        enabled = currentIndex > 0
                    ) {
                        Icon(
                            Icons.Filled.ChevronLeft, "Previous",
                            tint = if (currentIndex > 0) MaterialTheme.colorScheme.onSurface
                                   else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.25f),
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    IconButton(
                        onClick = { if (currentIndex < total - 1) onNavigateIndex(currentIndex + 1) },
                        enabled = currentIndex < total - 1
                    ) {
                        Icon(
                            Icons.Filled.ChevronRight, "Next",
                            tint = if (currentIndex < total - 1) MaterialTheme.colorScheme.onSurface
                                   else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.25f),
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }

            // ── Scrollable body ────────────────────────────────────────
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
            ) {
                Spacer(Modifier.height(8.dp))

                // "Workspace" label
                Text(
                    "Workspace",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                // Workspace row — tappable, chevron on right
                Surface(
                    onClick = onShowWorkspacePicker,
                    color = Color.Transparent,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Avatar circle
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                            modifier = Modifier.size(48.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                val avatarVal = selectedWorkspace?.avatar
                                if (!avatarVal.isNullOrBlank() && avatarVal.startsWith("http")) {
                                    AsyncImage(
                                        model = ImageRequest.Builder(LocalContext.current)
                                            .data(avatarVal).crossfade(true).build(),
                                        contentDescription = selectedWorkspace?.name,
                                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize().clip(CircleShape)
                                    )
                                } else {
                                    Text(
                                        text = avatarVal
                                            ?: selectedWorkspace?.initials
                                            ?: selectedWorkspace?.name?.take(1)?.uppercase()
                                            ?: "P",
                                        fontSize = 22.sp
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                selectedWorkspace?.name ?: "Personal",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                selectedWorkspace?.description?.takeIf { it.isNotBlank() } ?: "Your space",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Icon(
                            Icons.Filled.ChevronRight, null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Spacer(Modifier.height(14.dp))

                // Receipt image — full width, black rounded box, tap to fullscreen
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 180.dp, max = 320.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Black)
                        .clickable { onShowImageFullscreen(currentIndex) }
                ) {
                    if (bitmap != null) {
                        Image(
                            bitmap.asImageBitmap(),
                            contentDescription = "Receipt",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Box(
                            modifier = Modifier.fillMaxSize().padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Filled.Receipt, null,
                                    tint = Color.White.copy(alpha = 0.3f),
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "Manual entry",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.White.copy(alpha = 0.4f)
                                )
                            }
                        }
                    }
                    // KRA badge — only on images where eTIMS QR was actually detected
                    if (state.qrUrl != null) {
                        Surface(
                            shape = RoundedCornerShape(5.dp),
                            color = Blue50,
                            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)
                        ) {
                            Row(
                                Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Icon(Icons.Filled.CheckCircle, null, tint = Blue500, modifier = Modifier.size(10.dp))
                                Text("KRA", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Blue500, fontSize = 10.sp)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // ── Field rows ─────────────────────────────────────────
                HorizontalDivider(color = dividerColor)

                // Description row
                Surface(
                    onClick = { onShowDescriptionEditor(currentIndex) },
                    color = Color.Transparent,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(vertical = rowPadding),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Description",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f)
                        )
                        if (state.description.isNotBlank()) {
                            Text(
                                state.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                modifier = Modifier.widthIn(max = 160.dp)
                            )
                            Spacer(Modifier.width(4.dp))
                        }
                        Icon(
                            Icons.Filled.ChevronRight, null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                HorizontalDivider(color = dividerColor)

                // Category row
                Box {
                    Surface(
                        onClick = { showCategoryDropdown = true },
                        color = Color.Transparent,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = rowPadding),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Category",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                state.category,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.width(4.dp))
                            Icon(
                                Icons.Filled.ChevronRight, null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    DropdownMenu(
                        expanded = showCategoryDropdown,
                        onDismissRequest = { showCategoryDropdown = false }
                    ) {
                        CATEGORIES.forEach { cat ->
                            DropdownMenuItem(
                                text = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(cat, color = if (cat == state.category) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                                    }
                                },
                                leadingIcon = {
                                    if (cat == state.category)
                                        Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                },
                                onClick = {
                                    onUpdateExpense(currentIndex) { it.copy(category = cat) }
                                    showCategoryDropdown = false
                                }
                            )
                        }
                    }
                }

                HorizontalDivider(color = dividerColor)

                // Reimbursable toggle row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Reimbursable",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    Switch(
                        checked = state.reimbursable,
                        onCheckedChange = { v -> onUpdateExpense(currentIndex) { s -> s.copy(reimbursable = v) } },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }

                HorizontalDivider(color = dividerColor)
                Spacer(Modifier.height(16.dp))
            }

            // ── Fixed bottom area ──────────────────────────────────────
            Column(
                modifier = Modifier
                    .padding(horizontal = 20.dp)
                    .navigationBarsPadding()
                    .padding(bottom = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Remove this expense — only shown when there are multiple
                if (total > 1) {
                    Surface(
                        onClick = { onRemoveExpense(currentIndex) },
                        shape = RoundedCornerShape(50),
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.15f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)),
                        modifier = Modifier.fillMaxWidth().height(50.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text(
                                "Remove this expense",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                            )
                        }
                    }
                }

                // Primary action — Create expense(s)
                Button(
                    onClick = onConfirmUpload,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text(
                        if (total > 1) "Create $total expenses" else "Create expense",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Offline warning
                val context2 = androidx.compose.ui.platform.LocalContext.current
                val isOffline = remember {
                    val cm = context2.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
                    cm.activeNetwork == null || cm.getNetworkCapabilities(cm.activeNetwork) == null
                }
                if (isOffline) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Filled.WifiOff, null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "You appear to be offline.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
    }
}

// ── Workspace Picker View ─────────────────────────────────────────────────────

@Composable
private fun WorkspacePickerView(
    workspaces: List<com.mafutapass.app.data.Workspace>,
    selectedId: String,
    onSelect: (String) -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onSurface)
            }
            Text(
                "Choose recipient",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))

        // Personal workspace first
        val personalWs = workspaces.filter { it.planType == null || it.planType == "personal" || it.name.contains("personal", ignoreCase = true) }
        val otherWs = workspaces.filter { it !in personalWs }

        LazyColumn(
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            if (personalWs.isNotEmpty()) {
                item {
                    Text(
                        "Personal",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    )
                }
                items(personalWs) { ws ->
                    WorkspacePickerRow(ws, ws.id == selectedId, onSelect)
                }
            }
            if (otherWs.isNotEmpty()) {
                item {
                    Text(
                        "Workspaces",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    )
                }
                items(otherWs) { ws ->
                    WorkspacePickerRow(ws, ws.id == selectedId, onSelect)
                }
            }
            if (workspaces.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("No workspaces found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun WorkspacePickerRow(
    ws: com.mafutapass.app.data.Workspace,
    selected: Boolean,
    onSelect: (String) -> Unit
) {
    Surface(
        onClick = { onSelect(ws.id) },
        color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.08f) else Color.Transparent,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.size(44.dp)
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    val avatarVal = ws.avatar
                    if (!avatarVal.isNullOrBlank() && avatarVal.startsWith("http")) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(avatarVal).crossfade(true).build(),
                            contentDescription = ws.name,
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp))
                        )
                    } else {
                        Text(
                            text = avatarVal?.takeIf { it.isNotBlank() } ?: ws.initials,
                            fontSize = 20.sp
                        )
                    }
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(ws.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                Text(ws.description ?: ws.currencySymbol, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (selected) {
                Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            }
        }
    }
}

// ── Receipt Full-Screen Viewer ────────────────────────────────────────────────

@Composable
private fun ReceiptFullscreenView(
    imageBytes: ByteArray,
    onBack: () -> Unit,
    onRotate: () -> Unit,
    onReplaceFromCamera: () -> Unit,
    onReplaceFromGallery: () -> Unit
) {
    val bitmap = remember(imageBytes) { BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size) }
    var showMenu by remember { mutableStateOf(false) }
    var showReplaceChooser by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0C1F14)) // deep dark green
    ) {
        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopStart)
                .statusBarsPadding()
                .padding(horizontal = 4.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
            }
            Text(
                "Receipt",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.weight(1f)
            )
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Filled.MoreVert, "More", tint = Color.White)
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Replace image") },
                        leadingIcon = { Icon(Icons.Filled.CameraAlt, null) },
                        onClick = { showMenu = false; showReplaceChooser = true }
                    )
                }
            }
        }

        // Full image
        if (bitmap != null) {
            Image(
                bitmap.asImageBitmap(),
                contentDescription = "Receipt full view",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 72.dp, bottom = 96.dp)
            )
        }

        // Bottom action bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Rotate
            Surface(
                onClick = onRotate,
                shape = RoundedCornerShape(50),
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.2f),
                modifier = Modifier.weight(1f).height(48.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.RotateRight, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Rotate", style = MaterialTheme.typography.bodyMedium, color = Color.White, fontWeight = FontWeight.Medium)
                }
            }
            // Replace
            Surface(
                onClick = { showReplaceChooser = true },
                shape = RoundedCornerShape(50),
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.2f),
                modifier = Modifier.weight(1f).height(48.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.CameraAlt, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Replace", style = MaterialTheme.typography.bodyMedium, color = Color.White, fontWeight = FontWeight.Medium)
                }
            }
        }

        // Replace image chooser dialog
        if (showReplaceChooser) {
            AlertDialog(
                onDismissRequest = { showReplaceChooser = false },
                title = { Text("Replace image") },
                text = { Text("Choose a new image source") },
                confirmButton = {
                    TextButton(onClick = { showReplaceChooser = false; onReplaceFromCamera() }) {
                        Icon(Icons.Filled.CameraAlt, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Camera")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showReplaceChooser = false; onReplaceFromGallery() }) {
                        Icon(Icons.Filled.Photo, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Gallery")
                    }
                }
            )
        }
    }
}

// ── Description Editor View ───────────────────────────────────────────────────

@Composable
private fun DescriptionEditorView(
    current: String,
    onSave: (String) -> Unit,
    onBack: () -> Unit
) {
    var text by remember(current) { mutableStateOf(current) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onSurface)
            }
            Text(
                "Description",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = { onSave(text) }) {
                Text("Save", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            placeholder = { Text("Add a description or merchant name") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .heightIn(min = 120.dp),
            shape = RoundedCornerShape(12.dp),
            maxLines = 8,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f),
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
            )
        )
    }
}

// ── Amount Editor View ────────────────────────────────────────────────────────

@Composable
private fun AmountEditorView(
    current: String,
    currency: String,
    onSave: (String) -> Unit,
    onBack: () -> Unit
) {
    var text by remember(current) { mutableStateOf(current) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onSurface)
            }
            Text(
                "Amount",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = { onSave(text) }) {
                Text("Save", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
        OutlinedTextField(
            value = text,
            onValueChange = { input -> text = input.filter { it.isDigit() || it == '.' || it == ',' } },
            placeholder = { Text("0.00") },
            prefix = { Text("$currency ", style = MaterialTheme.typography.bodyLarge) },
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            shape = RoundedCornerShape(12.dp),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f),
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
            )
        )
    }
}

// ── Uploading ────────────────────────────────────────────────────────────────

@Composable
private fun UploadingSection(currentIndex: Int, totalCount: Int) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator(Modifier.size(64.dp), color = MaterialTheme.colorScheme.primary, strokeWidth = 5.dp)
        Spacer(Modifier.height(24.dp))
        Text("Saving to your account...", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(8.dp))
        Text("Image ${currentIndex + 1} of $totalCount", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(4.dp))
        Text("Uploading image for storage only", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(24.dp))
        LinearProgressIndicator(
            progress = { if (totalCount > 0) (currentIndex + 1).toFloat() / totalCount else 0f },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            color = MaterialTheme.colorScheme.primary
        )
    }
}

// ── Results ──────────────────────────────────────────────────────────────────

@Composable
private fun ResultsSection(
    state: ScanState.Results,
    results: List<ReceiptUploadResponse>,
    onViewReport: (String) -> Unit,
    onScanAnother: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(32.dp))
        val allSuccess = state.successCount == state.totalCount
        Icon(
            if (allSuccess) Icons.Filled.CheckCircle else Icons.Filled.Warning, null,
            Modifier.size(72.dp),
            tint = if (allSuccess) MaterialTheme.colorScheme.primary else AppTheme.colors.statusPending
        )
        Spacer(Modifier.height(16.dp))
        Text(
            if (allSuccess) "All receipts saved!" else "${state.successCount}/${state.totalCount} saved",
            style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(Modifier.height(24.dp))

        Column(modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            results.forEachIndexed { index, result -> ReceiptResultCard(index, result) }
        }
        Spacer(Modifier.height(16.dp))

        if (state.reportId != null) {
            Button(
                onClick = { onViewReport(state.reportId) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Icon(Icons.Filled.Description, null, Modifier.size(22.dp)); Spacer(Modifier.width(12.dp))
                Text("View Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
        }
        OutlinedButton(onClick = onScanAnother, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp)) {
            Icon(Icons.Filled.AddAPhoto, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp))
            Text("Scan Another", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun ReceiptResultCard(index: Int, result: ReceiptUploadResponse) {
    Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (result.success) Icons.Filled.CheckCircle else Icons.Filled.Error, null,
                tint = if (result.success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                modifier = Modifier.size(24.dp)
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(result.cleanMerchant(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                if (result.success && result.amount > 0) {
                    Text(CurrencyFormatter.formatSimple(result.amount), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
                }
                if (!result.success) {
                    Text(result.error ?: "Failed", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
            }
            if (result.kraVerified) {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)) {
                    Text("KRA ✓", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
            }
        }
    }
}

// ── Scan Mode Types ──────────────────────────────────────────────────────────

private enum class ScanMode { SINGLE, BATCH, STITCH }

/** One entry in the bottom-left filmstrip. In STITCH mode [frameCount] grows without adding entries. */
private class FilmstripEntry(val thumbnailBytes: ByteArray, val frameCount: Int = 1)

// ── Swipeable Mode Selector ───────────────────────────────────────────────────

@Composable
private fun SwipeableModeSelector(
    selectedMode: ScanMode,
    onModeSelected: (ScanMode) -> Unit
) {
    // STITCH is hidden until the stitch-and-merge pipeline is built.
    val modes = ScanMode.entries.filter { it != ScanMode.STITCH }
    var dragAccumulator by remember { mutableFloatStateOf(0f) }

    Row(
        modifier = Modifier
            .pointerInput(selectedMode) {
                detectHorizontalDragGestures(
                    onDragEnd = { dragAccumulator = 0f },
                    onHorizontalDrag = { _, delta ->
                        dragAccumulator += delta
                        val threshold = 60f
                        if (dragAccumulator > threshold) {
                            val idx = modes.indexOf(selectedMode)
                            if (idx > 0) onModeSelected(modes[idx - 1])
                            dragAccumulator = 0f
                        } else if (dragAccumulator < -threshold) {
                            val idx = modes.indexOf(selectedMode)
                            if (idx < modes.lastIndex) onModeSelected(modes[idx + 1])
                            dragAccumulator = 0f
                        }
                    }
                )
            },
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        modes.forEach { mode ->
            val isSelected = mode == selectedMode
            Text(
                text = mode.name,
                modifier = Modifier
                    .padding(horizontal = 14.dp, vertical = 6.dp)
                    .clickable { onModeSelected(mode) },
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) Color.White else Color.White.copy(alpha = 0.45f),
                fontSize = if (isSelected) 14.sp else 12.sp
            )
        }
    }
    // Selected-mode underline dot
    Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
        modes.forEach { mode ->
            Box(
                modifier = Modifier
                    .padding(horizontal = 14.dp)
                    .size(if (mode == selectedMode) 5.dp else 3.dp)
                    .background(
                        if (mode == selectedMode) Color.White else Color.Transparent,
                        CircleShape
                    )
            )
        }
    }
}

// ── Filmstrip Thumbnail ───────────────────────────────────────────────────────

@Composable
private fun FilmstripThumbnail(filmstrip: List<FilmstripEntry>, mode: ScanMode) {
    Box(modifier = Modifier.size(56.dp)) {
        filmstrip.take(3).forEachIndexed { i, entry ->
            val bitmap = remember(entry.thumbnailBytes) {
                BitmapFactory.decodeByteArray(entry.thumbnailBytes, 0, entry.thumbnailBytes.size)
            }
            if (bitmap != null) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .offset(x = (i * 4).dp, y = (i * 4).dp)
                        .clip(RoundedCornerShape(6.dp))
                        .border(1.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(6.dp))
                ) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
        // In STITCH mode show frame-count badge on the single entry
        if (mode == ScanMode.STITCH && filmstrip.isNotEmpty() && filmstrip[0].frameCount > 1) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.align(Alignment.BottomEnd).size(20.dp)
            ) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "${filmstrip[0].frameCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
        // In BATCH mode show total count badge
        if (mode == ScanMode.BATCH && filmstrip.size > 1) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.align(Alignment.BottomEnd).size(20.dp)
            ) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "${filmstrip.size}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

// ── Camera ───────────────────────────────────────────────────────────────────

@Composable
private fun ReceiptCamera(
    onImageCaptured: (ByteArray) -> Unit,
    captureCount: Int,
    onDone: () -> Unit,
    onSwitchToManual: () -> Unit,
    onOpenGallery: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val imageCapture = remember { ImageCapture.Builder().build() }

    var scanMode by remember { mutableStateOf(ScanMode.SINGLE) }
    var flashEnabled by remember { mutableStateOf(false) }
    var isCapturing by remember { mutableStateOf(false) }
    var detectedQr by remember { mutableStateOf<String?>(null) }
    var filmstrip by remember { mutableStateOf<List<FilmstripEntry>>(emptyList()) }
    var localCaptureCount by remember { mutableIntStateOf(captureCount) }

    LaunchedEffect(detectedQr) {
        if (detectedQr != null) { kotlinx.coroutines.delay(3000); detectedQr = null }
    }

    fun capturePhoto() {
        if (isCapturing) return
        isCapturing = true
        imageCapture.flashMode = if (flashEnabled) ImageCapture.FLASH_MODE_ON else ImageCapture.FLASH_MODE_OFF
        val outputFile = File(context.cacheDir, "receipt_${System.currentTimeMillis()}.jpg")
        imageCapture.takePicture(
            ImageCapture.OutputFileOptions.Builder(outputFile).build(),
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val rawBytes = outputFile.readBytes()
                    outputFile.delete()
                    // CameraX saves JPEG with EXIF rotation tags but does NOT
                    // physically rotate pixels. Correct here so OCR and display
                    // see the image the way the user held the phone.
                    val bytes = correctExifOrientation(rawBytes)
                    onImageCaptured(bytes)
                    localCaptureCount++
                    when (scanMode) {
                        ScanMode.SINGLE -> { /* auto-advance via onDone below */ }
                        ScanMode.BATCH  -> { filmstrip = filmstrip + FilmstripEntry(bytes) }
                        ScanMode.STITCH -> {
                            filmstrip = if (filmstrip.isEmpty()) {
                                listOf(FilmstripEntry(bytes, 1))
                            } else {
                                val head = filmstrip[0]
                                listOf(FilmstripEntry(head.thumbnailBytes, head.frameCount + 1)) + filmstrip.drop(1)
                            }
                        }
                    }
                    isCapturing = false
                    if (scanMode == ScanMode.SINGLE) onDone()
                }
                override fun onError(e: ImageCaptureException) {
                    Log.e(TAG, "Capture failed: ${e.message}")
                    isCapturing = false
                }
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {

        // ── Full-screen camera viewfinder ──────────────────────────────
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).also { previewView ->
                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener({
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build()
                            .also { it.setSurfaceProvider(previewView.surfaceProvider) }
                        val qrOptions = BarcodeScannerOptions.Builder()
                            .setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
                        val barcodeScanner = BarcodeScanning.getClient(qrOptions)
                        val imageAnalysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build().also { analysis ->
                                analysis.setAnalyzer(Executors.newSingleThreadExecutor()) { imageProxy ->
                                    processQrFrame(imageProxy, barcodeScanner) { qrUrl ->
                                        val isEtims = qrUrl.contains("etims", ignoreCase = true) ||
                                            qrUrl.contains("kra.go.ke", ignoreCase = true) ||
                                            qrUrl.contains("itax", ignoreCase = true)
                                        if (isEtims && detectedQr == null) detectedQr = qrUrl
                                    }
                                }
                            }
                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA,
                                preview, imageCapture, imageAnalysis
                            )
                        } catch (e: Exception) { Log.e(TAG, "Camera bind failed", e) }
                    }, ContextCompat.getMainExecutor(ctx))
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // X close button (top-left)
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .statusBarsPadding()
                .padding(start = 16.dp, top = 8.dp)
                .size(40.dp)
                .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                .clickable { onDone() },
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Close, "Close", tint = Color.White, modifier = Modifier.size(20.dp))
        }

        // Manual | Scan toggle (top-center)
        Surface(
            shape = RoundedCornerShape(50),
            color = Color.Black.copy(alpha = 0.5f),
            modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 8.dp)
        ) {
            Row(Modifier.padding(4.dp)) {
                Surface(shape = RoundedCornerShape(50), color = Color.Transparent, onClick = onSwitchToManual) {
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Edit, null, tint = Color.White.copy(alpha = 0.65f), modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Manual", color = Color.White.copy(alpha = 0.65f), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    }
                }
                Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.primary, onClick = {}) {
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Receipt, null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Scan", color = Color.White, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        // Flash toggle — fires only at moment of capture, not persistent torch
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .statusBarsPadding()
                .padding(start = 16.dp, top = 56.dp)
                .size(42.dp)
                .background(
                    if (flashEnabled) MaterialTheme.colorScheme.primary
                    else Color.Black.copy(alpha = 0.5f),
                    CircleShape
                )
                .clickable { flashEnabled = !flashEnabled },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (flashEnabled) Icons.Filled.FlashOn else Icons.Filled.FlashOff,
                contentDescription = "Flash",
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }

        // ── eTIMS QR detection banner ─────────────────────────────────
        AnimatedVisibility(
            visible = detectedQr != null,
            enter = slideInVertically { -it } + fadeIn(),
            exit = slideOutVertically { -it } + fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 180.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 4.dp,
                modifier = Modifier.padding(horizontal = 24.dp)
            ) {
                Row(
                    Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.QrCodeScanner, null, tint = Color.White, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("eTIMS QR Detected!", style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold, color = Color.White)
                        Text("KRA link captured", style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.8f))
                    }
                }
            }
        }

        // Bottom: mode selector + shutter row + horizontal filmstrip
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SwipeableModeSelector(
                selectedMode = scanMode,
                onModeSelected = { mode ->
                    scanMode = mode
                    filmstrip = emptyList()
                    localCaptureCount = 0
                }
            )
            Spacer(Modifier.height(16.dp))

            // Shutter row
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 40.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: gallery icon (SINGLE only)
                Box(modifier = Modifier.size(56.dp), contentAlignment = Alignment.Center) {
                    if (scanMode == ScanMode.SINGLE) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                                .clickable { onOpenGallery() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Image, "Gallery", tint = Color.White, modifier = Modifier.size(26.dp))
                        }
                    }
                }

                // Center: shutter
                Box(
                    modifier = Modifier
                        .size(82.dp)
                        .background(Color.Transparent, CircleShape)
                        .border(3.5.dp, Color.White, CircleShape)
                        .clickable(enabled = !isCapturing) { capturePhoto() },
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .background(
                                if (isCapturing) Color.White.copy(alpha = 0.5f) else Color.White,
                                CircleShape
                            )
                    )
                }

                // Right: blue > arrow (BATCH/STITCH once ≥1 capture)
                Box(modifier = Modifier.size(56.dp), contentAlignment = Alignment.Center) {
                    if (scanMode != ScanMode.SINGLE && localCaptureCount > 0) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .background(MaterialTheme.colorScheme.primary, CircleShape)
                                .clickable { onDone() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.ChevronRight, "Done", tint = Color.White, modifier = Modifier.size(30.dp))
                        }
                    }
                }
            }

            // Horizontal filmstrip — BATCH/STITCH only, below shutter row
            if (scanMode != ScanMode.SINGLE && filmstrip.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                LazyRow(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    itemsIndexed(filmstrip) { _, entry ->
                        val bmp = BitmapFactory.decodeByteArray(entry.thumbnailBytes, 0, entry.thumbnailBytes.size)
                        Box(modifier = Modifier.size(52.dp)) {
                            if (bmp != null) {
                                Image(
                                    bitmap = bmp.asImageBitmap(),
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .clip(RoundedCornerShape(6.dp))
                                        .border(1.5.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                                )
                            }
                            if (scanMode == ScanMode.STITCH && entry.frameCount > 1) {
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd).padding(2.dp)
                                        .size(18.dp)
                                        .background(MaterialTheme.colorScheme.primary, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("${entry.frameCount}", style = MaterialTheme.typography.labelSmall,
                                        color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── QR Scanning ──────────────────────────────────────────────────────────────

// ── Manual Entry ─────────────────────────────────────────────────────────────

@Composable
private fun ManualEntrySection(
    onClose: () -> Unit,
    onSwitchToScan: () -> Unit,
    onNext: (String) -> Unit
) {
    var amount by remember { mutableStateOf("") }
    val currencies = listOf("KES", "USD", "EUR", "GBP")
    var currencyIdx by remember { mutableIntStateOf(0) }
    val currency = currencies[currencyIdx]

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        // X close button (top-left)
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .statusBarsPadding()
                .padding(start = 16.dp, top = 8.dp)
                .size(40.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f), CircleShape)
                .clickable { onClose() },
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Close, "Close", tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(20.dp))
        }

        // Manual | Scan toggle (top-center) — Manual is active
        Surface(
            shape = RoundedCornerShape(50),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
            modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 8.dp)
        ) {
            Row(Modifier.padding(4.dp)) {
                Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.primary, onClick = {}) {
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Edit, null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Manual", color = Color.White, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    }
                }
                Surface(shape = RoundedCornerShape(50), color = Color.Transparent, onClick = onSwitchToScan) {
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Receipt, null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Scan", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }

        // Amount display (vertically centered, offset slightly above true center)
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .offset(y = (-100).dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "$currency ${if (amount.isEmpty()) "0" else amount}",
                style = MaterialTheme.typography.displayLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 52.sp
            )
            Spacer(Modifier.height(24.dp))
            // Currency picker + Flip +/- pills
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    onClick = { currencyIdx = (currencyIdx + 1) % currencies.size }
                ) {
                    Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(currency, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Filled.KeyboardArrowDown, null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(16.dp))
                    }
                }
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    onClick = {
                        amount = if (amount.startsWith("-")) amount.removePrefix("-")
                                 else if (amount.isNotEmpty()) "-$amount" else amount
                    }
                ) {
                    Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Flip", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.width(3.dp))
                        Text("+/-", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // Numpad + Next button (bottom)
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp)
                .navigationBarsPadding()
                .padding(bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val rows = listOf(listOf("1","2","3"), listOf("4","5","6"), listOf("7","8","9"), listOf(".","0","←"))
            rows.forEach { row ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { key ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.25f),
                            modifier = Modifier.weight(1f).height(64.dp),
                            onClick = {
                                when (key) {
                                    "←" -> if (amount.isNotEmpty()) amount = amount.dropLast(1)
                                    "." -> if (!amount.contains(".")) amount += "."
                                    else -> if (amount.length < 12) {
                                        amount = if (amount == "0") key else amount + key
                                    }
                                }
                            }
                        ) {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                if (key == "←") {
                                    Icon(Icons.Filled.Backspace, null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(22.dp))
                                } else {
                                    Text(key, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
            Button(
                onClick = { if (amount.isNotEmpty() && amount != "0") onNext(amount) },
                enabled = amount.isNotEmpty() && amount != "0" && amount != "-",
                modifier = Modifier.fillMaxWidth().height(58.dp),
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    disabledContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)
                )
            ) {
                Text("Next", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Color.White, letterSpacing = 0.5.sp)
            }
        }
    }
}

private fun scanForQrCode(context: android.content.Context, uri: Uri, onQrDetected: (String) -> Unit) {
    try {
        val inputImage = InputImage.fromFilePath(context, uri)
        val scanner = BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build())
        scanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val url = barcode.url?.url ?: barcode.rawValue?.takeIf { it.startsWith("http") }
                    if (url != null && (url.contains("etims", true) || url.contains("kra.go.ke", true) || url.contains("itax", true))) {
                        onQrDetected(url); return@addOnSuccessListener
                    }
                }
            }
            .addOnFailureListener { e -> Log.e(TAG, "scanForQrCode: ${e.message}") }
    } catch (e: Exception) { Log.e(TAG, "scanForQrCode error: ${e.message}") }
}

private fun scanBytesForQrCode(context: android.content.Context, imageBytes: ByteArray, onQrDetected: (String) -> Unit) {
    try {
        val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size) ?: return
        val inputImage = InputImage.fromBitmap(bitmap, 0)
        val scanner = BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build())
        scanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val url = barcode.url?.url ?: barcode.rawValue?.takeIf { it.startsWith("http") }
                    if (url != null && (url.contains("etims", true) || url.contains("kra.go.ke", true) || url.contains("itax", true))) {
                        onQrDetected(url); return@addOnSuccessListener
                    }
                }
            }
            .addOnFailureListener { e -> Log.e(TAG, "scanBytesForQrCode: ${e.message}") }
    } catch (e: Exception) { Log.e(TAG, "scanBytesForQrCode error: ${e.message}") }
}

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
private fun processQrFrame(imageProxy: ImageProxy, barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner, onUrlDetected: (String) -> Unit) {
    val mediaImage = imageProxy.image
    if (mediaImage == null) { imageProxy.close(); return }
    val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    barcodeScanner.process(inputImage)
        .addOnSuccessListener { barcodes ->
            for (barcode in barcodes) {
                val url = barcode.url?.url ?: barcode.rawValue?.takeIf { it.startsWith("http") }
                if (url != null) { onUrlDetected(url); return@addOnSuccessListener }
            }
        }
        .addOnFailureListener { /* silent */ }
        .addOnCompleteListener { imageProxy.close() }
}