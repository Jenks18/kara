package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.ApiService
import com.mafutapass.app.data.ExpenseItem
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

    LaunchedEffect(expenseId) {
        viewModel.loadExpense(expenseId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        TopAppBar(
            title = { Text("Receipt Detail", fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0)
        )

        when {
            isLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
            error != null -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(error ?: "Unknown error", color = MaterialTheme.colorScheme.error)
                }
            }
            expense != null -> {
                ExpenseDetailContent(expense!!)
            }
        }
    }
}

@Composable
private fun ExpenseDetailContent(expense: ExpenseItem) {
    val context = LocalContext.current
    val displayDate = DateUtils.formatShort(expense.transactionDate ?: expense.createdAt)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
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
                    "KES ${String.format("%.2f", expense.amount)}",
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
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                DetailRow(Icons.Filled.Store, "Merchant", expense.merchantName ?: "Unknown")
                DetailRow(Icons.Filled.Category, "Category", expense.category)
                DetailRow(Icons.Filled.CalendarToday, "Date", displayDate.ifEmpty { "Not set" })

                val statusColor = when (expense.processingStatus) {
                    "processed" -> MaterialTheme.colorScheme.primary
                    "scanning" -> AppTheme.colors.statusPending
                    "error" -> MaterialTheme.colorScheme.error
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Info, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Status", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Surface(shape = RoundedCornerShape(8.dp), color = statusColor.copy(alpha = 0.12f)) {
                            Text(
                                expense.processingStatus.replaceFirstChar { it.uppercase() },
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
                }

                if (!expense.description.isNullOrBlank()) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    DetailRow(Icons.Filled.Notes, "Notes", expense.description!!)
                }
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
