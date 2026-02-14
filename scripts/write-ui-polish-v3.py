#!/usr/bin/env python3
"""Complete Android UX polish: all fixes in one script."""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENS = os.path.join(BASE, "android-app", "app", "src", "main", "java", "com", "mafutapass", "app", "ui", "screens")
COMPONENTS = os.path.join(BASE, "android-app", "app", "src", "main", "java", "com", "mafutapass", "app", "ui", "components")
MAIN = os.path.join(BASE, "android-app", "app", "src", "main", "java", "com", "mafutapass", "app")

files = {}

# ═══════════════════════════════════════════════════════════════════════
# AccountScreen.kt — 1x1 row tiles, no grid, no chevrons, nice fonts, 
#                     refreshTrigger from parent, cached data for instant display
# ═══════════════════════════════════════════════════════════════════════
files["AccountScreen.kt"] = r'''package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafutapass.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

@Composable
fun AccountScreen(
    refreshTrigger: Int = 0,
    onNavigateToProfile: () -> Unit = {},
    onNavigateToPreferences: () -> Unit = {},
    onNavigateToSecurity: () -> Unit = {},
    onNavigateToAbout: () -> Unit = {},
    onSignOut: () -> Unit = {}
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)
    val userEmail = prefs.getString("user_email", null) ?: "User"

    // Instant display from cache — no flash
    var displayName by remember { mutableStateOf(prefs.getString("cached_display_name", null) ?: userEmail.substringBefore("@")) }
    var displayEmail by remember { mutableStateOf(userEmail) }
    var avatarEmoji by remember { mutableStateOf(prefs.getString("avatar_emoji", null) ?: "\uD83D\uDC3B") }

    // Fetch from API in background — keyed on refreshTrigger from parent
    LaunchedEffect(refreshTrigger) {
        // Always read latest cache first (instant)
        prefs.getString("cached_display_name", null)?.let { displayName = it }
        prefs.getString("avatar_emoji", null)?.let { avatarEmoji = it }

        if (sessionToken != null) {
            try {
                val result = withContext(Dispatchers.IO) { fetchAccountProfile(sessionToken) }
                if (result != null) {
                    fun JSONObject.s(key: String): String {
                        val v = optString(key, "")
                        return if (v == "null" || v.isBlank()) "" else v
                    }
                    val name = result.optJSONObject("profile")?.s("display_name")?.ifEmpty { null }
                        ?: result.optJSONObject("clerk")?.s("fullName")?.ifEmpty { null }
                        ?: result.optJSONObject("clerk")?.s("firstName")?.ifEmpty { null }
                        ?: userEmail.substringBefore("@")
                    displayName = name
                    displayEmail = result.optJSONObject("clerk")?.s("email")?.ifEmpty { null } ?: userEmail
                    val emoji = result.optJSONObject("profile")?.s("avatar_emoji")?.ifEmpty { null }
                    if (emoji != null) avatarEmoji = emoji
                    prefs.edit()
                        .putString("cached_display_name", name)
                        .putString("avatar_emoji", emoji ?: avatarEmoji)
                        .apply()
                }
            } catch (e: Exception) {
                android.util.Log.e("AccountScreen", "Fetch error: ${e.message}")
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))
    ) {
        // Profile header
        Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier.size(48.dp).clip(CircleShape)
                        .background(brush = Brush.verticalGradient(listOf(Emerald400, Emerald600))),
                    contentAlignment = Alignment.Center
                ) { Text(avatarEmoji, fontSize = 24.sp) }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text(displayEmail, style = MaterialTheme.typography.bodyMedium, color = Gray500)
                }
            }
        }

        // Menu sections — 1x1 rows, no grid, no chevrons
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            // ACCOUNT section
            item {
                Text("ACCOUNT", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold,
                    color = Gray500, letterSpacing = 1.sp, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp, start = 4.dp))
            }
            val accountItems = listOf(
                Triple(Icons.Filled.Person, "Profile", "profile"),
                Triple(Icons.Filled.Settings, "Preferences", "preferences"),
                Triple(Icons.Filled.Shield, "Security", "security"),
            )
            items(accountItems) { (icon, label, action) ->
                MenuRow(icon = icon, label = label) {
                    when (action) {
                        "profile" -> onNavigateToProfile()
                        "preferences" -> onNavigateToPreferences()
                        "security" -> onNavigateToSecurity()
                    }
                }
            }

            // GENERAL section
            item {
                Text("GENERAL", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold,
                    color = Gray500, letterSpacing = 1.sp, modifier = Modifier.padding(top = 16.dp, bottom = 4.dp, start = 4.dp))
            }
            val generalItems = listOf(
                Triple(Icons.Filled.Help, "Help", "help"),
                Triple(Icons.Filled.Star, "What's new", "whats_new"),
                Triple(Icons.Filled.Info, "About", "about"),
            )
            items(generalItems) { (icon, label, action) ->
                MenuRow(icon = icon, label = label) {
                    when (action) {
                        "about" -> onNavigateToAbout()
                        else -> onNavigateToAbout()
                    }
                }
            }

            // Sign out
            item {
                Spacer(Modifier.height(12.dp))
                Surface(
                    shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth().clickable { onSignOut() }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Filled.Logout, null, tint = Red500, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(14.dp))
                        Text("Sign Out", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = Red500)
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun MenuRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(imageVector = icon, contentDescription = label, tint = Emerald600, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(14.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = Gray800)
        }
    }
}

private fun fetchAccountProfile(token: String): JSONObject? {
    val client = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()
    val request = Request.Builder()
        .url("https://www.mafutapass.com/api/auth/mobile-profile")
        .get().addHeader("Authorization", "Bearer $token").build()
    val response = client.newCall(request).execute()
    val body = response.body?.string() ?: return null
    if (!response.isSuccessful) return null
    return JSONObject(body)
}
'''

# ═══════════════════════════════════════════════════════════════════════
# ProfileScreen.kt — no spinner (instant layout), refreshTrigger, 
#                     no chevrons, windowInsets(0), cached data
# ═══════════════════════════════════════════════════════════════════════
files["ProfileScreen.kt"] = r'''package com.mafutapass.app.ui.screens

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
'''

# ═══════════════════════════════════════════════════════════════════════
# MainActivity.kt — refreshTrigger state vars, updated navigation
# ═══════════════════════════════════════════════════════════════════════
files["MainActivity.kt"] = r'''package com.mafutapass.app

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mafutapass.app.ui.components.BottomNavBar
import com.mafutapass.app.ui.Screen
import com.mafutapass.app.ui.screens.*
import com.mafutapass.app.ui.theme.MafutaPassTheme
import com.mafutapass.app.viewmodel.AuthViewModel
import com.mafutapass.app.viewmodel.AuthState

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d("MainActivity", "MainActivity created")
        setContent {
            MafutaPassTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    MafutaPassApp()
                }
            }
        }
    }
}

@Composable
fun MafutaPassApp() {
    val context = LocalContext.current
    val authViewModel: AuthViewModel = viewModel(
        factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return AuthViewModel(context.applicationContext as android.app.Application) as T
            }
        }
    )
    val authState by authViewModel.authState.collectAsState()
    val navController = rememberNavController()

    // Refresh triggers — incremented when returning from sub-screens after saves
    var profileRefreshKey by remember { mutableIntStateOf(0) }
    var accountRefreshKey by remember { mutableIntStateOf(0) }

    when (authState) {
        AuthState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
        AuthState.SignedOut -> {
            key(authState) { SignInOrUpScreen() }
        }
        AuthState.SignedIn -> {
            Scaffold(bottomBar = { BottomNavBar(navController) }) { paddingValues ->
                NavHost(navController = navController, startDestination = Screen.Reports.route,
                    modifier = Modifier.padding(paddingValues)) {

                    composable(Screen.Reports.route) { ReportsScreen() }
                    composable(Screen.Create.route) { CreateScreen() }
                    composable(Screen.Workspaces.route) {
                        WorkspacesScreen(
                            onNavigateToNewWorkspace = { navController.navigate("workspaces/new") },
                            onNavigateToWorkspaceDetail = { id -> navController.navigate("workspaces/$id") }
                        )
                    }
                    composable(Screen.Account.route) {
                        AccountScreen(
                            refreshTrigger = accountRefreshKey,
                            onNavigateToProfile = { navController.navigate("profile") },
                            onNavigateToPreferences = { navController.navigate("preferences") },
                            onNavigateToSecurity = { navController.navigate("security") },
                            onNavigateToAbout = { navController.navigate("about") },
                            onSignOut = { authViewModel.signOut() }
                        )
                    }
                    composable("profile") {
                        ProfileScreen(
                            refreshTrigger = profileRefreshKey,
                            onBack = { accountRefreshKey++; navController.popBackStack() },
                            onNavigateToEditDisplayName = { navController.navigate("profile/edit-display-name") },
                            onNavigateToEditLegalName = { navController.navigate("profile/edit-legal-name") },
                            onNavigateToEditPhoneNumber = { navController.navigate("profile/edit-phone") },
                            onNavigateToEditDateOfBirth = { navController.navigate("profile/edit-dob") },
                            onNavigateToEditAddress = { navController.navigate("profile/edit-address") }
                        )
                    }
                    composable("profile/edit-display-name") {
                        EditDisplayNameScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-legal-name") {
                        EditLegalNameScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-phone") {
                        EditPhoneNumberScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-dob") {
                        EditDateOfBirthScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-address") {
                        EditAddressScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("preferences") {
                        PreferencesScreen(onBack = { navController.popBackStack() })
                    }
                    composable("security") {
                        SecurityScreen(onBack = { navController.popBackStack() })
                    }
                    composable("about") {
                        AboutScreen(onBack = { navController.popBackStack() })
                    }
                    composable("workspaces/new") {
                        NewWorkspaceScreen(onBack = { navController.popBackStack() }, onConfirm = { navController.popBackStack() })
                    }
                    composable("workspaces/{workspaceId}") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceDetailScreen(workspaceId = wid, onBack = { navController.popBackStack() },
                            onNavigateToOverview = { navController.navigate("workspaces/$wid/overview") },
                            onNavigateToMembers = { navController.navigate("workspaces/$wid/members") })
                    }
                    composable("workspaces/{workspaceId}/overview") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceOverviewScreen(workspaceId = wid, onBack = { navController.popBackStack() })
                    }
                    composable("workspaces/{workspaceId}/members") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceMembersScreen(workspaceId = wid, onBack = { navController.popBackStack() })
                    }
                }
            }
        }
    }
}
'''

# ═══════════════════════════════════════════════════════════════════════
# Edit screens — check response, cache on save, windowInsets(0), toast on error
# ═══════════════════════════════════════════════════════════════════════

edit_template_header = r'''package com.mafutapass.app.ui.screens

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
'''

files["EditDisplayNameScreen.kt"] = edit_template_header + r'''
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
'''

files["EditLegalNameScreen.kt"] = edit_template_header + r'''
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditLegalNameScreen(onBack: () -> Unit) {
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
                    firstName = p.s("legal_first_name"); lastName = p.s("legal_last_name")
                }
            } catch (_: Exception) {}
            isLoading = false
        } else isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(title = { Text("Legal name", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Emerald600) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
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
                    if (sessionToken == null) return@Button; isSaving = true
                    scope.launch {
                        try {
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("legal_first_name", firstName.trim()); put("legal_last_name", lastName.trim()) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $sessionToken").build()
                                OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).build().newCall(req).execute().isSuccessful
                            }
                            if (ok) { prefs.edit().putString("cached_legal_name", "${firstName.trim()} ${lastName.trim()}".trim()).apply(); onBack() }
                            else Toast.makeText(context, "Save failed. Please try again.", Toast.LENGTH_SHORT).show()
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
'''

files["EditPhoneNumberScreen.kt"] = edit_template_header + r'''
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditPhoneNumberScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)
    var phoneDigits by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(sessionToken) {
        if (sessionToken != null) {
            try {
                val r = withContext(Dispatchers.IO) { fetchProfileData(sessionToken) }
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
                    if (sessionToken == null) return@Button; isSaving = true
                    scope.launch {
                        try {
                            val fullNum = if (phoneDigits.isNotBlank()) "+254${phoneDigits.trim()}" else ""
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("phone_number", fullNum) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $sessionToken").build()
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
'''

files["EditDateOfBirthScreen.kt"] = edit_template_header + r'''
private val MONTHS = listOf("January","February","March","April","May","June","July","August","September","October","November","December")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditDateOfBirthScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)
    var day by remember { mutableStateOf("") }
    var monthIndex by remember { mutableStateOf(-1) }
    var year by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var monthExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(sessionToken) {
        if (sessionToken != null) {
            try {
                val r = withContext(Dispatchers.IO) { fetchProfileData(sessionToken) }
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
                    if (sessionToken == null) return@Button; isSaving = true
                    scope.launch {
                        try {
                            val d = day.padStart(2, '0'); val m = (monthIndex + 1).toString().padStart(2, '0'); val isoDate = "$year-$m-$d"
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("date_of_birth", isoDate) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $sessionToken").build()
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
'''

files["EditAddressScreen.kt"] = edit_template_header + r'''
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll

private val COUNTRIES = listOf("Kenya", "United States", "United Kingdom", "Canada", "Tanzania", "Uganda")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditAddressScreen(onBack: () -> Unit) {
    val context = LocalContext.current
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
    val scope = rememberCoroutineScope()

    LaunchedEffect(sessionToken) {
        if (sessionToken != null) {
            try {
                val r = withContext(Dispatchers.IO) { fetchProfileData(sessionToken) }
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

    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(title = { Text("Address", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Emerald600) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    @Composable fun Field(lbl: String, v: String, onChange: (String) -> Unit) {
                        Column {
                            Text(lbl, style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                            OutlinedTextField(value = v, onValueChange = onChange, placeholder = { Text(lbl) }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                        }
                    }
                    Field("Address line 1", addressLine1) { addressLine1 = it }
                    Field("Address line 2", addressLine2) { addressLine2 = it }
                    Column {
                        Text("Country", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        ExposedDropdownMenuBox(expanded = countryExpanded, onExpandedChange = { countryExpanded = it }) {
                            OutlinedTextField(value = country, onValueChange = {}, readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = countryExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                            ExposedDropdownMenu(expanded = countryExpanded, onDismissRequest = { countryExpanded = false }) {
                                COUNTRIES.forEach { c -> DropdownMenuItem(text = { Text(c) }, onClick = { country = c; countryExpanded = false }) }
                            }
                        }
                    }
                    Field("State", state) { state = it }
                    Field("City", city) { city = it }
                    Column {
                        Text("Zip / Postcode", style = MaterialTheme.typography.bodySmall, color = Emerald600, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = zipCode, onValueChange = { zipCode = it }, placeholder = { Text("Zip / Postcode") }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald600, unfocusedBorderColor = Gray300, focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                        Text("e.g. 12345, 12345-1234", style = MaterialTheme.typography.bodySmall, color = Gray500, modifier = Modifier.padding(top = 4.dp))
                    }
                    Spacer(Modifier.height(8.dp))
                }
                Button(onClick = {
                    if (sessionToken == null) return@Button; isSaving = true
                    scope.launch {
                        try {
                            val ok = withContext(Dispatchers.IO) {
                                val json = JSONObject().apply { put("address_line1", addressLine1.trim()); put("address_line2", addressLine2.trim()); put("city", city.trim()); put("state", state.trim()); put("zip_code", zipCode.trim()); put("country", country.trim()) }
                                val body = json.toString().toRequestBody("application/json".toMediaType())
                                val req = Request.Builder().url("https://www.mafutapass.com/api/auth/mobile-profile").patch(body).addHeader("Authorization", "Bearer $sessionToken").build()
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
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Emerald600, disabledContainerColor = Gray300)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), Color.White, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
'''

# ═══════════════════════════════════════════════════════════════════════
# Sub-pages: windowInsets(0) fix + font cleanup
# ═══════════════════════════════════════════════════════════════════════

files["PreferencesScreen.kt"] = r'''package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreferencesScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("app_preferences", android.content.Context.MODE_PRIVATE)
    var selectedLanguage by remember { mutableStateOf(prefs.getString("language", "English") ?: "English") }
    var selectedCurrency by remember { mutableStateOf(prefs.getString("currency", "KES - KSh") ?: "KES - KSh") }
    var selectedTheme by remember { mutableStateOf(prefs.getString("theme", "Light") ?: "Light") }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showCurrencyDialog by remember { mutableStateOf(false) }
    var showThemeDialog by remember { mutableStateOf(false) }
    val languages = listOf("English", "Swahili")
    val currencies = listOf("KES - KSh", "USD - $", "EUR - €", "GBP - £")
    val themes = listOf("Light", "Dark", "System")

    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(
            title = { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.Settings, null, tint = Emerald600); Text("Preferences", fontWeight = FontWeight.Bold) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("App preferences", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                    PrefItem("Language", selectedLanguage) { showLanguageDialog = true }
                    PrefItem("Payment currency", selectedCurrency) { showCurrencyDialog = true }
                    PrefItem("Theme", selectedTheme) { showThemeDialog = true }
                }
            }
        }
    }
    if (showLanguageDialog) PrefPickerDialog("Select Language", languages, selectedLanguage, { selectedLanguage = it; prefs.edit().putString("language", it).apply(); showLanguageDialog = false }, { showLanguageDialog = false })
    if (showCurrencyDialog) PrefPickerDialog("Select Currency", currencies, selectedCurrency, { selectedCurrency = it; prefs.edit().putString("currency", it).apply(); showCurrencyDialog = false }, { showCurrencyDialog = false })
    if (showThemeDialog) PrefPickerDialog("Select Theme", themes, selectedTheme, { selectedTheme = it; prefs.edit().putString("theme", it).apply(); showThemeDialog = false }, { showThemeDialog = false })
}

@Composable
fun PrefPickerDialog(title: String, options: List<String>, selected: String, onSelect: (String) -> Unit, onDismiss: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) },
        text = { Column { options.forEach { option -> Row(Modifier.fillMaxWidth().clickable { onSelect(option) }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { RadioButton(selected = option == selected, onClick = { onSelect(option) }, colors = RadioButtonDefaults.colors(selectedColor = Emerald600)); Text(option, style = MaterialTheme.typography.bodyLarge, color = Gray900) } } } },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
fun PrefItem(label: String, value: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = Emerald600)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = Gray800)
        }
    }
}
'''

files["SecurityScreen.kt"] = r'''package com.mafutapass.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecurityScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(
            title = { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.Shield, null, tint = Emerald600); Text("Security", fontWeight = FontWeight.Bold) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Security options", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("Enable two-factor authentication to keep your account safe.", style = MaterialTheme.typography.bodyMedium, color = Gray600)
                    Spacer(Modifier.height(8.dp))
                    SecOption(Icons.Filled.Shield, "Two-factor authentication") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    SecOption(Icons.Filled.SwapHoriz, "Merge accounts") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    SecOption(Icons.Filled.Warning, "Report suspicious activity") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    SecOption(Icons.Filled.ExitToApp, "Close account", true) { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Copilot: Delegated access", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("Allow other members to access your account.", style = MaterialTheme.typography.bodyMedium, color = Gray600)
                    Spacer(Modifier.height(8.dp))
                    SecOption(Icons.Filled.PersonAdd, "Add copilot") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                }
            }
        }
    }
}

@Composable
fun SecOption(icon: ImageVector, label: String, isDestructive: Boolean = false, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Icon(icon, label, tint = if (isDestructive) Red500 else Emerald600, modifier = Modifier.size(22.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = if (isDestructive) Red500 else Gray800)
        }
    }
}
'''

files["AboutScreen.kt"] = r'''package com.mafutapass.app.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(
            title = { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.Info, null, tint = Emerald600); Text("About", fontWeight = FontWeight.Bold) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { Text("v1.0.0", style = MaterialTheme.typography.bodySmall, color = Gray500, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
            item {
                Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("About MafutaPass", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                        Text("MafutaPass is a fuel expense tracking app built for Kenyan businesses and drivers. Track your fuel expenses, receipts, and mileage all in one place.", style = MaterialTheme.typography.bodyMedium, color = Gray600, lineHeight = MaterialTheme.typography.bodyMedium.lineHeight)
                    }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AboutRow(Icons.Filled.Link, "App download links") { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.mafutapass.com"))) }
                    AboutRow(Icons.Filled.Keyboard, "Keyboard shortcuts") { Toast.makeText(context, "No keyboard shortcuts on mobile", Toast.LENGTH_SHORT).show() }
                    AboutRow(Icons.Filled.Work, "View open jobs") { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.mafutapass.com"))) }
                    AboutRow(Icons.Filled.BugReport, "Report a bug") { context.startActivity(Intent(Intent.ACTION_SENDTO).apply { data = Uri.parse("mailto:support@mafutapass.com"); putExtra(Intent.EXTRA_SUBJECT, "Bug Report - MafutaPass Android") }) }
                }
            }
            item { Text("Read the Terms of Service and Privacy.", style = MaterialTheme.typography.bodySmall, color = Gray500, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
        }
    }
}

@Composable
fun AboutRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Icon(icon, label, tint = Emerald600, modifier = Modifier.size(22.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = Gray800)
        }
    }
}
'''

# ═══════════════════════════════════════════════════════════════════════
# Write all files
# ═══════════════════════════════════════════════════════════════════════
for name, content in files.items():
    if name == "MainActivity.kt":
        path = os.path.join(MAIN, name)
    elif name.startswith("Bottom"):
        path = os.path.join(COMPONENTS, name)
    else:
        path = os.path.join(SCREENS, name)
    with open(path, "w") as f:
        f.write(content)
    print(f"  {name} ({content.count(chr(10))+1} lines)")

print("\nDone! All files written.")
