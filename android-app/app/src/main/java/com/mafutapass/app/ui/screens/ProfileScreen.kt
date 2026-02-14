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
