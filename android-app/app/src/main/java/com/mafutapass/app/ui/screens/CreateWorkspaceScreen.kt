package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.WorkspacesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateWorkspaceScreen(
    onBack: () -> Unit,
    onCreated: () -> Unit,
    viewModel: WorkspacesViewModel = hiltViewModel()
) {
    var workspaceName by remember { mutableStateOf("") }
    var currencyCode by remember { mutableStateOf("KES") }
    var currencySymbol by remember { mutableStateOf("KSh") }
    var showCurrencyPicker by remember { mutableStateOf(false) }

    val createState by viewModel.createState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Navigate on success, show error on failure
    LaunchedEffect(createState) {
        when (val state = createState) {
            is WorkspacesViewModel.CreateState.Success -> {
                viewModel.resetCreateState()
                onCreated()
            }
            is WorkspacesViewModel.CreateState.Error -> {
                snackbarHostState.showSnackbar(
                    message = state.message,
                    duration = SnackbarDuration.Long
                )
                viewModel.resetCreateState()
            }
            else -> {}
        }
    }

    // Reset creation state when leaving the screen
    DisposableEffect(Unit) {
        onDispose { viewModel.resetCreateState() }
    }

    val isCreating = createState is WorkspacesViewModel.CreateState.Loading
    val displayAvatar = workspaceName.firstOrNull()?.uppercase() ?: "W"

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = androidx.compose.ui.graphics.Color.Transparent
    ) { innerPadding ->
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .background(AppTheme.colors.backgroundGradient)
    ) {
        // Header
        TopAppBar(
            title = {
                Text("Confirm Workspace", fontWeight = FontWeight.SemiBold)
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Description
            Text(
                text = "Track receipts, reimburse expenses, manage travel, send invoices, and more.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Start,
                modifier = Modifier.fillMaxWidth()
            )

            // Avatar preview
            Box(
                modifier = Modifier
                    .size(128.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Blue500, Blue700)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = displayAvatar,
                    style = MaterialTheme.typography.displayLarge,
                    fontWeight = FontWeight.Bold,
                    color = androidx.compose.ui.graphics.Color.White
                )
            }

            // Workspace name field
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    "Workspace name",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = workspaceName,
                    onValueChange = { workspaceName = it },
                    placeholder = { Text("Terpmail's Workspace") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )
            }

            // Currency selector
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showCurrencyPicker = true },
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "Default currency",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "$currencyCode - $currencySymbol",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Icon(
                        Icons.Filled.ChevronRight,
                        null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                }
            }
        }

        // Confirm button
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 4.dp
        ) {
            Button(
                onClick = {
                    if (workspaceName.isNotBlank() && !isCreating) {
                        viewModel.createWorkspace(workspaceName.trim(), currencyCode, currencySymbol)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                enabled = workspaceName.isNotBlank() && !isCreating,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                if (isCreating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    text = if (isCreating) "Creating..." else "Confirm",
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(vertical = 8.dp),
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }
    }
    } // Scaffold

    // Currency Picker Dialog
    if (showCurrencyPicker) {
        CreateWorkspaceCurrencyPicker(
            currentCurrency = currencyCode,
            onDismiss = { showCurrencyPicker = false },
            onSelect = { code, symbol ->
                currencyCode = code
                currencySymbol = symbol
                showCurrencyPicker = false
            }
        )
    }
}

@Composable
private fun CreateWorkspaceCurrencyPicker(
    currentCurrency: String,
    onDismiss: () -> Unit,
    onSelect: (code: String, symbol: String) -> Unit
) {
    val currencies = listOf(
        Triple("KSH", "KSh", "Kenyan Shilling"),
        Triple("USD", "$", "US Dollar"),
        Triple("EUR", "€", "Euro"),
        Triple("GBP", "£", "British Pound"),
        Triple("JPY", "¥", "Japanese Yen"),
        Triple("AUD", "A$", "Australian Dollar"),
        Triple("CAD", "C$", "Canadian Dollar"),
        Triple("CHF", "CHF", "Swiss Franc"),
        Triple("CNY", "¥", "Chinese Yuan"),
        Triple("INR", "₹", "Indian Rupee"),
        Triple("ZAR", "R", "South African Rand"),
        Triple("NGN", "₦", "Nigerian Naira"),
        Triple("GHS", "₵", "Ghanaian Cedi"),
        Triple("TZS", "TSh", "Tanzanian Shilling"),
        Triple("UGX", "USh", "Ugandan Shilling"),
    )

    var search by remember { mutableStateOf("") }
    val filtered = currencies.filter {
        search.isBlank() ||
        it.first.contains(search, ignoreCase = true) ||
        it.third.contains(search, ignoreCase = true)
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 500.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Select Currency",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Filled.Close, "Close")
                    }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = search,
                    onValueChange = { search = it },
                    placeholder = { Text("Search currencies...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    leadingIcon = { Icon(Icons.Filled.Search, null) }
                )
                Spacer(Modifier.height(12.dp))

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    filtered.forEach { (code, symbol, name) ->
                        val isSelected = code.equals(currentCurrency, ignoreCase = true)
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(code, symbol) },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected)
                                MaterialTheme.colorScheme.primaryContainer
                            else
                                MaterialTheme.colorScheme.surface
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        "$code - $symbol",
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        name,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (isSelected) {
                                    Icon(
                                        Icons.Filled.Check,
                                        null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
