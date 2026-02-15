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

import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditPhoneNumberScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    var phoneDigits by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val token = TokenManager.getValidToken(context)
        if (token != null) {
            try {
                val r = withContext(Dispatchers.IO) { fetchProfileData(token) }
                r?.optJSONObject("profile")?.let { p ->
                    fun JSONObject.s(k: String): String { val v = optString(k, ""); return if (v == "null" || v.isBlank()) "" else v }
                    val num = p.s("phone_number").replace(Regex("[\\s\\-]"), "")
                    phoneDigits = when {
                        num.startsWith("+254") -> num.substring(4)
                        num.startsWith("254") -> num.substring(3)
                        num.startsWith("0") -> num.substring(1)
                        else -> num
                    }
                }
            } catch (_: Exception) {}
            isLoading = false
        } else isLoading = false
    }

    val isValid = phoneDigits.length == 9 && (phoneDigits.startsWith("7") || phoneDigits.startsWith("1"))

    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(title = { Text("Phone number", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Emerald600) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Enter your 9-digit Kenyan mobile number", style = MaterialTheme.typography.bodyMedium, color = Gray500)
                    Column {
                        Text("Phone number", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                            Surface(shape = RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp), color = Color(0xFFF9FAFB),
                                border = BorderStroke(1.dp, Gray300), modifier = Modifier.height(56.dp)) {
                                Row(Modifier.padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("\uD83C\uDDF0\uD83C\uDDEA", fontSize = 20.sp); Text("+254", fontWeight = FontWeight.Medium, color = Gray700)
                                }
                            }
                            OutlinedTextField(value = phoneDigits, onValueChange = { v -> val d = v.filter { it.isDigit() }; if (d.length <= 9) phoneDigits = d },
                                placeholder = { Text("712345678") }, singleLine = true, enabled = !isSaving, modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(topEnd = 12.dp, bottomEnd = 12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                        }
                        if (phoneDigits.isNotEmpty() && !isValid) {
                            Text(if (phoneDigits.length < 9) "Enter exactly 9 digits" else "Number must start with 7 or 1",
                                style = MaterialTheme.typography.bodySmall, color = Color(0xFFDC2626), modifier = Modifier.padding(top = 6.dp))
                        }
                    }
                }
                Button(onClick = {
                    isSaving = true
                    scope.launch {
                        try {
                            val token = TokenManager.getValidToken(context)
                            if (token == null) { Toast.makeText(context, "Session expired. Please sign in again.", Toast.LENGTH_SHORT).show(); isSaving = false; return@launch }
                            val fullNum = if (phoneDigits.isNotBlank()) "+254${phoneDigits.trim()}" else ""
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("phone_number", fullNum) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $token").build()
                                OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).build().newCall(req).execute().isSuccessful
                            }
                            if (ok) { prefs.edit().putString("cached_phone", fullNum).apply(); onBack() }
                            else Toast.makeText(context, "Save failed. Please try again.", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) { Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show() }
                        isSaving = false
                    }
                }, enabled = !isSaving && (isValid || phoneDigits.isEmpty()), modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Emerald600, disabledContainerColor = Gray300)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), Color.White, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
