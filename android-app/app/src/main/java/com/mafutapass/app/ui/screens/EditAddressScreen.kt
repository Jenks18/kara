package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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

private val COUNTRIES = listOf("Kenya", "United States", "United Kingdom", "Canada", "Tanzania", "Uganda")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditAddressScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)

    var addressLine1 by remember { mutableStateOf("") }
    var addressLine2 by remember { mutableStateOf("") }
    var country by remember { mutableStateOf("Kenya") }
    var state by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var zipCode by remember { mutableStateOf("") }
    var countryExpanded by remember { mutableStateOf(false) }
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
                        addressLine1 = profile.safeString("address_line1")
                        addressLine2 = profile.safeString("address_line2")
                        city = profile.safeString("city")
                        state = profile.safeString("state")
                        zipCode = profile.safeString("zip_code")
                        val c = profile.safeString("country")
                        country = c.ifEmpty { "Kenya" }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("EditAddress", "Load failed: ${e.message}")
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
            title = { Text("Address", fontWeight = FontWeight.Bold) },
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
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Address line 1
                    Column {
                        Text("Address line 1", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(
                            value = addressLine1,
                            onValueChange = { addressLine1 = it },
                            placeholder = { Text("Address line 1") },
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

                    // Address line 2
                    Column {
                        Text("Address line 2", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(
                            value = addressLine2,
                            onValueChange = { addressLine2 = it },
                            placeholder = { Text("Address line 2") },
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

                    // Country dropdown
                    Column {
                        Text("Country", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        ExposedDropdownMenuBox(
                            expanded = countryExpanded,
                            onExpandedChange = { countryExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = country,
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = countryExpanded) },
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
                                expanded = countryExpanded,
                                onDismissRequest = { countryExpanded = false }
                            ) {
                                COUNTRIES.forEach { c ->
                                    DropdownMenuItem(
                                        text = { Text(c) },
                                        onClick = {
                                            country = c
                                            countryExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // State
                    Column {
                        Text("State", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(
                            value = state,
                            onValueChange = { state = it },
                            placeholder = { Text("State") },
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

                    // City
                    Column {
                        Text("City", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(
                            value = city,
                            onValueChange = { city = it },
                            placeholder = { Text("City") },
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

                    // Zip / Postcode
                    Column {
                        Text("Zip / Postcode", style = MaterialTheme.typography.bodySmall, color = Gray700, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(
                            value = zipCode,
                            onValueChange = { zipCode = it },
                            placeholder = { Text("Zip / Postcode") },
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
                        Text(
                            "e.g. 12345, 12345-1234",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray500,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }

                    Spacer(Modifier.height(8.dp))
                }

                Button(
                    onClick = {
                        if (sessionToken == null) return@Button
                        isSaving = true
                        coroutineScope.launch {
                            try {
                                withContext(Dispatchers.IO) {
                                    val json = JSONObject().apply {
                                        put("address_line1", addressLine1.trim())
                                        put("address_line2", addressLine2.trim())
                                        put("city", city.trim())
                                        put("state", state.trim())
                                        put("zip_code", zipCode.trim())
                                        put("country", country.trim())
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
                                android.util.Log.e("EditAddress", "Save failed: ${e.message}")
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
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    }
}
