package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.data.ApiClient
import com.mafutapass.app.data.CreateWorkspaceRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class Currency(
    val code: String,
    val symbol: String,
    val name: String
)

val CURRENCIES = listOf(
    Currency("KES", "KSh", "Kenyan Shilling"),
    Currency("USD", "$", "US Dollar"),
    Currency("EUR", "€", "Euro"),
    Currency("GBP", "£", "British Pound"),
    Currency("JPY", "¥", "Japanese Yen"),
    Currency("AUD", "A$", "Australian Dollar"),
    Currency("CAD", "C$", "Canadian Dollar"),
    Currency("INR", "₹", "Indian Rupee"),
    Currency("ZAR", "R", "South African Rand"),
    Currency("NGN", "₦", "Nigerian Naira"),
    Currency("TZS", "TSh", "Tanzanian Shilling"),
    Currency("UGX", "USh", "Ugandan Shilling"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewWorkspaceScreen(onBack: () -> Unit, onConfirm: () -> Unit) {
    var workspaceName by remember { mutableStateOf("") }
    var selectedCurrency by remember { mutableStateOf(CURRENCIES[0]) }
    var showCurrencyPicker by remember { mutableStateOf(false) }
    var isCreating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    val displayAvatar = if (workspaceName.isNotEmpty()) 
        workspaceName.first().uppercaseChar().toString() 
    else "W"
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
    ) {
        // Header
        TopAppBar(
            title = {
                Text("Confirm Workspace", fontWeight = FontWeight.SemiBold)
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.White
            )
        )
        
        // Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Avatar Preview
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Emerald600)
                    .align(Alignment.CenterHorizontally),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = displayAvatar,
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Workspace Name Input
            OutlinedTextField(
                value = workspaceName,
                onValueChange = { workspaceName = it },
                label = { Text("Workspace name") },
                placeholder = { Text("My Workspace") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Emerald600,
                    focusedLabelColor = Emerald600
                )
            )
            
            // Currency Selector
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                shadowElevation = 1.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showCurrencyPicker = true }
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Currency",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray500
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${selectedCurrency.code} - ${selectedCurrency.symbol}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Icon(
                        imageVector = Icons.Filled.ChevronRight,
                        contentDescription = "Select",
                        tint = Gray500
                    )
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Confirm Button
            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = Red500,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }
            Button(
                onClick = {
                    if (workspaceName.isNotBlank() && !isCreating) {
                        isCreating = true
                        errorMessage = null
                        scope.launch {
                            try {
                                withContext(Dispatchers.IO) {
                                    ApiClient.apiService.createWorkspace(
                                        CreateWorkspaceRequest(
                                            name = workspaceName.trim(),
                                            currency = selectedCurrency.code,
                                            currencySymbol = selectedCurrency.symbol
                                        )
                                    )
                                }
                                onConfirm()
                            } catch (e: Exception) {
                                android.util.Log.e("NewWorkspace", "Failed to create workspace: ${e.message}", e)
                                errorMessage = "Failed to create workspace"
                                isCreating = false
                            }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = workspaceName.isNotBlank() && !isCreating,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Emerald600,
                    disabledContainerColor = Gray300
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = if (isCreating) "Creating..." else "Confirm",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
    
    // Currency Picker Dialog
    if (showCurrencyPicker) {
        AlertDialog(
            onDismissRequest = { showCurrencyPicker = false },
            title = { Text("Select Currency") },
            text = {
                LazyColumn {
                    items(CURRENCIES) { currency ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedCurrency = currency
                                    showCurrencyPicker = false
                                }
                                .padding(vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("${currency.code} - ${currency.name}")
                            Text(currency.symbol, fontWeight = FontWeight.Bold)
                        }
                        if (currency != CURRENCIES.last()) {
                            Divider(color = Gray100)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCurrencyPicker = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
