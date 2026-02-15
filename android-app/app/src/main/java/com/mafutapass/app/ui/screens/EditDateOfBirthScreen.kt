package com.mafutapass.app.ui.screens

import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.auth.TokenManager
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

private val MONTHS = listOf("January","February","March","April","May","June","July","August","September","October","November","December")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditDateOfBirthScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    var day by remember { mutableStateOf("") }
    var monthIndex by remember { mutableStateOf(-1) }
    var year by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var monthExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val token = TokenManager.getValidToken(context)
        if (token != null) {
            try {
                val r = withContext(Dispatchers.IO) { fetchProfileData(token) }
                r?.optJSONObject("profile")?.let { p ->
                    fun JSONObject.s(k: String): String { val v = optString(k, ""); return if (v == "null" || v.isBlank()) "" else v }
                    val dob = p.s("date_of_birth")
                    if (dob.isNotEmpty()) { val parts = dob.split("-"); if (parts.size == 3) { year = parts[0]; monthIndex = (parts[1].toIntOrNull() ?: 1) - 1; day = parts[2].trimStart('0').ifEmpty { parts[2] } } }
                }
            } catch (_: Exception) {}
            isLoading = false
        } else isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(title = { Text("Date of birth", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Emerald600) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Enter your date of birth in DD/Month/YYYY format.", style = MaterialTheme.typography.bodyMedium, color = Gray500)
                    Column {
                        Text("Day", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = day, onValueChange = { v -> val d = v.filter { it.isDigit() }; if (d.length <= 2) { val n = d.toIntOrNull(); if (n == null || n in 1..31) day = d } },
                            placeholder = { Text("DD") }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                    }
                    Column {
                        Text("Month", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        ExposedDropdownMenuBox(expanded = monthExpanded, onExpandedChange = { monthExpanded = it }) {
                            OutlinedTextField(value = if (monthIndex >= 0) MONTHS[monthIndex] else "", onValueChange = {}, readOnly = true,
                                placeholder = { Text("Select month") }, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = monthExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                            ExposedDropdownMenu(expanded = monthExpanded, onDismissRequest = { monthExpanded = false }) {
                                MONTHS.forEachIndexed { i, m -> DropdownMenuItem(text = { Text(m) }, onClick = { monthIndex = i; monthExpanded = false }) }
                            }
                        }
                    }
                    Column {
                        Text("Year", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = year, onValueChange = { v -> val d = v.filter { it.isDigit() }; if (d.length <= 4) year = d },
                            placeholder = { Text("YYYY") }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                    }
                }
                Button(onClick = {
                    isSaving = true
                    scope.launch {
                        try {
                            val token = TokenManager.getValidToken(context)
                            if (token == null) { Toast.makeText(context, "Session expired. Please sign in again.", Toast.LENGTH_SHORT).show(); isSaving = false; return@launch }
                            val d = day.padStart(2, '0'); val m = (monthIndex + 1).toString().padStart(2, '0'); val isoDate = "$year-$m-$d"
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("date_of_birth", isoDate) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $token").build()
                                OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).build().newCall(req).execute().isSuccessful
                            }
                            if (ok) { prefs.edit().putString("cached_dob", "$year-$m-$d").apply(); onBack() }
                            else Toast.makeText(context, "Save failed. Please try again.", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) { Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show() }
                        isSaving = false
                    }
                }, enabled = !isSaving && day.isNotEmpty() && monthIndex >= 0 && year.length == 4, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Emerald600, disabledContainerColor = Gray300)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), Color.White, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
