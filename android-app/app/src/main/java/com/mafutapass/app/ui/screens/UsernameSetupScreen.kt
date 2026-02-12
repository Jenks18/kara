package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafutapass.app.ui.theme.*

@Composable
fun GoogleUsernameSetupScreen(
    firstName: String,
    lastName: String,
    email: String,
    onComplete: (String) -> Unit,
    pending: Boolean = false,
    errorMessage: String? = null
) {
    var username by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFFECFDF5),
                        Color(0xFFD1FAE5),
                        Color(0xFFECFDF5)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Choose a username to complete your setup",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = Gray900,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Username field
                    OutlinedTextField(
                        value = username,
                        onValueChange = { newValue ->
                            // Only allow alphanumeric and underscore
                            username = newValue.lowercase().filter { it.isLetterOrDigit() || it == '_' }
                        },
                        label = { Text("Username *") },
                        placeholder = { Text("Choose your username") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Emerald600,
                            focusedLabelColor = Emerald600,
                            cursorColor = Emerald600
                        ),
                        enabled = !pending,
                        supportingText = {
                            Text(
                                text = "Lowercase letters, numbers, and underscores only",
                                style = MaterialTheme.typography.bodySmall,
                                color = Gray500
                            )
                        }
                    )
                    
                    // Error message
                    if (errorMessage != null) {
                        Text(
                            text = errorMessage,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Continue button
                    Button(
                        onClick = {
                            android.util.Log.d("GoogleUsernameSetupScreen", "Continue button clicked")
                            android.util.Log.d("GoogleUsernameSetupScreen", "Username: '$username'")
                            
                            if (username.isNotBlank() && username.length >= 3) {
                                android.util.Log.d("GoogleUsernameSetupScreen", "✅ Calling onComplete...")
                                onComplete(username.trim())
                            } else {
                                android.util.Log.e("GoogleUsernameSetupScreen", "❌ Username invalid")
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Emerald600
                        ),
                        shape = RoundedCornerShape(8.dp),
                        enabled = !pending && username.isNotBlank() && username.length >= 3
                    ) {
                        if (pending) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = "Continue",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }
    }
}
