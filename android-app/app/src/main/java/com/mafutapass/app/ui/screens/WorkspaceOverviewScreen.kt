package com.mafutapass.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.WorkspaceOverviewViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceOverviewScreen(
    workspaceId: String,
    onBack: () -> Unit,
    viewModel: WorkspaceOverviewViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val workspace by viewModel.workspace.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var showInviteDialog by remember { mutableStateOf(false) }
    var showMoreMenu by remember { mutableStateOf(false) }
    var showShareDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showEditNameDialog by remember { mutableStateOf(false) }
    var showEditDescDialog by remember { mutableStateOf(false) }
    var showEditCurrencyDialog by remember { mutableStateOf(false) }
    var showEditAddressDialog by remember { mutableStateOf(false) }

    var inviteInput by remember { mutableStateOf("") }
    val shareUrl = "https://www.kachalabs.com/workspaces/$workspaceId/join"

    LaunchedEffect(workspaceId) {
        viewModel.loadWorkspace(workspaceId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        // Header
        TopAppBar(
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Filled.Business, null, tint = MaterialTheme.colorScheme.primary)
                    Text("Overview", fontWeight = FontWeight.Bold)
                }
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

        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            return
        }

        val ws = workspace ?: return

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Action buttons — Invite + More
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = { showInviteDialog = true },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Filled.PersonAdd, null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Invite", fontWeight = FontWeight.SemiBold)
                }

                Box {
                    OutlinedButton(
                        onClick = { showMoreMenu = !showMoreMenu },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("More", color = MaterialTheme.colorScheme.onSurface)
                        Icon(
                            if (showMoreMenu) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                            null,
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    DropdownMenu(
                        expanded = showMoreMenu,
                        onDismissRequest = { showMoreMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Share") },
                            onClick = {
                                showMoreMenu = false
                                showShareDialog = true
                            },
                            leadingIcon = { Icon(Icons.Filled.Share, null, tint = MaterialTheme.colorScheme.primary) }
                        )
                        DropdownMenuItem(
                            text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                            onClick = {
                                showMoreMenu = false
                                showDeleteDialog = true
                            },
                            leadingIcon = { Icon(Icons.Filled.Delete, null, tint = MaterialTheme.colorScheme.error) }
                        )
                    }
                }
            }

            // Workspace Avatar
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Blue500, Blue700)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    val avatarUrl = ws.avatar
                    if (avatarUrl != null && avatarUrl.startsWith("http")) {
                        AsyncImage(
                            model = avatarUrl,
                            contentDescription = ws.name,
                            modifier = Modifier
                                .size(96.dp)
                                .clip(RoundedCornerShape(20.dp))
                        )
                    } else {
                        Text(
                            text = ws.initials,
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = androidx.compose.ui.graphics.Color.White
                        )
                    }
                }
            }

            // Settings rows
            SettingRow(
                label = "Workspace name",
                value = ws.name,
                onClick = { showEditNameDialog = true }
            )

            SettingRow(
                label = "Description",
                value = ws.description ?: "One place for all your receipts and expenses.",
                onClick = { showEditDescDialog = true }
            )

            SettingRow(
                label = "Default currency",
                value = "${ws.currency} - ${ws.currencySymbol}",
                subtitle = "All expenses on this workspace will be converted to this currency.",
                onClick = { showEditCurrencyDialog = true }
            )

            SettingRow(
                label = "Company address",
                value = ws.address ?: "Add company address",
                onClick = { showEditAddressDialog = true }
            )
        }
    }

    // ── Edit Name Dialog ──
    if (showEditNameDialog) {
        EditFieldDialog(
            title = "Workspace name",
            initialValue = workspace?.name ?: "",
            onDismiss = { showEditNameDialog = false },
            onConfirm = { newVal ->
                viewModel.updateField(workspaceId, "name", newVal)
                showEditNameDialog = false
            }
        )
    }

    // ── Edit Description Dialog ──
    if (showEditDescDialog) {
        EditFieldDialog(
            title = "Description",
            initialValue = workspace?.description ?: "",
            onDismiss = { showEditDescDialog = false },
            onConfirm = { newVal ->
                viewModel.updateField(workspaceId, "description", newVal)
                showEditDescDialog = false
            },
            singleLine = false
        )
    }

    // ── Edit Currency Dialog ──
    if (showEditCurrencyDialog) {
        CurrencyPickerDialog(
            currentCurrency = workspace?.currency ?: "KES",
            onDismiss = { showEditCurrencyDialog = false },
            onSelect = { code, symbol ->
                viewModel.updateCurrency(workspaceId, code, symbol)
                showEditCurrencyDialog = false
            }
        )
    }

    // ── Edit Address Dialog ──
    if (showEditAddressDialog) {
        EditFieldDialog(
            title = "Company address",
            initialValue = workspace?.address ?: "",
            onDismiss = { showEditAddressDialog = false },
            onConfirm = { newVal ->
                viewModel.updateField(workspaceId, "address", newVal)
                showEditAddressDialog = false
            },
            singleLine = false
        )
    }

    // ── Invite Dialog ──
    if (showInviteDialog) {
        Dialog(onDismissRequest = { showInviteDialog = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Invite new members",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { showInviteDialog = false }) {
                            Icon(Icons.Filled.Close, "Close")
                        }
                    }
                    Text(
                        "Add members to this workspace",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = inviteInput,
                        onValueChange = { inviteInput = it },
                        placeholder = { Text("Name, email, or phone number") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (inviteInput.isNotBlank()) {
                                Toast.makeText(context, "Invite sent to: $inviteInput", Toast.LENGTH_SHORT).show()
                                inviteInput = ""
                                showInviteDialog = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("Next", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(vertical = 8.dp))
                    }
                }
            }
        }
    }

    // ── Share Dialog ──
    if (showShareDialog) {
        Dialog(onDismissRequest = { showShareDialog = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Share workspace",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { showShareDialog = false }) {
                            Icon(Icons.Filled.Close, "Close")
                        }
                    }
                    Spacer(Modifier.height(16.dp))

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Share link", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(4.dp))
                            Text(shareUrl, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    Button(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Share URL", shareUrl))
                            Toast.makeText(context, "Link copied to clipboard!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.Share, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Copy Link", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    // ── Delete Confirmation Dialog ──
    if (showDeleteDialog) {
        Dialog(onDismissRequest = { showDeleteDialog = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(MaterialTheme.colorScheme.errorContainer, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.Delete,
                            null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Delete workspace?",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Are you sure you want to delete \"${workspace?.name}\"? This action cannot be undone and all data will be permanently lost.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(24.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showDeleteDialog = false },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = {
                                viewModel.deleteWorkspace(workspaceId) {
                                    showDeleteDialog = false
                                    onBack()
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Delete")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingRow(
    label: String,
    value: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = value,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (subtitle != null) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun EditFieldDialog(
    title: String,
    initialValue: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
    singleLine: Boolean = true
) {
    var text by remember { mutableStateOf(initialValue) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Filled.Close, "Close")
                    }
                }
                Spacer(Modifier.height(16.dp))
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = singleLine,
                    minLines = if (singleLine) 1 else 3,
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { onConfirm(text) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = text.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Save", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(vertical = 8.dp))
                }
            }
        }
    }
}

@Composable
private fun CurrencyPickerDialog(
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
