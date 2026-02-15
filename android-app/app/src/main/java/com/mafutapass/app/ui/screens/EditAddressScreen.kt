package com.mafutapass.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.auth.TokenRepository
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

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll

private val COUNTRIES = listOf("Kenya", "United States", "United Kingdom", "Canada", "Tanzania", "Uganda")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditAddressScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    var addressLine1 by remember { mutableStateOf("") }
    var addressLine2 by remember { mutableStateOf("") }
    var country by remember { mutableStateOf("Kenya") }
    var state by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var zipCode by remember { mutableStateOf("") }
    var countryExpanded by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val token = TokenRepository.getInstance(context).getValidTokenAsync()
        if (token != null) {
            try {
                val r = withContext(Dispatchers.IO) { fetchProfileData(token) }
                r?.optJSONObject("profile")?.let { p ->
                    fun JSONObject.s(k: String): String { val v = optString(k, ""); return if (v == "null" || v.isBlank()) "" else v }
                    addressLine1 = p.s("address_line1"); addressLine2 = p.s("address_line2")
                    city = p.s("city"); state = p.s("state"); zipCode = p.s("zip_code")
                    val c = p.s("country"); country = c.ifEmpty { "Kenya" }
                }
            } catch (_: Exception) {}
            isLoading = false
        } else isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize().background(AppTheme.colors.backgroundGradient)) {
        TopAppBar(title = { Text("Address", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    @Composable fun Field(lbl: String, v: String, onChange: (String) -> Unit) {
                        Column {
                            Text(lbl, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                            OutlinedTextField(value = v, onValueChange = onChange, placeholder = { Text(lbl) }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                                colors = appOutlinedTextFieldColors())
                        }
                    }
                    Field("Address line 1", addressLine1) { addressLine1 = it }
                    Field("Address line 2", addressLine2) { addressLine2 = it }
                    Column {
                        Text("Country", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        ExposedDropdownMenuBox(expanded = countryExpanded, onExpandedChange = { countryExpanded = it }) {
                            OutlinedTextField(value = country, onValueChange = {}, readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = countryExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(12.dp),
                                colors = appOutlinedTextFieldColors())
                            ExposedDropdownMenu(expanded = countryExpanded, onDismissRequest = { countryExpanded = false }) {
                                COUNTRIES.forEach { c -> DropdownMenuItem(text = { Text(c) }, onClick = { country = c; countryExpanded = false }) }
                            }
                        }
                    }
                    Field("State", state) { state = it }
                    Field("City", city) { city = it }
                    Column {
                        Text("Zip / Postcode", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = zipCode, onValueChange = { zipCode = it }, placeholder = { Text("Zip / Postcode") }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = appOutlinedTextFieldColors())
                        Text("e.g. 12345, 12345-1234", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                    }
                    Spacer(Modifier.height(8.dp))
                }
                Button(onClick = {
                    isSaving = true
                    scope.launch {
                        try {
                            val token = TokenRepository.getInstance(context).getValidTokenAsync()
                            if (token == null) { Toast.makeText(context, "Session expired. Please sign in again.", Toast.LENGTH_SHORT).show(); isSaving = false; return@launch }
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("address_line1", addressLine1.trim()); put("address_line2", addressLine2.trim()); put("city", city.trim()); put("state", state.trim()); put("zip_code", zipCode.trim()); put("country", country.trim()) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $token").build()
                                OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).build().newCall(req).execute().isSuccessful
                            }
                            if (ok) {
                                val addr = listOfNotNull(addressLine1.trim().ifEmpty { null }, city.trim().ifEmpty { null }, state.trim().ifEmpty { null }, zipCode.trim().ifEmpty { null }).joinToString(", ")
                                prefs.edit().putString("cached_address", addr).apply(); onBack()
                            } else Toast.makeText(context, "Save failed. Please try again.", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) { Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show() }
                        isSaving = false
                    }
                }, enabled = !isSaving, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, disabledContainerColor = MaterialTheme.colorScheme.outline)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
