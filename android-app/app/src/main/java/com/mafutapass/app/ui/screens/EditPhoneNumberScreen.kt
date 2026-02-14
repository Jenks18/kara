package com.mafutapass.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
fun EditPhoneNumberScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)

    var phoneDigits by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

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
                        val num = profile.safeString("phone_number").replace(Regex("[\\s\\-]"), "")
                        phoneDigits = when {
                            num.startsWith("+254") -> num.substring(4)
                            num.startsWith("254") -> num.substring(3)
                            num.startsWith("0") -> num.substring(1)
                            else -> num
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("EditPhone", "Load failed: ${e.message}")
            }
            isLoading = false
        } else {
            isLoading = false
        }
    }

    // Validation
    val isValid = phoneDigits.length == 9 && (phoneDigits.startsWith("7") || phoneDigits.startsWith("1"))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))
    ) {
        TopAppBar(
            title = { Text("Phone number", fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
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
                        "Enter your 9-digit Kenyan mobile number",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray500
                    )

                    Column {
                        Text(
                            "Phone number",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray700,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            // Fixed +254 prefix
                            Surface(
                                shape = RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp),
                                color = Color(0xFFF9FAFB),
                                border = BorderStroke(1.dp, Gray300),
                                modifier = Modifier.height(56.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text("🇰🇪", fontSize = 20.sp)
                                    Text("+254", fontWeight = FontWeight.Medium, color = Gray700)
                                }
                            }
                            // Phone input
                            OutlinedTextField(
                                value = phoneDigits,
                                onValueChange = { v ->
                                    val digits = v.filter { it.isDigit() }
                                    if (digits.length <= 9) phoneDigits = digits
                                },
                                placeholder = { Text("712345678") },
                                singleLine = true,
                                enabled = !isSaving,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(topEnd = 12.dp, bottomEnd = 12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald600,
                                    unfocusedBorderColor = Gray300,
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                        }

                        if (phoneDigits.isNotEmpty() && !isValid) {
                            Text(
                                if (phoneDigits.length < 9) "Enter exactly 9 digits"
                                else "Number must start with 7 or 1",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFFDC2626),
                                modifier = Modifier.padding(top = 6.dp)
                            )
                        }
                    }
                }

                Button(
                    onClick = {
                        if (sessionToken == null) return@Button
                        isSaving = true
                        coroutineScope.launch {
                            try {
                                withContext(Dispatchers.IO) {
                                    val fullNumber = if (phoneDigits.isNotBlank()) "+254${phoneDigits.trim()}" else ""
                                    val json = JSONObject().apply { put("phone_number", fullNumber) }
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
                                android.util.Log.e("EditPhone", "Save failed: ${e.message}")
                            }
                            isSaving = false
                        }
                    },
                    enabled = !isSaving && (isValid || phoneDigits.isEmpty()),
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
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    }
}
