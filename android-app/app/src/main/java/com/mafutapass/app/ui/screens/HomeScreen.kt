package com.mafutapass.app.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.CurrencyFormatter
import com.mafutapass.app.viewmodel.ReportsViewModel
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

@Composable
fun HomeScreen(
    onViewAllExpenses: () -> Unit = {},
    onViewAllReports: () -> Unit = {},
    viewModel: ReportsViewModel = hiltViewModel()
) {
    val expenses by viewModel.expenseItems.collectAsState()
    val reports by viewModel.expenseReports.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    // ── Real month-over-month stats ────────────────────────────────
    val now = LocalDate.now()
    val firstOfMonth = now.withDayOfMonth(1)
    val firstOfLastMonth = firstOfMonth.minusMonths(1)
    val isoFmt = DateTimeFormatter.ISO_OFFSET_DATE_TIME

    val thisMonthExpenses = remember(expenses) {
        expenses.filter { e ->
            runCatching {
                val d = ZonedDateTime.parse(e.createdAt, isoFmt).toLocalDate()
                !d.isBefore(firstOfMonth)
            }.getOrDefault(false)
        }
    }
    val lastMonthExpenses = remember(expenses) {
        expenses.filter { e ->
            runCatching {
                val d = ZonedDateTime.parse(e.createdAt, isoFmt).toLocalDate()
                !d.isBefore(firstOfLastMonth) && d.isBefore(firstOfMonth)
            }.getOrDefault(false)
        }
    }

    val totalThisMonth = remember(thisMonthExpenses) { thisMonthExpenses.sumOf { it.amount } }
    val totalAllTime   = remember(expenses)           { expenses.sumOf { it.amount } }
    val lastMonthTotal = remember(lastMonthExpenses)  { lastMonthExpenses.sumOf { it.amount } }
    val momTrend       = remember(totalThisMonth, lastMonthTotal) {
        if (lastMonthTotal > 0) ((totalThisMonth - lastMonthTotal) / lastMonthTotal * 100).toFloat() else 0f
    }
    val submittedReportsCount = remember(reports) {
        reports.count { it.status.equals("submitted", ignoreCase = true) }
    }

    LaunchedEffect(Unit) { viewModel.refresh() }

    val scrollState = rememberScrollState()
    val headerElevation by animateDpAsState(
        targetValue = if (scrollState.value > 0) 4.dp else 1.dp,
        label = "headerElevation"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        // ── Header ─────────────────────────────────────────────────
        Surface(
            color = MaterialTheme.colorScheme.surface.copy(
                alpha = if (scrollState.value > 0) 0.95f else 1f
            ),
            shadowElevation = headerElevation
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "Dashboard",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Welcome back. Here's your expense overview.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // ── Content ───────────────────────────────────────────────
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {

                // ── Hero spending card ─────────────────────────────
                HeroSpendingCard(
                    totalThisMonth = totalThisMonth,
                    momTrend = momTrend,
                    receiptCountThisMonth = thisMonthExpenses.size,
                    totalAllTime = totalAllTime
                )

                // ── Stat pills row ─────────────────────────────────
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatPillCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Filled.Description,
                        iconColor = Blue500,
                        iconBackground = Blue50,
                        value = submittedReportsCount.toString(),
                        label = "Reports Submitted"
                    )
                    StatPillCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Filled.Receipt,
                        iconColor = Color(0xFF10B981),
                        iconBackground = Color(0xFFD1FAE5),
                        value = expenses.size.toString(),
                        label = "All Receipts"
                    )
                }

                // ── Recent Expenses ────────────────────────────────
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 1.dp
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Recent Expenses",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Row(
                                modifier = Modifier.clickable { onViewAllExpenses() },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Text(
                                    text = "View All",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = Blue600
                                )
                                Icon(
                                    imageVector = Icons.Filled.ChevronRight,
                                    contentDescription = null,
                                    tint = Blue600,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))

                        if (expenses.isEmpty()) {
                            EmptyState(icon = Icons.Filled.Receipt, message = "No expenses yet", sub = "Scan a receipt to get started")
                        } else {
                            expenses.take(5).forEachIndexed { index, expense ->
                                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Row(
                                            modifier = Modifier.weight(1f),
                                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(40.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(Color(0xFFF3F4F6)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(Icons.Filled.Receipt, contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(20.dp))
                                            }
                                            Column {
                                                Text(
                                                    text = expense.cleanMerchantName() ?: "Unknown",
                                                    style = MaterialTheme.typography.bodyLarge,
                                                    fontWeight = FontWeight.SemiBold,
                                                    maxLines = 1, overflow = TextOverflow.Ellipsis
                                                )
                                                Text(
                                                    text = "${expense.category.ifBlank { "Uncategorized" }} · ${shortDate(expense.createdAt)}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                text = CurrencyFormatter.formatSimple(expense.amount),
                                                style = MaterialTheme.typography.bodyLarge,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            ExpenseStatusBadge(expense.processingStatus)
                                        }
                                    }
                                    if (index < minOf(expenses.size, 5) - 1) {
                                        Divider(modifier = Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.outlineVariant)
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Active Reports ─────────────────────────────────
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 1.dp
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Active Reports",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Row(
                                modifier = Modifier.clickable { onViewAllReports() },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Text(
                                    text = "View All",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = Blue600
                                )
                                Icon(
                                    imageVector = Icons.Filled.ChevronRight,
                                    contentDescription = null,
                                    tint = Blue600,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))

                        if (reports.isEmpty()) {
                            EmptyState(icon = Icons.Filled.FolderOpen, message = "No active reports", sub = "Reports you create will appear here")
                        } else {
                            reports.take(3).forEach { report ->
                                Surface(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE5E7EB)),
                                    color = MaterialTheme.colorScheme.surface
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.Top
                                        ) {
                                            Text(
                                                text = report.title.ifBlank { "Untitled Report" },
                                                style = MaterialTheme.typography.bodyLarge,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.weight(1f),
                                                maxLines = 1, overflow = TextOverflow.Ellipsis
                                            )
                                            ReportStatusBadge(report.status)
                                        }
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "${report.itemsCount} expense${if (report.itemsCount != 1) "s" else ""}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                            Text(
                                                text = CurrencyFormatter.formatSimple(report.totalAmount),
                                                style = MaterialTheme.typography.bodyLarge,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Spending by Category ───────────────────────────
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 1.dp
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.BarChart, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(20.dp))
                            Text(
                                text = "Spending by Category",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Text(
                                text = "This month",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))

                        if (thisMonthExpenses.isEmpty()) {
                            EmptyState(icon = Icons.Filled.BarChart, message = "No spending data", sub = "Your category breakdown will appear here")
                        } else {
                            val categoryTotals = thisMonthExpenses
                                .groupBy { it.category ?: "Other" }
                                .mapValues { (_, list) -> list.sumOf { it.amount } }
                                .toList().sortedByDescending { it.second }.take(5)
                            val maxAmount = categoryTotals.maxOfOrNull { it.second } ?: 1.0
                            val barColors = listOf(Blue500, Color(0xFF8B5CF6), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFFEC4899))

                            categoryTotals.forEachIndexed { idx, (category, amount) ->
                                val barColor = barColors[idx % barColors.size]
                                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Box(modifier = Modifier.size(9.dp).clip(RoundedCornerShape(50)).background(barColor))
                                            Text(category, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                        }
                                        Text(CurrencyFormatter.formatSimple(amount), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Box(modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(Color(0xFFE5E7EB))) {
                                        Box(modifier = Modifier.fillMaxWidth((amount / maxAmount).toFloat()).height(6.dp).clip(RoundedCornerShape(3.dp)).background(barColor))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Helper composables ─────────────────────────────────────────────────────

@Composable
fun HeroSpendingCard(
    totalThisMonth: Double,
    momTrend: Float,
    receiptCountThisMonth: Int,
    totalAllTime: Double
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(listOf(Color(0xFF2563EB), Color(0xFF1E40AF)))
            )
            .padding(20.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("This Month", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.75f))
                Text(
                    CurrencyFormatter.formatSimple(totalThisMonth),
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 1, overflow = TextOverflow.Ellipsis
                )
            }

            if (momTrend != 0f) {
                val trendColor = if (momTrend > 0) Color(0xFFEF4444) else Color(0xFF10B981)
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = trendColor.copy(alpha = 0.2f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (momTrend > 0) Icons.Filled.TrendingUp else Icons.Filled.TrendingDown,
                            contentDescription = null,
                            tint = trendColor,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "${if (momTrend > 0) "+" else ""}${"%.1f".format(momTrend)}% vs last month",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Receipt, contentDescription = null, tint = Color.White.copy(0.65f), modifier = Modifier.size(14.dp))
                    Text("$receiptCountThisMonth receipt${if (receiptCountThisMonth != 1) "s" else ""}", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(0.7f))
                }
                Text("·", color = Color.White.copy(0.3f), style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Archive, contentDescription = null, tint = Color.White.copy(0.65f), modifier = Modifier.size(14.dp))
                    Text("${CurrencyFormatter.formatSimple(totalAllTime)} all time", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(0.7f))
                }
            }
        }
    }
}

@Composable
fun StatPillCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    iconColor: Color,
    iconBackground: Color,
    value: String,
    label: String
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(42.dp).clip(RoundedCornerShape(10.dp)).background(iconBackground),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(20.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
fun ExpenseStatusBadge(status: String) {
    val (label, fg, bg) = when (status.lowercase()) {
        "needs_review", "scanning" -> Triple("Pending",   Color(0xFFB45309), Color(0xFFFEF3C7))
        "processed", "approved"    -> Triple("Processed", Color(0xFF065F46), Color(0xFFD1FAE5))
        else                       -> Triple("Draft",     Color(0xFF374151), Color(0xFFF3F4F6))
    }
    Surface(shape = RoundedCornerShape(6.dp), color = bg) {
        Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = fg,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
    }
}

@Composable
fun ReportStatusBadge(status: String) {
    val (label, fg, bg) = when (status.lowercase()) {
        "submitted" -> Triple("Submitted", Color(0xFF1E40AF), Color(0xFFDBEAFE))
        "approved"  -> Triple("Approved",  Color(0xFF065F46), Color(0xFFD1FAE5))
        else        -> Triple("Draft",     Color(0xFF374151), Color(0xFFF3F4F6))
    }
    Surface(shape = RoundedCornerShape(6.dp), color = bg) {
        Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = fg,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
    }
}

@Composable
fun EmptyState(icon: ImageVector, message: String, sub: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(36.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
    }
}

fun shortDate(isoStr: String): String {
    return try {
        val d = ZonedDateTime.parse(isoStr, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toLocalDate()
        val today = LocalDate.now()
        when {
            d == today          -> "Today"
            d == today.minusDays(1) -> "Yesterday"
            d.isAfter(today.minusDays(7)) -> "${today.toEpochDay() - d.toEpochDay()}d ago"
            else -> d.format(DateTimeFormatter.ofPattern("MMM d"))
        }
    } catch (e: Exception) { "" }
}

// Old StatCard kept for compilation safety — not used on Home any more
@Composable
fun StatCard(
    icon: ImageVector,
    iconColor: Color,
    iconBackground: Color,
    value: String,
    label: String,
    sublabel: String,
    trend: String? = null,
    trendUp: Boolean = true
) {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
        Row(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.Top) {
                Box(modifier = Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)).background(iconBackground), contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(28.dp))
                }
                Column {
                    Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text(sublabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                }
            }
            if (trend != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (trendUp) Icons.Filled.TrendingUp else Icons.Filled.TrendingDown, contentDescription = null, tint = if (trendUp) Color(0xFF10B981) else Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                    Text(trend, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = if (trendUp) Color(0xFF10B981) else Color(0xFFEF4444))
                }
            }
        }
    }
}

