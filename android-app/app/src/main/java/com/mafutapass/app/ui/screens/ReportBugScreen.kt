package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mafutapass.app.data.ReportBugRequest
import com.mafutapass.app.di.ApiServiceEntryPoint
import com.mafutapass.app.ui.theme.AppTheme
import com.mafutapass.app.ui.theme.appOutlinedTextFieldColors
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class BugCategory(val id: String, val label: String, val description: String)

private val BUG_CATEGORIES = listOf(
    BugCategory("receipt_scanning", "Receipt scanning", "Camera, image processing, or OCR issues"),
    BugCategory("expense_reports", "Expense reports", "Creating, editing, or submitting reports"),
    BugCategory("workspaces", "Workspaces", "Team workspaces, invitations, or permissions"),
    BugCategory("account", "Account & profile", "Login, profile settings, or preferences"),
    BugCategory("performance", "Performance", "App is slow, crashes, or freezes"),
    BugCategory("display", "Display issues", "Layout problems, missing content, or visual glitches"),
    BugCategory("other", "Other", "Something else not listed above"),
)

private data class SeverityOption(val id: String, val label: String, val color: Color)

private val SEVERITY_OPTIONS = listOf(
    SeverityOption("low", "Low", Color(0xFF4CAF50)),
    SeverityOption("medium", "Medium", Color(0xFFFF9800)),
    SeverityOption("high", "High", Color(0xFFF44336)),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportBugScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val apiService = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            ApiServiceEntryPoint::class.java
        ).apiService()
    }
    var category by remember { mutableStateOf("") }
    var severity by remember { mutableStateOf("medium") }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var steps by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var isSubmitted by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    if (isSubmitted) {
        Column(modifier = Modifier.fillMaxSize().background(brush = AppTheme.colors.backgroundGradient)) {
            TopAppBar(
                title = { Text("Bug reported", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
            Column(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Surface(shape = CircleShape, color = Color(0xFFE8F5E9), modifier = Modifier.size(80.dp)) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.CheckCircle, "Success", tint = Color(0xFF4CAF50), modifier = Modifier.size(40.dp))
                    }
                }
                Spacer(Modifier.height(24.dp))
                Text("Thank you!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Your bug report has been received. Our team will investigate and work on a fix.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Our team will follow up at masomonews19@gmail.com",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(32.dp))
                Button(
                    onClick = onBack,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("Back to About", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    } else {
        Column(modifier = Modifier.fillMaxSize().background(brush = AppTheme.colors.backgroundGradient)) {
            TopAppBar(
                title = { Text("Report a bug", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )

            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Column(
                    modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    // Category selection
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Category", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

                        BUG_CATEGORIES.forEach { cat ->
                            val isSelected = category == cat.id
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surface,
                                shadowElevation = 1.dp,
                                border = androidx.compose.foundation.BorderStroke(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                                ),
                                modifier = Modifier.fillMaxWidth().clickable {
                                    category = cat.id
                                    errorMessage = null
                                }
                            ) {
                                Row(modifier = Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    // Radio button
                                    Box(
                                        modifier = Modifier
                                            .size(18.dp)
                                            .clip(CircleShape)
                                            .border(2.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, CircleShape)
                                            .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent, CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (isSelected) {
                                            Box(modifier = Modifier.size(6.dp).background(Color.White, CircleShape))
                                        }
                                    }
                                    Column {
                                        Text(cat.label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                        Text(cat.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }

                    // Severity
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Severity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SEVERITY_OPTIONS.forEach { opt ->
                                val isSelected = severity == opt.id
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isSelected) opt.color.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) opt.color.copy(alpha = 0.4f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
                                    modifier = Modifier.weight(1f).clickable { severity = opt.id }
                                ) {
                                    Text(
                                        opt.label,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isSelected) opt.color else MaterialTheme.colorScheme.onSurfaceVariant,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(vertical = 10.dp).fillMaxWidth()
                                    )
                                }
                            }
                        }
                    }

                    // Title
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Title", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        OutlinedTextField(
                            value = title,
                            onValueChange = { title = it; errorMessage = null },
                            placeholder = { Text("Brief summary of the issue") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSubmitting,
                            colors = appOutlinedTextFieldColors()
                        )
                    }

                    // Description
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Description", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        OutlinedTextField(
                            value = description,
                            onValueChange = { description = it; errorMessage = null },
                            placeholder = { Text("What happened? What did you expect to happen instead?") },
                            modifier = Modifier.fillMaxWidth().height(120.dp),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSubmitting,
                            colors = appOutlinedTextFieldColors()
                        )
                    }

                    // Steps to reproduce (optional)
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Steps to reproduce", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("(optional)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        OutlinedTextField(
                            value = steps,
                            onValueChange = { steps = it },
                            placeholder = { Text("1. Go to...\n2. Tap on...\n3. See error...") },
                            modifier = Modifier.fillMaxWidth().height(100.dp),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSubmitting,
                            colors = appOutlinedTextFieldColors()
                        )
                    }

                    // Error
                    errorMessage?.let { error ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f))
                        ) {
                            Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                        }
                    }

                    Spacer(Modifier.height(80.dp))
                }

                // Fixed bottom submit button
                Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 8.dp) {
                    Button(
                        onClick = {
                            if (category.isBlank()) {
                                errorMessage = "Please select a bug category"
                                return@Button
                            }
                            if (title.isBlank()) {
                                errorMessage = "Please provide a brief title"
                                return@Button
                            }
                            if (description.isBlank()) {
                                errorMessage = "Please describe the issue"
                                return@Button
                            }
                            isSubmitting = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    val profilePrefs = context.getSharedPreferences("kacha_profile_cache_v1", android.content.Context.MODE_PRIVATE)
                                    val email = profilePrefs.getString("email", "") ?: ""
                                    val userId = profilePrefs.getString("id", "") ?: ""

                                    val response = withContext(Dispatchers.IO) {
                                        apiService.reportBug(
                                            ReportBugRequest(
                                                category = category,
                                                severity = severity,
                                                title = title.trim(),
                                                description = description.trim(),
                                                stepsToReproduce = steps.trim(),
                                                userEmail = email,
                                                userId = userId
                                            )
                                        )
                                    }

                                    isSubmitting = false
                                    if (response.isSuccessful) {
                                        isSubmitted = true
                                    } else {
                                        errorMessage = "Failed to submit report. Please try again or email masomonews19@gmail.com"
                                    }
                                } catch (e: Exception) {
                                    isSubmitting = false
                                    errorMessage = "Failed to submit report. Please check your connection and try again."
                                }
                            }
                        },
                        enabled = !isSubmitting && category.isNotBlank() && title.isNotBlank() && description.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().padding(16.dp).height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            disabledContainerColor = MaterialTheme.colorScheme.outline
                        )
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(Modifier.size(20.dp), MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                        } else {
                            Text("Submit Bug Report", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }
        }
    }
}
