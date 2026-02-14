package com.mafutapass.app.ui.screens

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

private val MONTHS = listOf(
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditDateOfBirthScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)

    var day by remember { mutableStateOf("") }
    var monthIndex by remember { mutableStateOf(-1) } // 0-based
    var year by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var monthExpanded by remember { mutableStateOf(false) }
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
                        val dob = profile.safeString("date_of_birth")
                        if (dob.isNotEmpty()) {
                            val parts = dob.split("-")
                            if (parts.size == 3) {
                                year = parts[0]
                                monthIndex = (parts[1].toIntOrNull() ?: 1) - 1
                                day = parts[2].trimStart('0').ifEmpty { parts[2] }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("EditDOB", "Load failed: ${e.message}")
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
        TopAppBar(
            title = { Text("Date of birth", fontWeight = FontWeight.Bold) },
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
                        "Enter your date of birth in DD/Month/YYYY format.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray500
                    )

                    // Day
                    Column {
                        Text("Day", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(
                            value = day,
                            onValueChange = { v ->
                                val digits = v.filter { it.isDigit() }
                                if (digits.length <= 2) {
                                    val d = digits.toIntOrNull()
                                    if (d == null || d in 1..31) day = digits
                                }
                            },
                            placeholder = { Text("DD") },
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

                    // Month dropdown
                    Column {
                        Text("Month", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        ExposedDropdownMenuBox(
                            expanded = monthExpanded,
                            onExpandedChange = { monthExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = if (monthIndex >= 0) MONTHS[monthIndex] else "",
                                onValueChange = {},
                                readOnly = true,
                                placeholder = { Text("Select month") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = monthExpanded) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald600,
                                    unfocusedBorderColor = Gray300,
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                            ExposedDropdownMenu(
                                expanded = monthExpanded,
                                onDismissRequest = { monthExpanded = false }
                            ) {
                                MONTHS.forEachIndexed { index, month ->
                                    DropdownMenuItem(
                                        text = { Text(month) },
                                        onClick = {
                                            monthIndex = index
                                            monthExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Year
                    Column {
                        Text("Year", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(
                            value = year,
                            onValueChange = { v ->
                                val digits = v.filter { it.isDigit() }
                                if (digits.length <= 4) year = digits
                            },
                            placeholder = { Text("YYYY") },
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

                Button(
                    onClick = {
                        if (sessionToken == null) return@Button
                        isSaving = true
                        coroutineScope.launch {
                            try {
                                withContext(Dispatchers.IO) {
                                    val d = day.padStart(2, '0')
                                    val m = (monthIndex + 1).toString().padStart(2, '0')
                                    val isoDate = "$year-$m-$d"
                                    val json = JSONObject().apply { put("date_of_birth", isoDate) }
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
                                android.util.Log.e("EditDOB", "Save failed: ${e.message}")
                            }
                            isSaving = false
                        }
                    },
                    enabled = !isSaving && day.isNotEmpty() && monthIndex >= 0 && year.length == 4,
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
