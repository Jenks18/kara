package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.DateUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class AvatarOption(val emoji: String, val gradient: List<Color>, val label: String)

val AVATAR_OPTIONS = listOf(
    AvatarOption("\uD83D\uDC3B", listOf(Color(0xFFB45309), Color(0xFF92400E)), "Bear"),
    AvatarOption("\uD83E\uDD81", listOf(Color(0xFFEA580C), Color(0xFFC2410C)), "Lion"),
    AvatarOption("\uD83D\uDC2F", listOf(Color(0xFFC2410C), Color(0xFF9A3412)), "Tiger"),
    AvatarOption("\uD83E\uDD8A", listOf(Color(0xFFDC2626), Color(0xFFB91C1C)), "Fox"),
    AvatarOption("\uD83D\uDC3A", listOf(Color(0xFF334155), Color(0xFF1E293B)), "Wolf"),
    AvatarOption("\uD83E\uDD85", listOf(Color(0xFFA16207), Color(0xFF854D0E)), "Eagle"),
    AvatarOption("\uD83E\uDD89", listOf(Color(0xFF4338CA), Color(0xFF3730A3)), "Owl"),
    AvatarOption("\uD83D\uDC27", listOf(Color(0xFF475569), Color(0xFF334155)), "Penguin"),
    AvatarOption("\uD83D\uDC18", listOf(Color(0xFF374151), Color(0xFF1F2937)), "Elephant"),
    AvatarOption("\uD83E\uDD8F", listOf(Color(0xFF57534E), Color(0xFF44403C)), "Rhino"),
    AvatarOption("\uD83E\uDD92", listOf(Color(0xFFD97706), Color(0xFFB45309)), "Giraffe"),
    AvatarOption("\uD83E\uDD93", listOf(Color(0xFF3F3F46), Color(0xFF27272A)), "Zebra"),
    AvatarOption("\uD83D\uDC06", listOf(Color(0xFFCA8A04), Color(0xFFA16207)), "Leopard"),
    AvatarOption("\uD83E\uDD88", listOf(Color(0xFF0E7490), Color(0xFF155E75)), "Shark"),
    AvatarOption("\uD83D\uDC19", listOf(Color(0xFF7C3AED), Color(0xFF6D28D9)), "Octopus"),
    AvatarOption("\uD83D\uDC2C", listOf(Color(0xFF1D4ED8), Color(0xFF1E40AF)), "Dolphin"),
    AvatarOption("\uD83D\uDC33", listOf(Color(0xFF0369A1), Color(0xFF075985)), "Whale"),
    AvatarOption("\uD83E\uDDA6", listOf(Color(0xFF0F766E), Color(0xFF115E59)), "Otter"),
    AvatarOption("\uD83E\uDD98", listOf(Color(0xFFA16207), Color(0xFFB45309)), "Kangaroo"),
    AvatarOption("\uD83E\uDD8C", listOf(Color(0xFFB45309), Color(0xFFEA580C)), "Deer"),
    AvatarOption("\uD83D\uDC0E", listOf(Color(0xFF57534E), Color(0xFF44403C)), "Horse"),
    AvatarOption("\uD83E\uDDAC", listOf(Color(0xFF3F3F46), Color(0xFF374151)), "Bison"),
    AvatarOption("\uD83D\uDC3F\uFE0F", listOf(Color(0xFFEA580C), Color(0xFFB45309)), "Squirrel"),
    AvatarOption("\uD83E\uDD94", listOf(Color(0xFFD97706), Color(0xFFEA580C)), "Hedgehog"),
    AvatarOption("\uD83D\uDC22", listOf(Color(0xFF047857), Color(0xFF065F46)), "Turtle"),
    AvatarOption("\uD83D\uDC0A", listOf(Color(0xFF15803D), Color(0xFF166534)), "Crocodile"),
    AvatarOption("\uD83E\uDD9C", listOf(Color(0xFF059669), Color(0xFF047857)), "Parrot"),
    AvatarOption("\uD83E\uDD9A", listOf(Color(0xFF2563EB), Color(0xFF1D4ED8)), "Peacock"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    refreshTrigger: Int = 0,
    onNavigateToEditDisplayName: () -> Unit = {},
    onNavigateToEditLegalName: () -> Unit = {},
    onNavigateToEditPhoneNumber: () -> Unit = {},
    onNavigateToEditDateOfBirth: () -> Unit = {},
    onNavigateToEditAddress: () -> Unit = {}
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)

    var showAvatarPicker by remember { mutableStateOf(false) }
    var selectedAvatar by remember { mutableStateOf(AVATAR_OPTIONS[0]) }
    val coroutineScope = rememberCoroutineScope()

    // Instant display from cached SharedPreferences — no loading spinner
    var displayName by remember { mutableStateOf(prefs.getString("cached_display_name", null) ?: "") }
    var userEmail by remember { mutableStateOf(prefs.getString("user_email", null) ?: "") }
    var phoneNumber by remember { mutableStateOf(prefs.getString("cached_phone", null) ?: "") }
    var dateOfBirth by remember { mutableStateOf(prefs.getString("cached_dob", null) ?: "") }
    var legalName by remember { mutableStateOf(prefs.getString("cached_legal_name", null) ?: "") }
    var address by remember { mutableStateOf(prefs.getString("cached_address", null) ?: "") }

    // Restore cached avatar
    LaunchedEffect(Unit) {
        val cachedEmoji = prefs.getString("avatar_emoji", null)
        if (cachedEmoji != null) {
            AVATAR_OPTIONS.find { it.emoji == cachedEmoji }?.let { selectedAvatar = it }
        }
    }

    // Fetch from API in background — keyed on refreshTrigger
    LaunchedEffect(refreshTrigger) {
        if (sessionToken != null) {
            try {
                val result = withContext(Dispatchers.IO) { fetchProfileData(sessionToken) }
                if (result != null) {
                    val clerk = result.optJSONObject("clerk")
                    val profile = result.optJSONObject("profile")
                    fun JSONObject.s(k: String): String { val v = optString(k, ""); return if (v == "null" || v.isBlank()) "" else v }

                    displayName = profile?.s("display_name")?.ifEmpty { null } ?: clerk?.s("fullName")?.ifEmpty { null } ?: ""
                    userEmail = clerk?.s("email") ?: ""
                    phoneNumber = profile?.s("phone_number") ?: ""
                    dateOfBirth = profile?.s("date_of_birth") ?: ""
                    val lf = profile?.s("legal_first_name") ?: ""; val ll = profile?.s("legal_last_name") ?: ""
                    legalName = listOf(lf, ll).filter { it.isNotEmpty() }.joinToString(" ")
                    address = listOfNotNull(
                        profile?.s("address_line1")?.ifEmpty { null },
                        profile?.s("city")?.ifEmpty { null },
                        profile?.s("state")?.ifEmpty { null },
                        profile?.s("zip_code")?.ifEmpty { null }
                    ).joinToString(", ")
                    val emoji = profile?.s("avatar_emoji")?.ifEmpty { null }
                    if (emoji != null) AVATAR_OPTIONS.find { it.emoji == emoji }?.let { selectedAvatar = it }

                    // Cache everything for instant display next time
                    prefs.edit()
                        .putString("cached_display_name", displayName)
                        .putString("avatar_emoji", emoji ?: selectedAvatar.emoji)
                        .putString("cached_phone", phoneNumber)
                        .putString("cached_dob", dateOfBirth)
                        .putString("cached_legal_name", legalName)
                        .putString("cached_address", address)
                        .apply()
                }
            } catch (e: Exception) {
                android.util.Log.e("ProfileScreen", "Fetch error: ${e.message}")
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize()
            .background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))
    ) {
        TopAppBar(
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.Person, null, tint = Emerald600)
                    Text("Profile", fontWeight = FontWeight.Bold)
                }
            },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0)
        )

        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Column(modifier = Modifier.padding(bottom = 2.dp)) {
                    Text("Public", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("These details are displayed on your public profile.", style = MaterialTheme.typography.bodySmall, color = Gray500)
                }
            }

            // Avatar — large centered, no label text
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                    Box(contentAlignment = Alignment.BottomEnd) {
                        Box(
                            modifier = Modifier.size(120.dp).clip(CircleShape)
                                .background(brush = Brush.verticalGradient(selectedAvatar.gradient))
                                .clickable { showAvatarPicker = true },
                            contentAlignment = Alignment.Center
                        ) { Text(selectedAvatar.emoji, fontSize = 56.sp) }
                        Surface(shape = CircleShape, color = Emerald600, shadowElevation = 4.dp,
                            modifier = Modifier.size(36.dp).clickable { showAvatarPicker = true }) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Icon(Icons.Filled.Edit, "Change avatar", tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }

            item { ProfileField("Display name", displayName.ifEmpty { "Not set" }) { onNavigateToEditDisplayName() } }
            item { ProfileField("Contact methods", userEmail.ifEmpty { "Not set" }) { } }

            item {
                Column(modifier = Modifier.padding(top = 4.dp, bottom = 2.dp)) {
                    Text("Private", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("These details are used for travel and payments.", style = MaterialTheme.typography.bodySmall, color = Gray500)
                }
            }

            item { ProfileField("Legal name", legalName.ifEmpty { "Not set" }) { onNavigateToEditLegalName() } }
            item { ProfileField("Date of birth", if (dateOfBirth.isNotEmpty()) DateUtils.formatFull(dateOfBirth) else "Not set") { onNavigateToEditDateOfBirth() } }
            item { ProfileField("Phone number", phoneNumber.ifEmpty { "Not set" }) { onNavigateToEditPhoneNumber() } }
            item { ProfileField("Address", address.ifEmpty { "Not set" }) { onNavigateToEditAddress() } }
            item { Spacer(Modifier.height(8.dp)) }
        }
    }

    // Avatar picker dialog
    if (showAvatarPicker) {
        Dialog(onDismissRequest = { showAvatarPicker = false }) {
            Surface(shape = RoundedCornerShape(24.dp), color = Color.White, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Edit profile picture", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showAvatarPicker = false }) { Icon(Icons.Filled.Close, "Close") }
                    }
                    Text("Choose a custom avatar", style = MaterialTheme.typography.bodySmall, color = Gray500)
                    Spacer(Modifier.height(16.dp))
                    LazyVerticalGrid(columns = GridCells.Fixed(5), horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.height(340.dp)) {
                        items(AVATAR_OPTIONS) { option ->
                            Box(
                                modifier = Modifier.aspectRatio(1f).clip(CircleShape)
                                    .background(brush = Brush.verticalGradient(option.gradient))
                                    .then(if (selectedAvatar.emoji == option.emoji) Modifier.padding(3.dp) else Modifier)
                                    .clickable {
                                        selectedAvatar = option; showAvatarPicker = false
                                        if (sessionToken != null) { coroutineScope.launch(Dispatchers.IO) { saveAvatarToBackend(sessionToken, option.emoji) } }
                                        prefs.edit().putString("avatar_emoji", option.emoji).apply()
                                    },
                                contentAlignment = Alignment.Center
                            ) { Text(option.emoji, fontSize = 28.sp) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileField(label: String, value: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = Emerald600)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium,
                color = if (value == "Not set") Gray400 else Gray800)
        }
    }
}

internal fun fetchProfileData(token: String): JSONObject? {
    val client = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()
    val request = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile")
        .get().addHeader("Authorization", "Bearer $token").build()
    val response = client.newCall(request).execute()
    val body = response.body?.string() ?: return null
    if (!response.isSuccessful) return null
    return JSONObject(body)
}

internal fun saveAvatarToBackend(token: String, emoji: String) {
    try {
        val client = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()
        val json = JSONObject().apply { put("avatar_emoji", emoji) }
        val rb = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile")
            .patch(rb).addHeader("Authorization", "Bearer $token").build()
        client.newCall(request).execute()
    } catch (e: Exception) { android.util.Log.e("ProfileScreen", "Avatar save error: ${e.message}") }
}
