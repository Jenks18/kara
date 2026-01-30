package com.mafutapass.app.ui.screens

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.ui.theme.*

@Composable
fun ReportsScreen() {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Expenses", "Reports")
    
    // Mock data
    val expenses = remember { emptyList<ExpenseItem>() }
    val reports = remember { emptyList<ExpenseReport>() }
    
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
                
                Divider(color = Emerald100.copy(alpha = 0.3f))
            }
        }
        
        // Content
        if (selectedTab == 0) {
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
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { }
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
                Text(
                    text = expense.category,
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
            }
            
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "KES ${String.format("%.2f", expense.amount)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Emerald600
                )
                
                if (expense.kraVerified == true) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Emerald100,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.CheckCircle,
                                contentDescription = "Verified",
                                tint = Emerald600,
                                modifier = Modifier.size(10.dp)
                            )
                            Text(
                                text = "KRA",
                                style = MaterialTheme.typography.bodySmall,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = Emerald600
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ReportCard(report: ExpenseReport) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { }
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Text(
                text = report.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Gray900
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Emerald100
                ) {
                    Text(
                        text = report.status.capitalize(),
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
