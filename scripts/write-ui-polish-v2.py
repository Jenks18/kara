#!/usr/bin/env python3
"""Write corrected Android UI files - ProfileScreen with lifecycle re-fetch, AccountScreen fixed."""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENS_DIR = os.path.join(BASE, "android-app", "app", "src", "main", "java", "com", "mafutapass", "app", "ui", "screens")
COMPONENTS_DIR = os.path.join(BASE, "android-app", "app", "src", "main", "java", "com", "mafutapass", "app", "ui", "components")

# ═══════════════════════════════════════════════════════════════
# 1. ProfileScreen.kt — lifecycle re-fetch, no label, no chevrons
# ═══════════════════════════════════════════════════════════════
profile_screen = r'''package com.mafutapass.app.ui.screens

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
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
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

data class AvatarOption(
    val emoji: String,
    val gradient: List<Color>,
    val label: String
)

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
    var isLoading by remember { mutableStateOf(true) }

    // Profile fields
    var displayName by remember { mutableStateOf("") }
    var userEmail by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var dateOfBirth by remember { mutableStateOf("") }
    var legalName by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }

    val coroutineScope = rememberCoroutineScope()

    // Lifecycle-aware refresh key: increments every time this screen resumes
    // (i.e. when navigating back from edit screens)
    var refreshKey by remember { mutableIntStateOf(0) }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                refreshKey++
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Fetch profile data — runs on first ON_RESUME and every subsequent resume
    LaunchedEffect(refreshKey) {
        if (sessionToken != null && refreshKey > 0) {
            try {
                val result = withContext(Dispatchers.IO) {
                    fetchProfileData(sessionToken)
                }
                if (result != null) {
                    val clerk = result.optJSONObject("clerk")
                    val profile = result.optJSONObject("profile")

                    fun JSONObject.safeString(key: String): String {
                        val v = optString(key, "")
                        return if (v == "null" || v.isBlank()) "" else v
                    }

                    displayName = profile?.safeString("display_name")?.ifEmpty { null }
                        ?: clerk?.safeString("fullName")?.ifEmpty { null }
                        ?: ""

                    userEmail = clerk?.safeString("email") ?: ""
                    phoneNumber = profile?.safeString("phone_number") ?: ""
                    dateOfBirth = profile?.safeString("date_of_birth") ?: ""

                    val legalFirst = profile?.safeString("legal_first_name") ?: ""
                    val legalLast = profile?.safeString("legal_last_name") ?: ""
                    legalName = listOf(legalFirst, legalLast).filter { it.isNotEmpty() }.joinToString(" ")

                    val addressLine1 = profile?.safeString("address_line1") ?: ""
                    val city = profile?.safeString("city") ?: ""
                    val state = profile?.safeString("state") ?: ""
                    val zipCode = profile?.safeString("zip_code") ?: ""
                    address = listOfNotNull(
                        addressLine1.ifEmpty { null },
                        city.ifEmpty { null },
                        state.ifEmpty { null },
                        zipCode.ifEmpty { null }
                    ).joinToString(", ")

                    val avatarEmoji = profile?.safeString("avatar_emoji")?.ifEmpty { null }
                    if (avatarEmoji != null) {
                        AVATAR_OPTIONS.find { it.emoji == avatarEmoji }?.let {
                            selectedAvatar = it
                        }
                    }

                    // Cache for bottom nav and account screen
                    prefs.edit()
                        .putString("cached_display_name", displayName)
                        .putString("avatar_emoji", avatarEmoji ?: selectedAvatar.emoji)
                        .apply()
                }
            } catch (e: Exception) {
                android.util.Log.e("ProfileScreen", "Error fetching profile: ${e.message}")
            }
            isLoading = false
        } else if (sessionToken == null) {
            isLoading = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
    ) {
        // Header — flush, no extra padding
        TopAppBar(
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Filled.Person, null, tint = Emerald600)
                    Text("Profile", fontWeight = FontWeight.Bold)
                }
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
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // --- PUBLIC SECTION ---
            item {
                Column(modifier = Modifier.padding(bottom = 2.dp)) {
                    Text("Public", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("These details are displayed on your public profile. Anyone can see them.", style = MaterialTheme.typography.bodySmall, color = Gray500)
                }
            }

            // Avatar — large centered circle like webapp, tap to change, NO label text
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(contentAlignment = Alignment.BottomEnd) {
                        // Large avatar circle
                        Box(
                            modifier = Modifier
                                .size(120.dp)
                                .clip(CircleShape)
                                .background(
                                    brush = Brush.verticalGradient(selectedAvatar.gradient)
                                )
                                .clickable { showAvatarPicker = true },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(selectedAvatar.emoji, fontSize = 56.sp)
                        }
                        // Camera edit button overlay
                        Surface(
                            shape = CircleShape,
                            color = Emerald600,
                            shadowElevation = 4.dp,
                            modifier = Modifier
                                .size(36.dp)
                                .clickable { showAvatarPicker = true }
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Icon(Icons.Filled.Edit, "Change avatar", tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }

            // Display name — clean tile, no chevron
            item {
                ProfileField(label = "Display name", value = displayName.ifEmpty { "Not set" }) {
                    onNavigateToEditDisplayName()
                }
            }

            // Contact methods (read-only)
            item {
                ProfileField(label = "Contact methods", value = userEmail.ifEmpty { "Not set" }) { }
            }

            // --- PRIVATE SECTION ---
            item {
                Column(modifier = Modifier.padding(top = 4.dp, bottom = 2.dp)) {
                    Text("Private", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("These details are used for travel and payments. They're never shown on your public profile.", style = MaterialTheme.typography.bodySmall, color = Gray500)
                }
            }

            item {
                ProfileField(label = "Legal name", value = legalName.ifEmpty { "Not set" }) {
                    onNavigateToEditLegalName()
                }
            }

            item {
                ProfileField(label = "Date of birth", value = if (dateOfBirth.isNotEmpty()) DateUtils.formatFull(dateOfBirth) else "Not set") {
                    onNavigateToEditDateOfBirth()
                }
            }

            item {
                ProfileField(label = "Phone number", value = phoneNumber.ifEmpty { "Not set" }) {
                    onNavigateToEditPhoneNumber()
                }
            }

            item {
                ProfileField(label = "Address", value = address.ifEmpty { "Not set" }) {
                    onNavigateToEditAddress()
                }
            }

            item { Spacer(Modifier.height(8.dp)) }
        }
        }
    }

    // Avatar Picker Dialog — grid only, no labels
    if (showAvatarPicker) {
        Dialog(onDismissRequest = { showAvatarPicker = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Edit profile picture", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showAvatarPicker = false }) {
                            Icon(Icons.Filled.Close, "Close")
                        }
                    }
                    Text("Choose a custom avatar", style = MaterialTheme.typography.bodySmall, color = Gray500)
                    Spacer(Modifier.height(16.dp))
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.height(340.dp)
                    ) {
                        items(AVATAR_OPTIONS) { option ->
                            Box(
                                modifier = Modifier
                                    .aspectRatio(1f)
                                    .clip(CircleShape)
                                    .background(brush = Brush.verticalGradient(option.gradient))
                                    .then(
                                        if (selectedAvatar.emoji == option.emoji)
                                            Modifier.padding(3.dp)
                                        else Modifier
                                    )
                                    .clickable {
                                        selectedAvatar = option
                                        showAvatarPicker = false
                                        // Save to backend
                                        if (sessionToken != null) {
                                            coroutineScope.launch(Dispatchers.IO) {
                                                saveAvatarToBackend(sessionToken, option.emoji)
                                            }
                                        }
                                        // Cache locally for instant feedback
                                        prefs.edit().putString("avatar_emoji", option.emoji).apply()
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(option.emoji, fontSize = 28.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileField(
    label: String,
    value: String,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = Gray500
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                color = if (value == "Not set") Gray500 else Gray900
            )
        }
    }
}

internal fun fetchProfileData(token: String): JSONObject? {
    val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()
    val request = Request.Builder()
        .url("https://www.mafutapass.com/api/auth/mobile-profile")
        .get()
        .addHeader("Authorization", "Bearer $token")
        .build()
    val response = client.newCall(request).execute()
    val body = response.body?.string() ?: return null
    if (!response.isSuccessful) return null
    return JSONObject(body)
}

internal fun saveAvatarToBackend(token: String, emoji: String) {
    try {
        val client = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
        val json = JSONObject().apply { put("avatar_emoji", emoji) }
        val requestBody = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("https://www.mafutapass.com/api/auth/mobile-profile")
            .patch(requestBody)
            .addHeader("Authorization", "Bearer $token")
            .build()
        client.newCall(request).execute()
    } catch (e: Exception) {
        android.util.Log.e("ProfileScreen", "Error saving avatar: ${e.message}")
    }
}
'''

# ═══════════════════════════════════════════════════════════════
# 2. AccountScreen.kt — lifecycle re-fetch, tile layout
# ═══════════════════════════════════════════════════════════════
account_screen = r'''package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.mafutapass.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

@Composable
fun AccountScreen(
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

    // Start with cached data immediately to avoid flash
    var displayName by remember { mutableStateOf(prefs.getString("cached_display_name", null) ?: userEmail.substringBefore("@")) }
    var displayEmail by remember { mutableStateOf(userEmail) }
    var avatarEmoji by remember { mutableStateOf(prefs.getString("avatar_emoji", null) ?: "\uD83D\uDC3B") }

    // Lifecycle-aware refresh: re-fetch when screen resumes (returning from Profile, etc.)
    var refreshKey by remember { mutableIntStateOf(0) }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                refreshKey++
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Single API fetch — triggers on first resume and every subsequent resume
    LaunchedEffect(refreshKey) {
        if (sessionToken != null && refreshKey > 0) {
            // First, update from cached SharedPreferences (instant)
            val cachedName = prefs.getString("cached_display_name", null)
            val cachedEmoji = prefs.getString("avatar_emoji", null)
            if (cachedName != null) displayName = cachedName
            if (cachedEmoji != null) avatarEmoji = cachedEmoji

            try {
                val profile = withContext(Dispatchers.IO) {
                    fetchAccountProfile(sessionToken)
                }
                if (profile != null) {
                    fun JSONObject.safeStr(key: String): String {
                        val v = optString(key, "")
                        return if (v == "null" || v.isBlank()) "" else v
                    }
                    val profileName = profile.optJSONObject("profile")?.let { p ->
                        p.safeStr("display_name").ifEmpty { null }
                    }
                    val clerkName = profile.optJSONObject("clerk")?.let { c ->
                        c.safeStr("fullName").ifEmpty { null }
                            ?: c.safeStr("firstName").ifEmpty { null }
                    }
                    val name = profileName ?: clerkName ?: userEmail.substringBefore("@")
                    displayName = name
                    displayEmail = profile.optJSONObject("clerk")?.safeStr("email")?.ifEmpty { null } ?: userEmail

                    val emoji = profile.optJSONObject("profile")?.safeStr("avatar_emoji")?.ifEmpty { null }
                    if (emoji != null) avatarEmoji = emoji

                    // Cache so BottomNav and next visit are instant
                    prefs.edit()
                        .putString("cached_display_name", name)
                        .putString("avatar_emoji", emoji ?: avatarEmoji)
                        .apply()
                }
            } catch (e: Exception) {
                android.util.Log.e("AccountScreen", "Error: ${e.message}")
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
    ) {
        // Profile Header — clean, no extra padding
        Surface(
            color = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .padding(horizontal = 16.dp, vertical = 14.dp)
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(
                            brush = Brush.verticalGradient(listOf(Emerald400, Emerald600))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(avatarEmoji, fontSize = 24.sp)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        displayName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        displayEmail,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray500
                    )
                }
            }
        }

        // ACCOUNT section — tile grid
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Text(
                "ACCOUNT",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = Gray500,
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
            )

            // 2-column tile grid for account items
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                val accountItems = listOf(
                    Triple(Icons.Filled.Person, "Profile", "profile"),
                    Triple(Icons.Filled.Settings, "Preferences", "preferences"),
                    Triple(Icons.Filled.Shield, "Security", "security"),
                    Triple(Icons.Filled.Info, "About", "about"),
                    Triple(Icons.Filled.Help, "Help", "help"),
                    Triple(Icons.Filled.Star, "What's new", "whats_new")
                )

                items(accountItems) { (icon, label, action) ->
                    AccountTile(
                        icon = icon,
                        label = label,
                        onClick = {
                            when (action) {
                                "profile" -> onNavigateToProfile()
                                "preferences" -> onNavigateToPreferences()
                                "security" -> onNavigateToSecurity()
                                "about" -> onNavigateToAbout()
                                "help" -> onNavigateToAbout()
                                "whats_new" -> onNavigateToAbout()
                            }
                        }
                    )
                }
            }

            // Sign Out at bottom
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                shadowElevation = 1.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
                    .clickable { onSignOut() }
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Filled.Logout, "Sign Out", tint = Red500, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("Sign Out", style = MaterialTheme.typography.titleMedium, color = Red500)
                }
            }
        }
    }
}

@Composable
private fun AccountTile(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.4f)
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = Emerald600,
                modifier = Modifier.size(28.dp)
            )
            Spacer(Modifier.height(12.dp))
            Text(
                label,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = Gray900
            )
        }
    }
}

private fun fetchAccountProfile(token: String): JSONObject? {
    val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()
    val request = Request.Builder()
        .url("https://www.mafutapass.com/api/auth/mobile-profile")
        .get()
        .addHeader("Authorization", "Bearer $token")
        .build()
    val response = client.newCall(request).execute()
    val body = response.body?.string() ?: return null
    if (!response.isSuccessful) return null
    return JSONObject(body)
}
'''

# ═══════════════════════════════════════════════════════════════
# 3. WorkspaceOverviewScreen.kt — remove ChevronRight from info fields
# ═══════════════════════════════════════════════════════════════
workspace_overview = r'''package com.mafutapass.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.ApiClient
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceOverviewScreen(
    workspaceId: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var workspace by remember { mutableStateOf<Workspace?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showInviteDialog by remember { mutableStateOf(false) }
    var showMoreMenu by remember { mutableStateOf(false) }
    var showShareDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var inviteInput by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()
    val shareUrl = "https://www.mafutapass.com/workspaces/$workspaceId/join"

    LaunchedEffect(workspaceId) {
        isLoading = true
        try {
            val fetched = withContext(Dispatchers.IO) {
                ApiClient.apiService.getWorkspace(workspaceId)
            }
            workspace = fetched
        } catch (e: Exception) {
            android.util.Log.e("WorkspaceOverview", "Failed to fetch: ${e.message}", e)
        }
        isLoading = false
    }

    val ws = workspace

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Emerald600)
        }
        return
    }

    if (ws == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Workspace not found", color = Gray500)
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
    ) {
        TopAppBar(
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Filled.Description, null, tint = Emerald600)
                    Text("Overview", fontWeight = FontWeight.Bold)
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { showInviteDialog = true },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.PersonAdd, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Invite", fontWeight = FontWeight.SemiBold)
                    }
                    Box {
                        OutlinedButton(
                            onClick = { showMoreMenu = !showMoreMenu },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("More", color = Gray700)
                            Icon(
                                if (showMoreMenu) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                                null,
                                tint = Gray700
                            )
                        }
                        DropdownMenu(
                            expanded = showMoreMenu,
                            onDismissRequest = { showMoreMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Share") },
                                onClick = {
                                    showMoreMenu = false
                                    showShareDialog = true
                                },
                                leadingIcon = { Icon(Icons.Filled.Share, null, tint = Emerald600) }
                            )
                            DropdownMenuItem(
                                text = { Text("Delete", color = Color(0xFFDC2626)) },
                                onClick = {
                                    showMoreMenu = false
                                    showDeleteDialog = true
                                },
                                leadingIcon = { Icon(Icons.Filled.Delete, null, tint = Color(0xFFDC2626)) }
                            )
                        }
                    }
                }
            }
            item {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    val hasImageAvatar = ws.avatar?.startsWith("http") == true
                    if (hasImageAvatar) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(ws.avatar)
                                .crossfade(true)
                                .build(),
                            contentDescription = ws.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(96.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(Emerald100)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(96.dp)
                                .background(
                                    brush = Brush.verticalGradient(
                                        listOf(Emerald600, Color(0xFF059669))
                                    ),
                                    shape = RoundedCornerShape(16.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = ws.avatar ?: ws.initials,
                                fontSize = 40.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }
            item {
                OverviewField(label = "Workspace name", value = ws.name)
            }
            item {
                OverviewField(
                    label = "Description",
                    value = ws.description ?: "One place for all your receipts and expenses."
                )
            }
            item {
                OverviewField(
                    label = "Default currency",
                    value = "${ws.currency} - ${ws.currencySymbol}",
                    subtitle = "All expenses on this workspace will be converted to this currency."
                )
            }
            item {
                OverviewField(
                    label = "Company address",
                    value = ws.address ?: "Add company address"
                )
            }
            item { Spacer(Modifier.height(16.dp)) }
        }
    }

    // Invite Dialog
    if (showInviteDialog) {
        Dialog(onDismissRequest = { showInviteDialog = false }) {
            Surface(shape = RoundedCornerShape(24.dp), color = Color.White, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Invite new members", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showInviteDialog = false }) { Icon(Icons.Filled.Close, "Close") }
                    }
                    Text(ws.name, style = MaterialTheme.typography.bodySmall, color = Gray500)
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = inviteInput, onValueChange = { inviteInput = it },
                        placeholder = { Text("Name, email, or phone number") },
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (inviteInput.isNotBlank()) {
                                Toast.makeText(context, "Invite sent to: $inviteInput", Toast.LENGTH_SHORT).show()
                                inviteInput = ""; showInviteDialog = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("Next", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(vertical = 8.dp))
                    }
                }
            }
        }
    }

    // Share Dialog
    if (showShareDialog) {
        Dialog(onDismissRequest = { showShareDialog = false }) {
            Surface(shape = RoundedCornerShape(24.dp), color = Color.White, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Share workspace", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showShareDialog = false }) { Icon(Icons.Filled.Close, "Close") }
                    }
                    Spacer(Modifier.height(16.dp))
                    Surface(shape = RoundedCornerShape(12.dp), color = Emerald50) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Share link", style = MaterialTheme.typography.bodySmall, color = Gray500)
                            Spacer(Modifier.height(4.dp))
                            Text(shareUrl, style = MaterialTheme.typography.bodySmall, color = Gray900)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Share URL", shareUrl))
                            Toast.makeText(context, "Link copied to clipboard!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.Share, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Copy Link", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (showDeleteDialog) {
        Dialog(onDismissRequest = { showDeleteDialog = false }) {
            Surface(shape = RoundedCornerShape(24.dp), color = Color.White, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier.size(64.dp).background(Color(0xFFFEE2E2), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.Delete, null, tint = Color(0xFFDC2626), modifier = Modifier.size(32.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("Delete workspace?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Are you sure you want to delete \"${ws.name}\"? This action cannot be undone and all data will be permanently lost.",
                        style = MaterialTheme.typography.bodyMedium, color = Gray500, textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(24.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(onClick = { showDeleteDialog = false }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    try {
                                        withContext(Dispatchers.IO) { ApiClient.apiService.deleteWorkspace(workspaceId) }
                                        showDeleteDialog = false; onBack()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Failed to delete workspace", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Delete") }
                    }
                }
            }
        }
    }
}

@Composable
private fun OverviewField(label: String, value: String, subtitle: String? = null) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp).fillMaxWidth()
        ) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = Gray500)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Gray900)
            if (subtitle != null) {
                Spacer(Modifier.height(4.dp))
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Gray500)
            }
        }
    }
}
'''

# Write all files
files = {
    os.path.join(SCREENS_DIR, "ProfileScreen.kt"): profile_screen,
    os.path.join(SCREENS_DIR, "AccountScreen.kt"): account_screen,
    os.path.join(SCREENS_DIR, "WorkspaceOverviewScreen.kt"): workspace_overview,
}

for path, content in files.items():
    with open(path, "w") as f:
        f.write(content)
    lines = content.count("\n") + 1
    print(f"  Wrote {os.path.basename(path)} ({lines} lines)")

print("\nDone!")
