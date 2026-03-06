
package com.mafutapass.app.ui.screens

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.ExpenseItem
import com.mafutapass.app.data.ExpenseReport
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.CurrencyFormatter
import com.mafutapass.app.util.DateUtils
import com.mafutapass.app.viewmodel.ReportsViewModel

@Composable
fun ReportsScreen(
    onNavigateToExpenseDetail: (String) -> Unit = {},
    onNavigateToReportDetail: (String) -> Unit = {},
    initialTab: Int = 0,
    highlightReportId: String? = null,
    viewModel: ReportsViewModel = hiltViewModel()
) {
    var selectedTab by rememberSaveable { mutableIntStateOf(initialTab) }
    val tabs = listOf("Expenses", "Reports")

    val expenses by viewModel.expenseItems.collectAsState()
    val reports by viewModel.expenseReports.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    // newlyCompletedId fires when BackgroundScanService finishes uploading an expense.
    // We apply the halo for 3 s then clear it so it only pulses once.
    val newlyCompletedId by viewModel.newlyCompletedExpenseId.collectAsState()

    // Track which expense to highlight — seeded from nav arg (legacy) or background upload signal.
    var activeHighlightId by remember { mutableStateOf(highlightReportId) }

    LaunchedEffect(highlightReportId) {
        if (highlightReportId != null) {
            activeHighlightId = highlightReportId
            kotlinx.coroutines.delay(1500)
            activeHighlightId = null
        }
    }

    LaunchedEffect(newlyCompletedId) {
        if (newlyCompletedId != null) {
            // Switch to Expenses tab so the user sees their newly uploaded receipt.
            selectedTab = 0
            activeHighlightId = newlyCompletedId
            viewModel.clearNewlyCompleted()
            // Refresh from server to pick up latest data
            viewModel.refresh()
            kotlinx.coroutines.delay(1500)
            activeHighlightId = null
        }
    }

    // Auto-refresh when this screen re-enters composition (e.g. after scanning)
    LaunchedEffect(Unit) {
        viewModel.refresh()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        // Header
        Surface(
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 1.dp
        ) {
            Column(modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Reports",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = "Refresh",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                // Summary pills: Total Spent + KRA Verified
                SummaryPills(
                    totalSpent = expenses.sumOf { it.amount },
                    kraVerifiedCount = expenses.count { it.kraVerified == true }
                )

                // Segmented Control (iOS-style)
                Row(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), RoundedCornerShape(14.dp))
                        .padding(6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    tabs.forEachIndexed { index, title ->
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .then(
                                    if (selectedTab == index) {
                                        Modifier
                                            .background(
                                                brush = AppTheme.colors.primaryGradient,
                                                shape = RoundedCornerShape(10.dp)
                                            )
                                    } else {
                                        Modifier
                                            .background(
                                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                                                shape = RoundedCornerShape(10.dp)
                                            )
                                    }
                                )
                                .border(
                                    1.dp,
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { selectedTab = index }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = title,
                                color = if (selectedTab == index) Color.White else MaterialTheme.colorScheme.primary,
                                fontWeight = if (selectedTab == index) FontWeight.SemiBold else FontWeight.Medium,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
            }
        }

        // Content
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else if (selectedTab == 0) {
            ExpensesTab(expenses, onNavigateToExpenseDetail, activeHighlightId)
        } else {
            ReportsTab(reports, onNavigateToReportDetail)
        }
    }
}

@Composable
fun ExpensesTab(expenses: List<ExpenseItem>, onNavigateToDetail: (String) -> Unit = {}, highlightReportId: String? = null) {
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
            items(expenses, key = { it.id }) { expense ->
                val isNew = highlightReportId != null &&
                    (expense.reportId == highlightReportId || expense.id == highlightReportId)
                ExpenseCard(expense, onNavigateToDetail, isNew = isNew)
            }
        }
    }
}

@Composable
fun ReportsTab(reports: List<ExpenseReport>, onNavigateToDetail: (String) -> Unit = {}) {
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
            items(reports, key = { it.id }) { report ->
                ReportCard(report, onNavigateToDetail)
            }
        }
    }
}

@Composable
fun ExpenseCard(expense: ExpenseItem, onNavigateToDetail: (String) -> Unit = {}, isNew: Boolean = false) {
    val displayDate = DateUtils.formatMedium(expense.transactionDate ?: expense.createdAt)

    val needsReview = expense.processingStatus == "error" || expense.processingStatus == "needs_review"
    val isScanning = expense.processingStatus == "scanning"

    // Halo: pulse border alpha between 0.3 and 1.0 when isNew, invisible otherwise.
    // rememberInfiniteTransition is always created (composables must not be called conditionally)
    // but only its value is used when isNew = true.
    val infiniteTransition = rememberInfiniteTransition(label = "halo")
    val haloPulse by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600),
            repeatMode = RepeatMode.Reverse
        ),
        label = "haloAlpha"
    )
    val haloAlpha = if (isNew) haloPulse else 0f
    val haloColor = MaterialTheme.colorScheme.primary.copy(alpha = haloAlpha)

    val accentColor = when {
        isScanning -> MaterialTheme.colorScheme.onSurfaceVariant
        else -> MaterialTheme.colorScheme.primary
    }

    val scanningBorderColor = Color(0xFF1A3A5C)
    val borderModifier = when {
        isNew      -> Modifier.border(2.dp, haloColor, RoundedCornerShape(12.dp))
        isScanning -> Modifier.border(1.5.dp, scanningBorderColor, RoundedCornerShape(12.dp))
        else       -> Modifier
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (isScanning) Color(0xFF0D1F2D) else MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .then(borderModifier)
            .clickable { onNavigateToDetail(expense.id) }
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // ── Top row: workspace name + View chip ───────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (expense.workspaceName.isNotBlank()) {
                    // Workspace avatar (image, emoji, or initials)
                    val avatarUrl = expense.workspaceAvatar
                    if (avatarUrl != null && avatarUrl.startsWith("http")) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current).data(avatarUrl).crossfade(true).build(),
                            contentDescription = expense.workspaceName,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(20.dp).clip(CircleShape)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                expense.workspaceName.firstOrNull()?.uppercaseChar()?.toString() ?: "W",
                                fontSize = 10.sp,
                                lineHeight = 10.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = expense.workspaceName,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
                // "View" chip
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.2f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.25f)),
                    onClick = { onNavigateToDetail(expense.id) }
                ) {
                    Text(
                        "View",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // ── Main row: thumbnail · merchant+meta · amount ──────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Receipt thumbnail or placeholder
                val imageUrl = expense.imageUrl
                if (!imageUrl.isNullOrBlank() && imageUrl.startsWith("http")) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current).data(imageUrl).crossfade(true).build(),
                        contentDescription = "Receipt",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(52.dp).clip(RoundedCornerShape(8.dp)).background(Color.Black)
                    )
                } else {
                    Box(
                        modifier = Modifier.size(52.dp).clip(RoundedCornerShape(8.dp)).background(Color.Black),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!isScanning) {
                            Icon(Icons.Filled.Receipt, null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f), modifier = Modifier.size(22.dp))
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Merchant + meta
                Column(modifier = Modifier.weight(1f)) {
                    // Date row
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        if (displayDate.isNotEmpty()) {
                            Text(displayDate, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("·", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("Cash", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    // Merchant name
                    if (isScanning) {
                        Text("Scanning...", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
                    } else {
                        Text(
                            expense.cleanMerchantName() ?: "Unknown Merchant",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = accentColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Amount
                if (isScanning) {
                    Text("Scanning...", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                } else {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(CurrencyFormatter.formatSimple(expense.amount), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = accentColor)
                        if (expense.kraVerified == true) {
                            Spacer(modifier = Modifier.height(3.dp))
                            Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                                Row(Modifier.padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                    Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(10.dp))
                                    Text("KRA", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary, fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }
            }

            // ── Category chip ─────────────────────────────────────────────────
            if (!isScanning && expense.category.isNotBlank() && expense.category != "Uncategorized") {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Folder, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(expense.category.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // ── Error / needs-review message ─────────────────────────────────
            if (needsReview) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(modifier = Modifier.size(8.dp).padding(top = 4.dp).clip(CircleShape).background(MaterialTheme.colorScheme.error))
                    Text(
                        text = buildString {
                            if (expense.cleanMerchantName() == null) append("Missing merchant. ")
                            append("Receipt scanning failed. Enter details manually.")
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error.copy(alpha = 0.9f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Description preview removed — cleaner card design
        }
    }
}
@Composable
fun ReportCard(report: ExpenseReport, onNavigateToDetail: (String) -> Unit = {}) {
    val context = LocalContext.current

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onNavigateToDetail(report.id) }
    ) {
        Column(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxWidth()
        ) {
            // ── Top row: workspace avatar + name ··· View chip ────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (report.workspaceName.isNotBlank()) {
                    val avatarUrl = report.workspaceAvatar
                    if (avatarUrl != null && avatarUrl.startsWith("http")) {
                        AsyncImage(
                            model = ImageRequest.Builder(context).data(avatarUrl).crossfade(true).build(),
                            contentDescription = report.workspaceName,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(20.dp).clip(CircleShape)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                report.workspaceName.firstOrNull()?.uppercaseChar()?.toString() ?: "W",
                                fontSize = 10.sp, lineHeight = 10.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = report.workspaceName,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
                // "View" chip
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.2f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.25f)),
                    onClick = { onNavigateToDetail(report.id) }
                ) {
                    Text(
                        "View",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // ── Title row: report name + item count ··· amount ────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = report.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "${report.itemsCount} item${if (report.itemsCount != 1) "s" else ""}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Amount
                if (report.totalAmount > 0) {
                    Text(
                        text = CurrencyFormatter.formatSimple(report.totalAmount),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                } else {
                    Text(
                        text = "—",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Normal,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ── Filmstrip row (below title) ───────────────────────────────────
            if (report.thumbnails.isNotEmpty()) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy((-8).dp)
                ) {
                    report.thumbnails.take(3).forEach { url ->
                        if (url.startsWith("http")) {
                            AsyncImage(
                                model = ImageRequest.Builder(context).data(url).crossfade(true).build(),
                                contentDescription = "Receipt",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(MaterialTheme.colorScheme.background)
                            )
                        }
                    }
                    if (report.thumbnails.size > 3) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "+${report.thumbnails.size - 3}",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else {
                Box(
                    modifier = Modifier.size(44.dp).clip(RoundedCornerShape(6.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.Folder, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f), modifier = Modifier.size(22.dp))
                }
            }

            // ── Status badge row ──────────────────────────────────────────────
            if (report.status != "draft") {
                Spacer(modifier = Modifier.height(8.dp))
                val statusColor = when (report.status) {
                    "approved" -> MaterialTheme.colorScheme.primary
                    "submitted" -> Color(0xFF2563EB)
                    "rejected" -> MaterialTheme.colorScheme.error
                    else -> Color(0xFFE6A817)
                }
                val statusLabel = report.status.replaceFirstChar { it.uppercase() }
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = statusColor.copy(alpha = 0.12f)
                ) {
                    Text(
                        text = statusLabel,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = statusColor,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun SummaryPills(totalSpent: Double, kraVerifiedCount: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                brush = Brush.linearGradient(listOf(Blue500, Blue600)),
                shape = RoundedCornerShape(14.dp)
            )
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Total Spent
        Column {
            Text(
                text = "Total Spent",
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.9f)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = CurrencyFormatter.formatSimple(totalSpent),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
        // KRA Verified
        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "KRA Verified",
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.9f)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .background(
                        Color.White.copy(alpha = 0.2f),
                        RoundedCornerShape(10.dp)
                    )
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "$kraVerifiedCount",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
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
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
