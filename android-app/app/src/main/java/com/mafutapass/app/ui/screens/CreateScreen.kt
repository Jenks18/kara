package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.mafutapass.app.ui.theme.*

@Composable
fun CreateScreen() {
    var showCreateReportDialog by remember { mutableStateOf(false) }
    var showComingSoonDialog by remember { mutableStateOf<String?>(null) }
    var reportTitle by remember { mutableStateOf("") }
    var isCreating by remember { mutableStateOf(false) }
    var snackMessage by remember { mutableStateOf<String?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()

    val options = listOf(
        CreateOption(
            icon = Icons.Filled.Receipt,
            label = "Scan Receipt",
            description = "Capture fuel receipt with camera",
            onClick = { showComingSoonDialog = "Receipt scanning" }
        ),
        CreateOption(
            icon = Icons.Filled.ChatBubble,
            label = "Start chat",
            description = "Message your manager or team",
            onClick = { showComingSoonDialog = "Chat" }
        ),
        CreateOption(
            icon = Icons.Filled.Description,
            label = "Create report",
            description = "Create a new expense report",
            onClick = { showCreateReportDialog = true }
        )
    )
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
            .padding(16.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        options.forEach { option ->
            CreateOptionCard(option)
            Spacer(modifier = Modifier.height(12.dp))
        }
        
        // Show success/error message
        snackMessage?.let { msg ->
            Spacer(modifier = Modifier.height(16.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (msg.startsWith("✅")) Emerald100 else Color(0xFFFEE2E2)
            ) {
                Text(
                    text = msg,
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (msg.startsWith("✅")) Emerald600 else Red500
                )
            }
        }
    }

    // Create Report Dialog
    if (showCreateReportDialog) {
        AlertDialog(
            onDismissRequest = { if (!isCreating) showCreateReportDialog = false },
            title = { Text("Create Expense Report") },
            text = {
                OutlinedTextField(
                    value = reportTitle,
                    onValueChange = { reportTitle = it },
                    label = { Text("Report title") },
                    placeholder = { Text("e.g. February Fuel Expenses") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isCreating
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (reportTitle.isNotBlank()) {
                            isCreating = true
                            scope.launch {
                                try {
                                    withContext(Dispatchers.IO) {
                                        com.mafutapass.app.data.ApiClient.apiService.createExpenseReport(
                                            mapOf("title" to reportTitle.trim())
                                        )
                                    }
                                    snackMessage = "✅ Report \"${reportTitle.trim()}\" created"
                                    reportTitle = ""
                                    showCreateReportDialog = false
                                } catch (e: Exception) {
                                    snackMessage = "❌ Failed: ${e.message}"
                                } finally {
                                    isCreating = false
                                }
                            }
                        }
                    },
                    enabled = reportTitle.isNotBlank() && !isCreating
                ) {
                    Text(if (isCreating) "Creating..." else "Create", color = Emerald600)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showCreateReportDialog = false },
                    enabled = !isCreating
                ) { Text("Cancel") }
            }
        )
    }

    // Coming Soon Dialog
    showComingSoonDialog?.let { feature ->
        AlertDialog(
            onDismissRequest = { showComingSoonDialog = null },
            title = { Text("Coming Soon") },
            text = { Text("$feature will be available in a future update.") },
            confirmButton = {
                TextButton(onClick = { showComingSoonDialog = null }) {
                    Text("OK", color = Emerald600)
                }
            }
        )
    }
}


data class CreateOption(
    val icon: ImageVector,
    val label: String,
    val description: String,
    val onClick: () -> Unit
)

@Composable
fun CreateOptionCard(option: CreateOption) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = option.onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon circle
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Emerald100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = option.icon,
                    contentDescription = option.label,
                    tint = Emerald600,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(
                    text = option.label,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray900
                )
                Text(
                    text = option.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray600
                )
            }
        }
    }
}
