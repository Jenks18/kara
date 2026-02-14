package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditDisplayNameScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)

    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    // Load existing data
    LaunchedEffect(sessionToken) {
        if (sessionToken != null) {
            try {
                val result = withContext(Dispatchers.IO) { fetchProfileData(sessionToken) }
                if (result != null) {
                    val profile = result.optJSONObject("profile")
                    fun JSONObject.safeString(key: String): String {
                        val v = optString(key, "")
                        return if (v == "null" || v.isBlank()) "" else v
                    }
                    if (profile != null) {
                        val fn = profile.safeString("first_name")
                        val ln = profile.safeString("last_name")
                        if (fn.isNotEmpty() || ln.isNotEmpty()) {
                            firstName = fn
                            lastName = ln
                        } else {
                            val display = profile.safeString("display_name")
                            val parts = display.trim().split(" ", limit = 2)
                            if (parts.size >= 2) {
                                firstName = parts[0]
                                lastName = parts[1]
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("EditDisplayName", "Load failed: ${e.message}")
            }
            isLoading = false
        } else {
            isLoading = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))
    ) {
        // Header
        TopAppBar(
            title = {
                Text("Display name", fontWeight = FontWeight.Bold)
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Emerald600)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        "Your display name is shown on your profile.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray500
                    )

                    // First name
                    Column {
                        Text(
                            "First name",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray700,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        OutlinedTextField(
                            value = firstName,
                            onValueChange = { firstName = it },
                            placeholder = { Text("First name") },
                            singleLine = true,
                            enabled = !isSaving,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald600,
                                unfocusedBorderColor = Gray300,
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White
                            )
                        )
                    }

                    // Last name
                    Column {
                        Text(
                            "Last name",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray700,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        OutlinedTextField(
                            value = lastName,
                            onValueChange = { lastName = it },
                            placeholder = { Text("Last name") },
                            singleLine = true,
                            enabled = !isSaving,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald600,
                                unfocusedBorderColor = Gray300,
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White
                            )
                        )
                    }
                }

                // Save button at bottom
                Button(
                    onClick = {
                        if (sessionToken == null) return@Button
                        isSaving = true
                        coroutineScope.launch {
                            try {
                                withContext(Dispatchers.IO) {
                                    val json = JSONObject().apply {
                                        put("first_name", firstName.trim())
                                        put("last_name", lastName.trim())
                                        put("display_name", "${firstName.trim()} ${lastName.trim()}".trim())
                                    }
                                    val body = json.toString().toRequestBody("application/json".toMediaType())
                                    val request = Request.Builder()
                                        .url("https://www.mafutapass.com/api/auth/mobile-profile")
                                        .patch(body)
                                        .addHeader("Authorization", "Bearer $sessionToken")
                                        .build()
                                    OkHttpClient.Builder()
                                        .connectTimeout(15, TimeUnit.SECONDS)
                                        .readTimeout(15, TimeUnit.SECONDS)
                                        .build()
                                        .newCall(request).execute()
                                }
                                onBack()
                            } catch (e: Exception) {
                                android.util.Log.e("EditDisplayName", "Save failed: ${e.message}")
                            }
                            isSaving = false
                        }
                    },
                    enabled = !isSaving,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Emerald600,
                        disabledContainerColor = Gray300
                    )
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    }
}
