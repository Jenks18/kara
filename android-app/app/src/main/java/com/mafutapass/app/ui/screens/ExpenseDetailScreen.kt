package com.mafutapass.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import com.mafutapass.app.util.CurrencyFormatter
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardBackspace
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.PendingExpensesRepository
import com.mafutapass.app.data.UpdateReceiptRequest
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.DateUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.hilt.navigation.compose.hiltViewModel
import android.util.Log
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "ExpenseDetailVM"

@HiltViewModel
class ExpenseDetailViewModel @Inject constructor(
    private val apiService: ApiService,
    private val pendingExpensesRepository: PendingExpensesRepository
) : ViewModel() {
    private val _expense = MutableStateFlow<ExpenseItem?>(null)
    val expense: StateFlow<ExpenseItem?> = _expense.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _saveSuccess = MutableStateFlow(false)
    val saveSuccess: StateFlow<Boolean> = _saveSuccess.asStateFlow()

    /** The ID the screen was opened with (may be a temp pending ID). */
    private var requestedId: String = ""

    /** The resolved server ID once scanning finishes (used for API calls). */
    private val _resolvedId = MutableStateFlow<String?>(null)
    val resolvedId: StateFlow<String?> = _resolvedId.asStateFlow()

    /** Job for the pending-item observation coroutine — cancelled when item completes. */
    private var pendingObservationJob: Job? = null

    /** Local camera image bytes for the current pending item (if any). */
    fun getLocalImageBytes(id: String): ByteArray? = pendingExpensesRepository.getImageBytes(id)

    fun loadExpense(id: String) {
        requestedId = id
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            Log.d(TAG, "loadExpense($id)")

            // 1. Check pending repo first — avoids a wasted API call for scanning items
            val pending = pendingExpensesRepository.items.value
                .firstOrNull { it.id == id }
            if (pending != null) {
                Log.d(TAG, "Found pending item: status=${pending.processingStatus}")
                _expense.value = pending
                _isLoading.value = false
                if (pending.processingStatus == "scanning") {
                    observePendingUpdates(id)
                }
                return@launch
            }

            // 2. Check if this was a temp ID that already completed
            val completedItem = pendingExpensesRepository.getCompletedItem(id)
            if (completedItem != null) {
                Log.d(TAG, "Found completed item for tempId=$id → realId=${completedItem.id}")
                _expense.value = completedItem
                _resolvedId.value = completedItem.id
                _isLoading.value = false
                // Try to get fresh data from API
                try {
                    _expense.value = apiService.getReceipt(completedItem.id)
                } catch (e: Exception) {
                    Log.w(TAG, "API refresh after completed-item hit failed: ${e.message}")
                }
                return@launch
            }

            // 3. Check the completedIdMap (has the real ID but not the full item)
            val completedId = pendingExpensesRepository.getCompletedId(id)
            if (completedId != null) {
                Log.d(TAG, "Found completedId map: tempId=$id → realId=$completedId")
                _resolvedId.value = completedId
                try {
                    _expense.value = apiService.getReceipt(completedId)
                } catch (e: Exception) {
                    _error.value = e.message ?: "Failed to load receipt"
                } finally {
                    _isLoading.value = false
                }
                return@launch
            }

            // 4. Not a pending item — fetch from server
            Log.d(TAG, "Not pending — fetching from API: $id")
            try {
                _expense.value = apiService.getReceipt(id)
                _resolvedId.value = id
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load receipt"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Observe [PendingExpensesRepository] for live updates to the scanning item.
     * When it transitions to "processed" the temp ID is replaced with the real
     * server ID — at that point we fetch fresh data from the API.
     */
    private fun observePendingUpdates(tempId: String) {
        pendingObservationJob?.cancel()
        pendingObservationJob = viewModelScope.launch {
            Log.d(TAG, "observePendingUpdates($tempId) — collector started")
            pendingExpensesRepository.items.collect { items ->
                val current = items.firstOrNull { it.id == tempId }
                if (current != null) {
                    // Item still in list with same tempId — update UI
                    Log.d(TAG, "Observer: tempId=$tempId status=${current.processingStatus}")
                    _expense.value = current
                    // If status changed from scanning (e.g. error), stop observing
                    if (current.processingStatus != "scanning") {
                        Log.d(TAG, "Observer: status no longer scanning — stopping")
                        pendingObservationJob?.cancel()
                    }
                } else {
                    // Temp ID gone — item was replaced with real server ID.
                    Log.d(TAG, "Observer: tempId=$tempId gone from items list")

                    // 1. Immediately show cached completed item (has all fields)
                    val completedItem = pendingExpensesRepository.getCompletedItem(tempId)
                    if (completedItem != null) {
                        Log.d(TAG, "Observer: using completedItem realId=${completedItem.id}")
                        _expense.value = completedItem
                        _resolvedId.value = completedItem.id
                    }

                    // 2. Try to refresh from API for canonical data
                    val realId = _resolvedId.value
                        ?: pendingExpensesRepository.getCompletedId(tempId)
                        ?: pendingExpensesRepository.newlyCompletedId.value
                    if (realId != null) {
                        _resolvedId.value = realId
                        try {
                            val fresh = apiService.getReceipt(realId)
                            Log.d(TAG, "Observer: API refresh OK for $realId")
                            _expense.value = fresh
                        } catch (e: Exception) {
                            Log.w(TAG, "Observer: API refresh failed for $realId: ${e.message}")
                            // Keep the completedItem data — UI is already updated
                        }
                    } else {
                        Log.w(TAG, "Observer: no realId found for tempId=$tempId")
                    }
                    pendingObservationJob?.cancel()
                }
            }
        }
    }

    fun updateExpense(
        id: String,
        merchantName: String?,
        amount: Double?,
        category: String?,
        transactionDate: String?,
        description: String?
    ) {
        // Use resolved server ID if available, otherwise the requested ID
        val actualId = _resolvedId.value ?: id
        viewModelScope.launch {
            _isSaving.value = true
            _error.value = null
            _saveSuccess.value = false
            try {
                val request = UpdateReceiptRequest(
                    merchantName = merchantName,
                    amount = amount,
                    category = category,
                    transactionDate = transactionDate,
                    description = description
                )
                val response = apiService.updateReceipt(actualId, request)
                if (response.success) {
                    _saveSuccess.value = true
                    _expense.value = apiService.getReceipt(actualId)
                } else {
                    _error.value = response.error ?: "Failed to save"
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to save receipt"
            } finally {
                _isSaving.value = false
            }
        }
    }

    fun clearSaveSuccess() {
        _saveSuccess.value = false
    }
}

/* =================================================================
 * Editing field identifiers
 * ================================================================= */
private const val FIELD_AMOUNT = "amount"
private const val FIELD_DESCRIPTION = "description"
private const val FIELD_MERCHANT = "merchant"
private const val FIELD_DATE = "date"
private const val FIELD_CATEGORY = "category"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseDetailScreen(
    expenseId: String,
    onBack: () -> Unit,
    viewModel: ExpenseDetailViewModel = hiltViewModel()
) {
    val expense by viewModel.expense.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState()
    val saveSuccess by viewModel.saveSuccess.collectAsState()

    // null = detail view, field constant = per-field edit sub-screen
    var editingField by remember { mutableStateOf<String?>(null) }

    // Intercept system back button when editing a field — return to detail, not main screen
    BackHandler(enabled = editingField != null) {
        editingField = null
    }

    LaunchedEffect(expenseId) {
        viewModel.loadExpense(expenseId)
    }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(saveSuccess) {
        if (saveSuccess) {
            editingField = null
            snackbarHostState.showSnackbar("Receipt updated")
            viewModel.clearSaveSuccess()
        }
    }

    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    val titleText = when (editingField) {
        FIELD_AMOUNT -> "Amount"
        FIELD_DESCRIPTION -> "Description"
        FIELD_MERCHANT -> "Merchant"
        FIELD_DATE -> "Date"
        FIELD_CATEGORY -> "Category"
        else -> expense?.let { exp ->
            if (exp.processingStatus == "scanning") "Receipt scanning..."
            else {
                val amt = CurrencyFormatter.formatSimple(exp.amount)
                val merchant = exp.cleanMerchantName()
                if (merchant != null) "$amt for $merchant" else amt
            }
        } ?: "Receipt Detail"
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        titleText,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        style = MaterialTheme.typography.titleMedium
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (editingField != null) editingField = null else onBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    scrolledContainerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                ),
                scrollBehavior = scrollBehavior
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(AppTheme.colors.backgroundGradient)
        ) {
            when {
                isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                error != null && expense == null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(error ?: "Unknown error", color = MaterialTheme.colorScheme.error)
                    }
                }
                expense != null -> {
                    val exp = expense!!
                    when (editingField) {
                        FIELD_AMOUNT -> AmountEditContent(
                            expense = exp, isSaving = isSaving,
                            onSave = { amt -> viewModel.updateExpense(expenseId, null, amt, null, null, null) }
                        )
                        FIELD_DESCRIPTION -> DescriptionEditContent(
                            expense = exp, isSaving = isSaving,
                            onSave = { desc -> viewModel.updateExpense(expenseId, null, null, null, null, desc) }
                        )
                        FIELD_MERCHANT -> MerchantEditContent(
                            expense = exp, isSaving = isSaving,
                            onSave = { m -> viewModel.updateExpense(expenseId, m, null, null, null, null) }
                        )
                        FIELD_DATE -> DateEditContent(
                            expense = exp, isSaving = isSaving,
                            onSave = { d -> viewModel.updateExpense(expenseId, null, null, null, d, null) }
                        )
                        FIELD_CATEGORY -> CategoryEditContent(
                            expense = exp, isSaving = isSaving,
                            onSelect = { c -> viewModel.updateExpense(expenseId, null, null, c, null, null) }
                        )
                        else -> ExpenseDetailContent(
                            expense = exp,
                            localImageBytes = viewModel.getLocalImageBytes(expenseId),
                            onEditField = { field -> editingField = field }
                        )
                    }
                }
            }
        }
    }
}

/* =================================================================
 * DETAIL VIEW -- read-only with tappable rows
 * ================================================================= */
@Composable
private fun ExpenseDetailContent(expense: ExpenseItem, localImageBytes: ByteArray? = null, onEditField: (String) -> Unit) {
    val context = LocalContext.current
    val displayDate = DateUtils.formatMedium(expense.transactionDate ?: expense.createdAt)
    var showFullImage by remember { mutableStateOf(false) }
    var reimbursable by remember { mutableStateOf(true) }

    val isScanning = expense.processingStatus == "scanning"
    val needsReview = expense.processingStatus == "error" || expense.processingStatus == "needs_review"
    val merchantMissing = expense.cleanMerchantName() == null
    val categoryMissing = expense.category.isBlank() || expense.category == "Uncategorized"

    // Determine which image data source to use: server URL or local camera bytes
    val hasRemoteImage = expense.imageUrl.isNotBlank() && expense.imageUrl.startsWith("http")
    val hasLocalImage = localImageBytes != null
    val hasAnyImage = hasRemoteImage || hasLocalImage
    val imageModel = when {
        hasRemoteImage -> ImageRequest.Builder(context).data(expense.imageUrl).crossfade(true).build()
        hasLocalImage  -> ImageRequest.Builder(context).data(localImageBytes).crossfade(true).build()
        else -> null
    }

    if (showFullImage && hasAnyImage) {
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { showFullImage = false },
            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
                    .clickable { showFullImage = false }
            ) {
                AsyncImage(
                    model = imageModel,
                    contentDescription = "Receipt full image",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxSize()
                )
                IconButton(
                    onClick = { showFullImage = false },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .statusBarsPadding()
                ) {
                    Icon(Icons.Filled.Close, "Close", tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            "Receipt",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp)
        )

        if (imageModel != null) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth().clickable { showFullImage = true }
            ) {
                AsyncImage(
                    model = imageModel,
                    contentDescription = "Receipt image",
                    contentScale = ContentScale.FillWidth,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 350.dp).clip(RoundedCornerShape(12.dp))
                )
            }
        }

        if (isScanning) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        "Receipt scan in progress. Check back later or enter the details now.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        if (needsReview) {
            Row(
                modifier = Modifier.padding(top = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(Icons.Filled.ErrorOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                Text("Receipt scanning failed. Enter details manually.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
        }

        if (expense.kraVerified == true) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = if (expense.etimsQrUrl != null) {
                    Modifier.clickable {
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(expense.etimsQrUrl))
                        context.startActivity(intent)
                    }
                } else Modifier
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Filled.VerifiedUser, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                    Text("KRA Verified", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                }
            }
        } else if (!isScanning && expense.processingStatus == "processed") {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                    Text("Verified", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                TappableDetailRow(
                    label = "Amount",
                    value = if (isScanning && expense.amount <= 0.0) "Scanning..." else CurrencyFormatter.formatSimple(expense.amount),
                    onClick = { onEditField(FIELD_AMOUNT) },
                    showRedDot = needsReview,
                    isPlaceholder = isScanning && expense.amount <= 0.0
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                val descriptionDisplay = expense.description?.let {
                    if (it.startsWith("AI confidence") ||
                        it.contains("could not be verified") ||
                        it.contains("please review and update")) null else it
                }
                TappableDetailRow(
                    label = "Description",
                    value = descriptionDisplay ?: "Add description",
                    onClick = { onEditField(FIELD_DESCRIPTION) },
                    showRedDot = false,
                    isPlaceholder = descriptionDisplay == null
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                TappableDetailRow(
                    label = "Merchant",
                    value = expense.cleanMerchantName() ?: if (isScanning) "Scanning..." else "Add merchant",
                    onClick = { onEditField(FIELD_MERCHANT) },
                    showRedDot = needsReview,
                    isPlaceholder = merchantMissing
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                TappableDetailRow(
                    label = "Date",
                    value = displayDate.ifEmpty { if (isScanning) "Scanning..." else "Add date" },
                    onClick = { onEditField(FIELD_DATE) },
                    showRedDot = false,
                    isPlaceholder = displayDate.isEmpty()
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                TappableDetailRow(
                    label = "Category",
                    value = if (categoryMissing) { if (isScanning) "Scanning..." else "Add category" } else expense.category,
                    onClick = { onEditField(FIELD_CATEGORY) },
                    showRedDot = needsReview,
                    isPlaceholder = categoryMissing
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Reimbursable", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(if (reimbursable) "Yes" else "No", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
                    }
                    Switch(
                        checked = reimbursable,
                        onCheckedChange = { reimbursable = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.primary,
                            checkedTrackColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun TappableDetailRow(
    label: String,
    value: String,
    onClick: () -> Unit,
    showRedDot: Boolean = false,
    isPlaceholder: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                value,
                style = MaterialTheme.typography.bodyLarge,
                color = if (isPlaceholder) MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    else MaterialTheme.colorScheme.onSurface,
                maxLines = 1
            )
        }
        if (showRedDot) {
            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.error))
            Spacer(modifier = Modifier.width(8.dp))
        }
        Icon(Icons.Filled.ChevronRight, contentDescription = "Edit $label", tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(20.dp))
    }
}

/* =================================================================
 * AMOUNT EDIT -- custom number pad
 * ================================================================= */
@Composable
private fun AmountEditContent(expense: ExpenseItem, isSaving: Boolean, onSave: (Double) -> Unit) {
    val currencyCode = CurrencyFormatter.defaultCurrencyCode
    val currencySymbol = when (currencyCode) {
        "KES" -> "KSh"
        "USD" -> "$"
        "EUR" -> "\u20AC"
        "GBP" -> "\u00A3"
        else -> currencyCode
    }

    var rawInput by remember {
        val initial = if (expense.amount > 0) {
            val s = expense.amount.toString()
            if (s.endsWith(".0")) s.dropLast(2) else s
        } else ""
        mutableStateOf(initial)
    }
    var isNegative by remember { mutableStateOf(expense.amount < 0) }
    val displayAmount = if (rawInput.isEmpty()) "0" else rawInput

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // KRA verified warning
        if (expense.kraVerified == true) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFFF3CD),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Filled.VerifiedUser, null, tint = Color(0xFF856404), modifier = Modifier.size(18.dp))
                    Column {
                        Text("KRA Verified Amount", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = Color(0xFF856404))
                        Text(
                            "This amount was verified via eTIMS QR code. Editing it may cause a mismatch with the KRA record.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF856404).copy(alpha = 0.85f)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(0.3f))

        Text(
            text = "${if (isNegative) "-" else ""}$currencySymbol$displayAmount",
            style = MaterialTheme.typography.displayMedium,
            fontWeight = FontWeight.Light,
            color = if (rawInput.isEmpty()) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                else MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.weight(0.3f))

        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant, onClick = {}) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(currencyCode, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Medium)
                    Icon(Icons.Filled.ArrowDropDown, null, modifier = Modifier.size(18.dp))
                }
            }
            Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant, onClick = { isNegative = !isNegative }) {
                Text("Flip +/-", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
            }
        }

        val keys = listOf(listOf("1","2","3"), listOf("4","5","6"), listOf("7","8","9"), listOf(".","0","back"))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            for (row in keys) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (key in row) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.weight(1f).height(56.dp),
                            onClick = {
                                when (key) {
                                    "back" -> { if (rawInput.isNotEmpty()) rawInput = rawInput.dropLast(1) }
                                    "." -> { if (!rawInput.contains(".")) rawInput = if (rawInput.isEmpty()) "0." else "$rawInput." }
                                    else -> {
                                        val dotIdx = rawInput.indexOf(".")
                                        if (dotIdx < 0 || rawInput.length - dotIdx <= 2) rawInput += key
                                    }
                                }
                            }
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                if (key == "back") {
                                    Icon(Icons.AutoMirrored.Filled.KeyboardBackspace, "Delete", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(24.dp))
                                } else {
                                    Text(key, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = { val parsed = rawInput.toDoubleOrNull() ?: 0.0; onSave(if (isNegative) -parsed else parsed) },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(28.dp),
            enabled = !isSaving && rawInput.isNotEmpty(),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            if (isSaving) { CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)) }
            Text("Save", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
    }
}

/* =================================================================
 * DESCRIPTION EDIT -- text field + save
 * ================================================================= */
@Composable
private fun DescriptionEditContent(expense: ExpenseItem, isSaving: Boolean, onSave: (String) -> Unit) {
    val raw = expense.description ?: ""
    var text by remember {
        val cleaned = when {
            raw.startsWith("AI confidence") -> ""
            raw.contains("could not be verified") -> ""
            raw.contains("please review and update") -> ""
            else -> raw
        }
        mutableStateOf(cleaned)
    }
    val focusRequester = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) { focusRequester.requestFocus(); keyboard?.show() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        OutlinedTextField(
            value = text, onValueChange = { text = it },
            placeholder = { Text("What's it for?") },
            modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSave(text) }),
            minLines = 2, maxLines = 5
        )
        Spacer(modifier = Modifier.weight(1f))
        Button(
            onClick = { onSave(text) },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(28.dp), enabled = !isSaving,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            if (isSaving) { CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)) }
            Text("Save", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
    }
}

/* =================================================================
 * MERCHANT EDIT -- text field + save
 * ================================================================= */
@Composable
private fun MerchantEditContent(expense: ExpenseItem, isSaving: Boolean, onSave: (String) -> Unit) {
    var text by remember { mutableStateOf(expense.cleanMerchantName() ?: "") }
    val focusRequester = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) { focusRequester.requestFocus(); keyboard?.show() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        OutlinedTextField(
            value = text, onValueChange = { text = it },
            placeholder = { Text("Merchant") },
            modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
            shape = RoundedCornerShape(12.dp), singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSave(text) })
        )
        Spacer(modifier = Modifier.weight(1f))
        Button(
            onClick = { onSave(text) },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(28.dp), enabled = !isSaving,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            if (isSaving) { CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)) }
            Text("Save", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
    }
}

/* =================================================================
 * DATE EDIT -- date field + calendar picker + save
 * ================================================================= */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateEditContent(expense: ExpenseItem, isSaving: Boolean, onSave: (String) -> Unit) {
    val initialYMD = DateUtils.formatYMD(expense.transactionDate ?: expense.createdAt)
    var dateText by remember { mutableStateOf(initialYMD) }

    val initialMillis = remember {
        try {
            val parts = initialYMD.split("-")
            if (parts.size == 3) {
                val cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
                cal.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), 0, 0, 0)
                cal.set(java.util.Calendar.MILLISECOND, 0)
                cal.timeInMillis
            } else System.currentTimeMillis()
        } catch (_: Exception) { System.currentTimeMillis() }
    }

    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = initialMillis)

    LaunchedEffect(datePickerState.selectedDateMillis) {
        datePickerState.selectedDateMillis?.let { millis ->
            val cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
            cal.timeInMillis = millis
            val y = cal.get(java.util.Calendar.YEAR)
            val m = cal.get(java.util.Calendar.MONTH) + 1
            val d = cal.get(java.util.Calendar.DAY_OF_MONTH)
            dateText = "%04d-%02d-%02d".format(y, m, d)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)
    ) {
        OutlinedTextField(
            value = dateText, onValueChange = { dateText = it },
            label = { Text("Date") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp), singleLine = true, readOnly = true,
            trailingIcon = {
                if (dateText.isNotEmpty()) {
                    IconButton(onClick = { dateText = "" }) { Icon(Icons.Filled.Cancel, "Clear date") }
                }
            }
        )
        Spacer(modifier = Modifier.height(16.dp))
        DatePicker(
            state = datePickerState, showModeToggle = false,
            title = null, headline = null,
            modifier = Modifier.fillMaxWidth(),
            colors = DatePickerDefaults.colors(
                containerColor = Color.Transparent,
                selectedDayContainerColor = MaterialTheme.colorScheme.primary,
                todayContentColor = MaterialTheme.colorScheme.primary,
                todayDateBorderColor = MaterialTheme.colorScheme.primary
            )
        )
        Spacer(modifier = Modifier.weight(1f))
        Button(
            onClick = { onSave(dateText) },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(28.dp),
            enabled = !isSaving && dateText.isNotEmpty(),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            if (isSaving) { CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)) }
            Text("Save", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
    }
}

/* =================================================================
 * CATEGORY EDIT -- searchable list, tap to select
 * ================================================================= */
@Composable
private fun CategoryEditContent(expense: ExpenseItem, isSaving: Boolean, onSelect: (String) -> Unit) {
    val categories = listOf(
        "Groceries", "Food & Dining", "Transport", "Healthcare",
        "Communication", "Utilities", "Education", "Home & Repair",
        "Personal & Clothing", "Entertainment", "Electronics",
        "Finance & Insurance", "Other"
    )

    var searchQuery by remember { mutableStateOf("") }
    val filteredCategories = remember(searchQuery) {
        if (searchQuery.isBlank()) categories
        else categories.filter { it.contains(searchQuery, ignoreCase = true) }
    }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = searchQuery, onValueChange = { searchQuery = it },
            placeholder = { Text("Search") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp), singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Search, null) }
        )
        Spacer(modifier = Modifier.height(8.dp))
        if (isSaving) {
            Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                item {
                    Text(
                        "All", style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        modifier = Modifier.fillMaxWidth().clickable { onSelect("Uncategorized") }.padding(vertical = 14.dp)
                    )
                }
                items(filteredCategories) { cat ->
                    val isSelected = cat == expense.category
                    Text(
                        cat, style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.fillMaxWidth().clickable { onSelect(cat) }.padding(vertical = 14.dp)
                    )
                }
            }
        }
    }
}
