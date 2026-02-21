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
import androidx.compose.material.icons.filled.Warning
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
import com.mafutapass.app.data.ReportSuspiciousActivityRequest
import com.mafutapass.app.di.ApiServiceEntryPoint
import com.mafutapass.app.ui.theme.AppTheme
import com.mafutapass.app.ui.theme.appOutlinedTextFieldColors
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ActivityType(val id: String, val label: String, val description: String)

private val ACTIVITY_TYPES = listOf(
    ActivityType("unauthorized_login", "Unauthorized login", "Someone accessed my account without my knowledge"),
    ActivityType("unknown_transactions", "Unknown transactions", "I see receipts or expenses I did not create"),
    ActivityType("profile_changes", "Unexpected profile changes", "My profile details were changed without my consent"),
    ActivityType("suspicious_email", "Suspicious emails", "I received unusual emails claiming to be from Kacha"),
    ActivityType("workspace_access", "Unauthorized workspace access", "Someone joined or modified my workspace without permission"),
    ActivityType("other", "Other", "Something else seems off with my account"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportSuspiciousActivityScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val apiService = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            ApiServiceEntryPoint::class.java
        ).apiService()
    }
    var selectedTypes by remember { mutableStateOf(setOf<String>()) }
    var description by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var isSubmitted by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val amberBg = Color(0xFFFFF8E1)
    val amberBorder = Color(0xFFFFE082)
    val amberText = Color(0xFF8C6A00)

    if (isSubmitted) {
        // Success state
        Column(modifier = Modifier.fillMaxSize().background(brush = AppTheme.colors.backgroundGradient)) {
            TopAppBar(
                title = { Text("Report submitted", fontWeight = FontWeight.Bold) },
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
                Text("Thank you for reporting", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Our security team will review your report and take appropriate action.",
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
                    Text("Back to Security", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    } else {
        Column(modifier = Modifier.fillMaxSize().background(brush = AppTheme.colors.backgroundGradient)) {
            TopAppBar(
                title = { Text("Report suspicious activity", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )

            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column(
                    modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    // Warning banner
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = amberBg,
                        border = androidx.compose.foundation.BorderStroke(1.dp, amberBorder)
                    ) {
                        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Filled.Warning, "Warning", tint = Color(0xFFFF8F00), modifier = Modifier.size(20.dp))
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    "If you believe your account has been compromised, change your password immediately.",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    color = amberText
                                )
                                Text(
                                    "You can do this through your sign-in provider settings.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = amberText.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }

                    // Activity type selection
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("What type of activity did you notice?", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("Select all that apply.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                        ACTIVITY_TYPES.forEach { type ->
                            val isSelected = selectedTypes.contains(type.id)
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surface,
                                shadowElevation = 1.dp,
                                border = androidx.compose.foundation.BorderStroke(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                                ),
                                modifier = Modifier.fillMaxWidth().clickable {
                                    selectedTypes = if (isSelected) selectedTypes - type.id else selectedTypes + type.id
                                    errorMessage = null
                                }
                            ) {
                                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent)
                                            .border(2.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, RoundedCornerShape(4.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (isSelected) {
                                            Text("\u2713", color = Color.White, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Column {
                                        Text(type.label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                        Text(type.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }

                    // Description
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Describe what happened", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("Include dates, times, and any other relevant details.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = description,
                            onValueChange = { description = it; errorMessage = null },
                            placeholder = { Text("I noticed unusual activity on my account when...") },
                            modifier = Modifier.fillMaxWidth().height(150.dp),
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
                Surface(color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f), shadowElevation = 8.dp) {
                    Button(
                        onClick = {
                            if (selectedTypes.isEmpty()) {
                                errorMessage = "Please select at least one type of suspicious activity"
                                return@Button
                            }
                            if (description.isBlank()) {
                                errorMessage = "Please describe what happened"
                                return@Button
                            }
                            isSubmitting = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    val profilePrefs = context.getSharedPreferences("kacha_profile_cache_v1", android.content.Context.MODE_PRIVATE)
                                    val email = profilePrefs.getString("email", "") ?: ""
                                    val usrId = profilePrefs.getString("id", "") ?: ""

                                    val response = withContext(Dispatchers.IO) {
                                        apiService.reportSuspiciousActivity(
                                            ReportSuspiciousActivityRequest(
                                                activityTypes = selectedTypes.toList(),
                                                description = description.trim(),
                                                userEmail = email,
                                                userId = usrId
                                            )
                                        )
                                    }

                                    isSubmitting = false
                                    if (response.isSuccessful) {
                                        isSubmitted = true
                                    } else {
                                        errorMessage = "Failed to submit report. Please try again or contact masomonews19@gmail.com"
                                    }
                                } catch (e: Exception) {
                                    isSubmitting = false
                                    errorMessage = "Failed to submit report. Please check your connection and try again."
                                }
                            }
                        },
                        enabled = !isSubmitting && selectedTypes.isNotEmpty() && description.isNotBlank(),
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
                            Text("Submit Report", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }
        }
    }
}
