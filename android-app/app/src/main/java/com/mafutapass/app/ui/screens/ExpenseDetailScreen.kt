package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import com.mafutapass.app.util.CurrencyFormatter
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.UpdateReceiptRequest
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.DateUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ExpenseDetailViewModel @Inject constructor(
    private val apiService: ApiService
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

    fun loadExpense(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _expense.value = apiService.getReceipt(id)
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load receipt"
            } finally {
                _isLoading.value = false
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
                val response = apiService.updateReceipt(id, request)
                if (response.success) {
                    _saveSuccess.value = true
                    // Reload fresh data
                    _expense.value = apiService.getReceipt(id)
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

    var isEditing by remember { mutableStateOf(false) }

    LaunchedEffect(expenseId) {
        viewModel.loadExpense(expenseId)
    }

    // Show snackbar on save success
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(saveSuccess) {
        if (saveSuccess) {
            isEditing = false
            snackbarHostState.showSnackbar("Receipt updated")
            viewModel.clearSaveSuccess()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Color.Transparent,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        expense?.cleanMerchantName() ?: "Receipt Detail",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (isEditing) isEditing = false else onBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (expense != null && !isEditing) {
                        IconButton(onClick = { isEditing = true }) {
                            Icon(Icons.Filled.Edit, "Edit receipt")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                windowInsets = WindowInsets(0, 0, 0, 0)
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
                    if (isEditing) {
                        EditExpenseContent(
                            expense = expense!!,
                            isSaving = isSaving,
                            error = error,
                            onSave = { merchant, amt, cat, date, desc ->
                                viewModel.updateExpense(expenseId, merchant, amt, cat, date, desc)
                            },
                            onCancel = { isEditing = false }
                        )
                    } else {
                        ExpenseDetailContent(expense = expense!!, onEditClick = { isEditing = true })
                    }
                }
            }
        }
    }
}

@Composable
private fun ExpenseDetailContent(expense: ExpenseItem, onEditClick: () -> Unit) {
    val context = LocalContext.current
    val displayDate = DateUtils.formatShort(expense.transactionDate ?: expense.createdAt)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Needs Review banner — shown when AI couldn't fully process the receipt
        if (expense.processingStatus == "error" || expense.processingStatus == "needs_review") {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFFE6A817).copy(alpha = 0.12f),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onEditClick() }
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Filled.Warning, null,
                        tint = Color(0xFFE6A817),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Needs Review",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFE6A817)
                        )
                        Text(
                            "Tap to edit and correct the details below.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(Icons.Filled.Edit, null, tint = Color(0xFFE6A817), modifier = Modifier.size(20.dp))
                }
            }
        }

        // Receipt image
        if (expense.imageUrl.isNotBlank() && expense.imageUrl.startsWith("http")) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(expense.imageUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = "Receipt image",
                    contentScale = ContentScale.FillWidth,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 200.dp, max = 400.dp)
                        .clip(RoundedCornerShape(16.dp))
                )
            }
        }

        // Amount card
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Amount", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                Spacer(Modifier.height(4.dp))
                Text(
                    CurrencyFormatter.formatSimple(expense.amount),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }

        // Details card
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                DetailRow(Icons.Filled.Store, "Merchant", expense.cleanMerchantName() ?: "Unknown")
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                DetailRow(Icons.Filled.Category, "Category", expense.category)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                DetailRow(Icons.Filled.CalendarToday, "Date", displayDate.ifEmpty { "Not set" })
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                // Status row with improved badge logic
                val statusColor = when (expense.processingStatus) {
                    "processed" -> MaterialTheme.colorScheme.primary
                    "scanning" -> AppTheme.colors.statusPending
                    "error", "needs_review" -> Color(0xFFE6A817)
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                }
                val statusLabel = when (expense.processingStatus) {
                    "processed" -> if (expense.kraVerified == true) "KRA Verified" else "Verified"
                    "scanning" -> "Processing"
                    "error", "needs_review" -> "Needs Review"
                    else -> expense.processingStatus.replaceFirstChar { it.uppercase() }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Info, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Status", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Surface(shape = RoundedCornerShape(8.dp), color = statusColor.copy(alpha = 0.12f)) {
                            Text(
                                statusLabel,
                                style = MaterialTheme.typography.labelMedium,
                                color = statusColor,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                if (expense.kraVerified == true) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        Text("KRA Verified", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                    }
                } else if (expense.processingStatus == "processed") {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        Text("Verified", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                    }
                }

                if (!expense.description.isNullOrBlank() && !expense.description.startsWith("AI confidence")) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    @Suppress("DEPRECATION")
                    DetailRow(Icons.Filled.Notes, "Notes", expense.description!!)
                }
            }
        }

        // Edit button at the bottom
        OutlinedButton(
            onClick = onEditClick,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(16.dp),
            border = ButtonDefaults.outlinedButtonBorder(true)
        ) {
            Icon(Icons.Filled.Edit, null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Edit Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditExpenseContent(
    expense: ExpenseItem,
    isSaving: Boolean,
    error: String?,
    onSave: (merchant: String, amount: Double, category: String, date: String, description: String) -> Unit,
    onCancel: () -> Unit
) {
    var merchant by remember { mutableStateOf(expense.cleanMerchantName() ?: "") }
    var amountText by remember { mutableStateOf(if (expense.amount > 0) expense.amount.toString() else "") }
    var category by remember { mutableStateOf(expense.category) }
    var dateText by remember { mutableStateOf(DateUtils.formatYMD(expense.transactionDate ?: expense.createdAt)) }
    var description by remember {
        val raw = expense.description ?: ""
        mutableStateOf(if (raw.startsWith("AI confidence")) "" else raw)
    }
    var showCategoryMenu by remember { mutableStateOf(false) }

    val categories = listOf("Fuel", "Food", "Transport", "Accommodation", "Office Supplies", "Communication", "Maintenance", "Other")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Receipt image (smaller in edit mode)
        if (expense.imageUrl.isNotBlank() && expense.imageUrl.startsWith("http")) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(expense.imageUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = "Receipt image",
                    contentScale = ContentScale.FillWidth,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 200.dp)
                        .clip(RoundedCornerShape(12.dp))
                )
            }
        }

        if (error != null) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.errorContainer,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    error,
                    modifier = Modifier.padding(12.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        // Editable fields card
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedTextField(
                    value = merchant,
                    onValueChange = { merchant = it },
                    label = { Text("Merchant") },
                    leadingIcon = { Icon(Icons.Filled.Store, null) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Amount (${CurrencyFormatter.defaultCurrencyCode})") },
                    leadingIcon = { Icon(Icons.Filled.AttachMoney, null) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                // Category dropdown
                ExposedDropdownMenuBox(
                    expanded = showCategoryMenu,
                    onExpandedChange = { showCategoryMenu = it }
                ) {
                    OutlinedTextField(
                        value = category,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Category") },
                        leadingIcon = { Icon(Icons.Filled.Category, null) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showCategoryMenu) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = showCategoryMenu,
                        onDismissRequest = { showCategoryMenu = false }
                    ) {
                        categories.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(cat) },
                                onClick = {
                                    category = cat
                                    showCategoryMenu = false
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = dateText,
                    onValueChange = { dateText = it },
                    label = { Text("Date (yyyy-MM-dd)") },
                    leadingIcon = { Icon(Icons.Filled.CalendarToday, null) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Notes") },
                    leadingIcon = { Icon(Icons.Filled.Notes, null) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2,
                    maxLines = 4
                )
            }
        }

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = !isSaving
            ) {
                Text("Cancel", fontWeight = FontWeight.Medium)
            }
            Button(
                onClick = {
                    val parsedAmount = amountText.toDoubleOrNull() ?: expense.amount
                    onSave(merchant, parsedAmount, category, dateText, description)
                },
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = !isSaving,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                    Spacer(Modifier.width(8.dp))
                }
                Text(if (isSaving) "Saving..." else "Save Changes", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun DetailRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}
