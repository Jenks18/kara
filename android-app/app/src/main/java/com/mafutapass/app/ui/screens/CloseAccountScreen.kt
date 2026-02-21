package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.mafutapass.app.data.DeleteAccountRequest
import com.mafutapass.app.di.ApiServiceEntryPoint
import com.mafutapass.app.ui.theme.AppTheme
import com.mafutapass.app.ui.theme.appOutlinedTextFieldColors
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CloseAccountScreen(
    onBack: () -> Unit,
    onAccountDeleted: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val apiService = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            ApiServiceEntryPoint::class.java
        ).apiService()
    }
    var reason by remember { mutableStateOf("") }
    var confirmText by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var isSubmitted by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val profilePrefs = context.getSharedPreferences("kacha_profile_cache_v1", android.content.Context.MODE_PRIVATE)
    val userEmail = profilePrefs.getString("email", "") ?: ""

    val confirmationMatches = confirmText.equals("delete my account", ignoreCase = true)

    if (isSubmitted) {
        // Success state - auto sign out after 2 seconds
        LaunchedEffect(Unit) {
            delay(2000)
            onAccountDeleted()
        }
        Column(modifier = Modifier.fillMaxSize().background(brush = AppTheme.colors.backgroundGradient)) {
            TopAppBar(
                title = { Text("Account deleted", fontWeight = FontWeight.Bold) },
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
                Text("Request Submitted", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Your account deletion has been processed. All your data has been permanently deleted.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    userEmail,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "You have been signed out. If you have any questions, please contact us at masomonews19@gmail.com",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize().background(brush = AppTheme.colors.backgroundGradient)) {
        TopAppBar(
            title = { Text("Delete My Account", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Warning banner
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f))
            ) {
                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Filled.Warning, "Warning", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(24.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("This action cannot be undone", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.error)
                        Text(
                            "Deleting your account will permanently remove all your data from Kacha. This includes your profile, receipts, expense reports, and workspace memberships.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // What gets deleted
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("What data will be deleted?", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    DeletionItem("Profile Information", "Your name, email, phone number, and profile settings")
                    DeletionItem("Receipt Data", "All uploaded receipts and their associated images")
                    DeletionItem("Expense Reports", "All expense reports and expense items")
                    DeletionItem("Workspace Memberships", "Your access to all workspaces")
                    DeletionItem("Account Authentication", "Your login credentials and sessions")
                }
            }

            // Data retention
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Data retention", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("After you request account deletion:", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    RetentionItem("Your account and all data will be ", "permanently deleted immediately")
                    RetentionItem("You will be signed out automatically", null)
                    RetentionItem("This action ", "cannot be undone", " \u2014 all receipts, reports, and data will be lost")
                    RetentionItem("Anonymized analytics data may be retained for service improvement", null)
                }
            }

            // Request account deletion section
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Request account deletion", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

                    // Account to be deleted info box
                    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)) {
                        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                            Text("Account to be deleted:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(userEmail, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    // Reason (Optional)
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Why are you leaving? (Optional)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                        OutlinedTextField(
                            value = reason,
                            onValueChange = { reason = it },
                            placeholder = { Text("Help us improve by sharing your feedback...") },
                            modifier = Modifier.fillMaxWidth().height(100.dp),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSubmitting,
                            colors = appOutlinedTextFieldColors()
                        )
                    }

                    // Confirmation
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            buildAnnotatedString {
                                append("Type ")
                                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("DELETE MY ACCOUNT") }
                                append(" to confirm")
                            },
                            style = MaterialTheme.typography.titleSmall
                        )
                        OutlinedTextField(
                            value = confirmText,
                            onValueChange = { confirmText = it; errorMessage = null },
                            placeholder = { Text("DELETE MY ACCOUNT") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSubmitting,
                            colors = appOutlinedTextFieldColors()
                        )
                    }

                    // Error message
                    errorMessage?.let { error ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f))
                        ) {
                            Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                        }
                    }

                    // Delete button
                    Button(
                        onClick = {
                            if (!confirmationMatches) {
                                errorMessage = "Please type \"DELETE MY ACCOUNT\" exactly to confirm"
                                return@Button
                            }
                            isSubmitting = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    val response = withContext(Dispatchers.IO) {
                                        apiService.deleteAccount(
                                            DeleteAccountRequest(
                                                email = userEmail,
                                                reason = reason
                                            )
                                        )
                                    }

                                    isSubmitting = false
                                    if (response.isSuccessful) {
                                        isSubmitted = true
                                    } else {
                                        errorMessage = "Failed to delete account. Please try again or contact masomonews19@gmail.com"
                                    }
                                } catch (e: Exception) {
                                    isSubmitting = false
                                    errorMessage = "Failed to delete account. Please check your connection and try again."
                                }
                            }
                        },
                        enabled = !isSubmitting && confirmationMatches,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            disabledContainerColor = MaterialTheme.colorScheme.outline
                        )
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(Modifier.size(20.dp), MaterialTheme.colorScheme.onError, strokeWidth = 2.dp)
                        } else {
                            Text("Delete My Account", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }

            // Support contact
            Text(
                "Need help? Contact us at masomonews19@gmail.com",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
            )

            Spacer(Modifier.height(60.dp))
        }
    }
}

@Composable
private fun DeletionItem(title: String, description: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primary, modifier = Modifier.size(6.dp).offset(y = 7.dp)) {}
        Column {
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun RetentionItem(prefix: String, boldPart: String?, suffix: String? = null) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primary, modifier = Modifier.size(6.dp).offset(y = 7.dp)) {}
        Text(
            buildAnnotatedString {
                append(prefix)
                if (boldPart != null) {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(boldPart) }
                }
                if (suffix != null) {
                    append(suffix)
                }
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
