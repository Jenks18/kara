
package com.mafutapass.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.ReportsViewModel

@Composable
fun ReportsScreen(viewModel: ReportsViewModel = viewModel()) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Expenses", "Reports")

    val expenses by viewModel.expenseItems.collectAsState()
    val reports by viewModel.expenseReports.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

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
        Surface(
            color = Color.White,
            shadowElevation = 1.dp
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Reports",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Gray900,
                    modifier = Modifier.padding(16.dp)
                )

                // Segmented Control
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.White,
                    contentColor = Emerald600,
                    indicator = {},
                    divider = {},
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    if (selectedTab == index) Emerald600 else Color.Transparent
                                )
                        ) {
                            Text(
                                text = title,
                                color = if (selectedTab == index) Color.White else Gray600,
                                fontWeight = if (selectedTab == index) FontWeight.SemiBold else FontWeight.Normal,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    }
                }

                HorizontalDivider(color = Emerald100.copy(alpha = 0.3f))
            }
        }

        // Content
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Emerald600)
            }
        } else if (selectedTab == 0) {
            ExpensesTab(expenses)
        } else {
            ReportsTab(reports)
        }
    }
}

@Composable
fun ExpensesTab(expenses: List<ExpenseItem>) {
    if (expenses.isEmpty()) {
        EmptyState(
            message = "No expenses yet",
            description = "Scan your first receipt to get started"
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(expenses) { expense ->
                ExpenseCard(expense)
            }
        }
    }
}

@Composable
fun ReportsTab(reports: List<ExpenseReport>) {
    if (reports.isEmpty()) {
        EmptyState(
            message = "No reports yet",
            description = "Create your first expense report"
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(reports) { report ->
                ReportCard(report)
            }
        }
    }
}

@Composable
fun ExpenseCard(expense: ExpenseItem) {
    val context = LocalContext.current
    // Format the date nicely
    val displayDate = try {
        val raw = expense.transactionDate ?: expense.createdAt
        if (raw.length >= 10) raw.substring(0, 10) else raw
    } catch (_: Exception) { "" }

    val statusColor = when (expense.processingStatus) {
        "processed" -> Emerald600
        "scanning" -> Color(0xFFD97706) // amber
        "error" -> Color(0xFFDC2626) // red
        else -> Gray500
    }
    val statusLabel = expense.processingStatus.replaceFirstChar { it.uppercase() }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { Toast.makeText(context, "${expense.merchantName ?: "Receipt"} - ${expense.category}", Toast.LENGTH_SHORT).show() }
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon placeholder
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Emerald100),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = expense.category.take(1),
                    color = Emerald600,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = expense.merchantName ?: "Receipt",
                    style = MaterialTheme.typography.titleMedium,
                    color = Gray900
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Processing status badge
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = statusColor.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = statusLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = statusColor,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Text(
                        text = expense.category,
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                    if (displayDate.isNotEmpty()) {
                        Text("•", style = MaterialTheme.typography.bodySmall, color = Gray500)
                        Text(
                            text = displayDate,
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray500
                        )
                    }
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "KES ${String.format("%.2f", expense.amount)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Emerald600
                )
            }
        }
    }
}

@Composable
fun ReportCard(report: ExpenseReport) {
    val context = LocalContext.current
    val displayDate = try {
        if (report.createdAt.length >= 10) report.createdAt.substring(0, 10) else report.createdAt
    } catch (_: Exception) { "" }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { Toast.makeText(context, "${report.title} - ${report.itemsCount} items", Toast.LENGTH_SHORT).show() }
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = report.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray900,
                    modifier = Modifier.weight(1f)
                )
                if (report.totalAmount > 0) {
                    Text(
                        text = "KES ${String.format("%.2f", report.totalAmount)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Emerald600
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Emerald100
                ) {
                    Text(
                        text = report.status.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = Emerald600,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }

                Text(
                    text = "${report.itemsCount} items",
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )

                if (displayDate.isNotEmpty()) {
                    Text("•", style = MaterialTheme.typography.bodySmall, color = Gray500)
                    Text(
                        text = displayDate,
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                }
            }

            // Workspace name footer
            if (report.workspaceName.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = report.workspaceName,
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
            }
        }
    }
}

@Composable
fun EmptyState(message: String, description: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = message,
                style = MaterialTheme.typography.titleLarge,
                color = Gray900
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = Gray500
            )
        }
    }
}
