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
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(sessionToken) {
        if (sessionToken != null) {
            try {
                val r = withContext(Dispatchers.IO) { fetchProfileData(sessionToken) }
                r?.optJSONObject("profile")?.let { p ->
                    fun JSONObject.s(k: String): String { val v = optString(k, ""); return if (v == "null" || v.isBlank()) "" else v }
                    val fn = p.s("first_name"); val ln = p.s("last_name")
                    if (fn.isNotEmpty() || ln.isNotEmpty()) { firstName = fn; lastName = ln }
                    else { val parts = p.s("display_name").trim().split(" ", limit = 2); if (parts.size >= 2) { firstName = parts[0]; lastName = parts[1] } }
                }
            } catch (_: Exception) {}
            isLoading = false
        } else isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(title = { Text("Display name", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Emerald600) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Your display name is shown on your profile.", style = MaterialTheme.typography.bodyMedium, color = Gray500)
                    Column {
                        Text("First name", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = firstName, onValueChange = { firstName = it }, placeholder = { Text("First name") },
                            singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                    }
                    Column {
                        Text("Last name", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = lastName, onValueChange = { lastName = it }, placeholder = { Text("Last name") },
                            singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                    }
                }
                Button(onClick = {
                    if (sessionToken == null) return@Button
                    isSaving = true
                    scope.launch {
                        try {
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("first_name", firstName.trim()); put("last_name", lastName.trim()); put("display_name", "${firstName.trim()} ${lastName.trim()}".trim()) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $sessionToken").build()
                                val resp = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).build().newCall(req).execute()
                                resp.isSuccessful
                            }
                            if (ok) {
                                prefs.edit().putString("cached_display_name", "${firstName.trim()} ${lastName.trim()}".trim()).apply()
                                onBack()
                            } else { Toast.makeText(context, "Save failed. Please try again.", Toast.LENGTH_SHORT).show() }
                        } catch (e: Exception) { Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show() }
                        isSaving = false
                    }
                }, enabled = !isSaving, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Emerald600, disabledContainerColor = Gray300)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), Color.White, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
