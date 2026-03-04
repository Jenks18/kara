package com.mafutapass.app.ui.screens

import android.Manifest
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import android.widget.Toast
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
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.mafutapass.app.data.ReceiptUploadResponse
import com.mafutapass.app.receipt.ReceiptData
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.CurrencyFormatter
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
    onNavigateToReport: (String) -> Unit = {},
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
    val editedCategory by viewModel.editedCategory.collectAsState()
    val editedReimbursable by viewModel.editedReimbursable.collectAsState()
    val detectedQrUrl by viewModel.detectedQrUrl.collectAsState()

    // Gallery picker
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        uris.take(10).forEach { uri ->
            viewModel.addImageFromUri(uri)
            scanForQrCode(context, uri) { qrUrl ->
                viewModel.setDetectedQrUrl(qrUrl)
            }
        }
    }

    // ── CameraX capture ────────────────────────────────────────────────
    var showCamera by remember { mutableStateOf(false) }
    var hasCameraPermission by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (granted) showCamera = true
        else Toast.makeText(context, "Camera permission required", Toast.LENGTH_SHORT).show()
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

    // Full-screen camera
    if (showCamera && hasCameraPermission) {
        ReceiptCamera(
            onImageCaptured = { bytes ->
                viewModel.addImageBytes(bytes)
                scanBytesForQrCode(context, bytes) { qrUrl ->
                    viewModel.setDetectedQrUrl(qrUrl)
                }
            },
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
            is ScanState.ChooseMethod -> ChooseMethodSection(
                onScanReceipt = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                onChooseFromGallery = { galleryLauncher.launch("image/*") }
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
            is ScanState.OcrResults -> ConfirmDetailsSection(
                ocrResults = ocrResults,
                images = selectedImages,
                workspaces = workspaces,
                selectedWorkspaceId = selectedWorkspaceId,
                description = editedDescription,
                category = editedCategory,
                reimbursable = editedReimbursable,
                hasQrCode = detectedQrUrl != null,
                onWorkspaceSelected = { viewModel.setWorkspaceId(it) },
                onDescriptionChanged = { viewModel.setDescription(it) },
                onCategoryChanged = { viewModel.setCategory(it) },
                onReimbursableChanged = { viewModel.setReimbursable(it) },
                onConfirmUpload = { viewModel.uploadAll() },
                onRetake = { viewModel.reset() }
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

// ── Confirm Details (Expensify-style) ────────────────────────────────────────

private val CATEGORIES = listOf(
    "Fuel", "Food", "Transport", "Accommodation", "Office Supplies",
    "Communication", "Maintenance", "Shopping", "Entertainment",
    "Utilities", "Health", "Groceries", "Other"
)

@Composable
private fun ConfirmDetailsSection(
    ocrResults: List<ReceiptData>,
    images: List<ByteArray>,
    workspaces: List<com.mafutapass.app.data.Workspace>,
    selectedWorkspaceId: String,
    description: String,
    category: String,
    reimbursable: Boolean,
    hasQrCode: Boolean,
    onWorkspaceSelected: (String) -> Unit,
    onDescriptionChanged: (String) -> Unit,
    onCategoryChanged: (String) -> Unit,
    onReimbursableChanged: (Boolean) -> Unit,
    onConfirmUpload: () -> Unit,
    onRetake: () -> Unit
) {
    val totalAmount = ocrResults.mapNotNull { it.totalAmount }.sum()
    val merchant = ocrResults.firstOrNull()?.merchantName ?: "Unknown Merchant"
    val date = ocrResults.firstOrNull()?.date
    val currency = ocrResults.firstOrNull()?.currency ?: "KES"
    val hasEtims = ocrResults.any { it.hasEtimsMarkers }
    val selectedWorkspace = workspaces.firstOrNull { it.id == selectedWorkspaceId }

    var showCategoryDropdown by remember { mutableStateOf(false) }
    var showWorkspaceDropdown by remember { mutableStateOf(false) }
    var showMore by remember { mutableStateOf(false) }
    var currentImageIndex by remember { mutableIntStateOf(0) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Scrollable content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
        ) {
            Spacer(Modifier.height(8.dp))

            // "To" workspace selector
            Text("To", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(4.dp))
            Surface(
                onClick = { showWorkspaceDropdown = true },
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Workspace avatar
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.size(40.dp)
                    ) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                selectedWorkspace?.avatar ?: "💼",
                                fontSize = 20.sp
                            )
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            selectedWorkspace?.name ?: "Personal",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Icon(
                        Icons.Filled.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            // Workspace dropdown
            DropdownMenu(
                expanded = showWorkspaceDropdown,
                onDismissRequest = { showWorkspaceDropdown = false }
            ) {
                workspaces.forEach { ws ->
                    DropdownMenuItem(
                        text = { Text(ws.name) },
                        leadingIcon = {
                            if (ws.id == selectedWorkspaceId)
                                Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                        },
                        onClick = {
                            onWorkspaceSelected(ws.id)
                            showWorkspaceDropdown = false
                        }
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Receipt image preview
            if (images.isNotEmpty()) {
                val imageBytes = images[currentImageIndex]
                val bitmap = remember(imageBytes) {
                    BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(3f / 4f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    if (bitmap != null) {
                        Image(
                            bitmap.asImageBitmap(),
                            contentDescription = "Receipt page ${currentImageIndex + 1}",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    // Page indicator for multi-page
                    if (images.size > 1) {
                        Row(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(8.dp)
                                .background(
                                    MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                                    RoundedCornerShape(16.dp)
                                )
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (currentImageIndex > 0) {
                                IconButton(
                                    onClick = { currentImageIndex-- },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Filled.ChevronLeft, "Previous", Modifier.size(18.dp))
                                }
                            }
                            Text(
                                "${currentImageIndex + 1} / ${images.size}",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Medium
                            )
                            if (currentImageIndex < images.size - 1) {
                                IconButton(
                                    onClick = { currentImageIndex++ },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Filled.ChevronRight, "Next", Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                    // KRA badge overlay — colored if QR code detected, grayed if only text markers
                    if (hasQrCode || hasEtims) {
                        val badgeBg = if (hasQrCode) Blue50 else MaterialTheme.colorScheme.surfaceVariant
                        val badgeColor = if (hasQrCode) Blue500 else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        Surface(
                            shape = RoundedCornerShape(5.dp),
                            color = badgeBg,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(8.dp)
                        ) {
                            Row(
                                Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Icon(Icons.Filled.CheckCircle, null, tint = badgeColor, modifier = Modifier.size(10.dp))
                                Text("KRA", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = badgeColor, fontSize = 10.sp)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Amount + merchant summary
            if (totalAmount > 0) {
                Text(
                    "$currency ${String.format("%,.2f", totalAmount)}",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(Modifier.height(2.dp))
            }
            Text(
                merchant,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (date != null) {
                Text(
                    date,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(20.dp))

            // Description field
            Text("Description", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 4.dp))
            OutlinedTextField(
                value = description,
                onValueChange = onDescriptionChanged,
                placeholder = { Text("Add a description or notes") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = false,
                maxLines = 3,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                )
            )

            Spacer(Modifier.height(12.dp))

            // Category selector
            Text("Category", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 4.dp))
            Box {
                Surface(
                    onClick = { showCategoryDropdown = true },
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Category",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            category,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Filled.KeyboardArrowDown, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                DropdownMenu(
                    expanded = showCategoryDropdown,
                    onDismissRequest = { showCategoryDropdown = false }
                ) {
                    CATEGORIES.forEach { cat ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    cat,
                                    fontWeight = if (cat == category) FontWeight.Bold else FontWeight.Normal,
                                    color = if (cat == category) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                )
                            },
                            leadingIcon = {
                                if (cat == category)
                                    Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                            },
                            onClick = {
                                onCategoryChanged(cat)
                                showCategoryDropdown = false
                            }
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Reimbursable toggle
            Surface(
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Reimbursable",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    Switch(
                        checked = reimbursable,
                        onCheckedChange = onReimbursableChanged,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            }

            // Show more expandable
            Spacer(Modifier.height(8.dp))
            Surface(
                onClick = { showMore = !showMore },
                shape = RoundedCornerShape(12.dp),
                color = Color.Transparent,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(Modifier.weight(1f))
                    Text(
                        if (showMore) "Show less" else "Show more",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Icon(
                        if (showMore) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                        null,
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.weight(1f))
                }
            }

            // Expanded details
            AnimatedVisibility(visible = showMore) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Spacer(Modifier.height(4.dp))
                    // OCR extracted text preview
                    ocrResults.forEachIndexed { index, ocr ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "Page ${index + 1}",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Spacer(Modifier.weight(1f))
                                    Text(
                                        "${ocr.processingTimeMs}ms",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (ocr.items.isNotEmpty()) {
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        "${ocr.items.size} line item${if (ocr.items.size > 1) "s" else ""} detected",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (ocr.rawText.isNotBlank()) {
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        ocr.rawText.take(300) + if (ocr.rawText.length > 300) "..." else "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }
                    }

                    // Privacy badge
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.Security, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "Receipt read on-device — data stays private",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }

            Spacer(Modifier.height(16.dp))
        }

        // Fixed bottom button
        Surface(
            shadowElevation = 8.dp,
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(Modifier.padding(16.dp)) {
                Button(
                    onClick = onConfirmUpload,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text(
                        "Create expense",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Spacer(Modifier.height(8.dp))
                TextButton(
                    onClick = onRetake,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.Refresh, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Start Over", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                }
            }
        }
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

// ── Camera ───────────────────────────────────────────────────────────────────

@Composable
private fun ReceiptCamera(
    onImageCaptured: (ByteArray) -> Unit,
    captureCount: Int,
    onDone: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val imageCapture = remember { ImageCapture.Builder().build() }
    var localCaptureCount by remember { mutableIntStateOf(captureCount) }
    var isCapturing by remember { mutableStateOf(false) }
    var detectedQr by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(detectedQr) {
        if (detectedQr != null) { kotlinx.coroutines.delay(3000); detectedQr = null }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).also { previewView ->
                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener({
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }

                        val qrOptions = BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
                        val barcodeScanner = BarcodeScanning.getClient(qrOptions)
                        val analysisExecutor = Executors.newSingleThreadExecutor()
                        val imageAnalysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                            .also { analysis ->
                                analysis.setAnalyzer(analysisExecutor) { imageProxy ->
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
                            cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageCapture, imageAnalysis)
                        } catch (e: Exception) { Log.e(TAG, "Camera bind failed", e) }
                    }, ContextCompat.getMainExecutor(ctx))
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Receipt guide
        Box(Modifier.fillMaxSize().padding(32.dp)) {
            Box(Modifier.fillMaxWidth().fillMaxHeight(0.75f).align(Alignment.Center).border(2.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(12.dp)))
        }

        // QR banner
        AnimatedVisibility(detectedQr != null, enter = slideInVertically { -it } + fadeIn(), exit = slideOutVertically { -it } + fadeOut(), modifier = Modifier.align(Alignment.TopCenter).padding(top = 80.dp)) {
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primary, shadowElevation = 4.dp, modifier = Modifier.padding(horizontal = 24.dp)) {
                Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.QrCodeScanner, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("eTIMS QR Detected!", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                        Text("KRA link captured", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f))
                    }
                }
            }
        }

        // Close
        IconButton(onClick = onDone, modifier = Modifier.align(Alignment.TopStart).padding(16.dp).size(48.dp).background(MaterialTheme.colorScheme.surface.copy(alpha = 0.8f), CircleShape)) {
            Icon(Icons.Filled.Close, "Close", tint = MaterialTheme.colorScheme.onSurface)
        }

        // Page count
        if (localCaptureCount > 0) {
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primary, modifier = Modifier.align(Alignment.TopEnd).padding(16.dp)) {
                Text("$localCaptureCount page${if (localCaptureCount > 1) "s" else ""}", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
            }
        }

        // Bottom controls
        Column(Modifier.align(Alignment.BottomCenter).padding(bottom = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                if (localCaptureCount == 0) "Position receipt within the frame" else "Tap capture for more pages, or Done",
                style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, color = Color.White, modifier = Modifier.padding(bottom = 16.dp)
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                Spacer(Modifier.size(48.dp))
                // Capture
                IconButton(
                    onClick = {
                        if (isCapturing) return@IconButton
                        isCapturing = true
                        val outputFile = File(context.cacheDir, "receipt_${System.currentTimeMillis()}.jpg")
                        val outputOptions = ImageCapture.OutputFileOptions.Builder(outputFile).build()
                        imageCapture.takePicture(outputOptions, ContextCompat.getMainExecutor(context), object : ImageCapture.OnImageSavedCallback {
                            override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                val bytes = outputFile.readBytes(); outputFile.delete()
                                onImageCaptured(bytes); localCaptureCount++; isCapturing = false
                            }
                            override fun onError(e: ImageCaptureException) {
                                Log.e(TAG, "Capture failed: ${e.message}")
                                Toast.makeText(context, "Capture failed", Toast.LENGTH_SHORT).show(); isCapturing = false
                            }
                        })
                    },
                    modifier = Modifier.size(80.dp).background(if (isCapturing) MaterialTheme.colorScheme.primary.copy(alpha = 0.5f) else MaterialTheme.colorScheme.primary, CircleShape).border(4.dp, MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f), CircleShape)
                ) { Icon(Icons.Filled.CameraAlt, "Capture", tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(36.dp)) }
                // Done
                if (localCaptureCount > 0) {
                    IconButton(onClick = onDone, modifier = Modifier.size(48.dp).background(MaterialTheme.colorScheme.primary, CircleShape)) {
                        Icon(Icons.Filled.Check, "Done", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                } else Spacer(Modifier.size(48.dp))
            }
        }
    }
}

// ── QR Scanning ──────────────────────────────────────────────────────────────

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