package com.mafutapass.app.ui.screens

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafutapass.app.auth.TokenRepository
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

        val validToken = TokenRepository.getInstance(context).getValidTokenAsync()
        if (validToken != null) {
            try {
                val result = withContext(Dispatchers.IO) { fetchAccountProfile(validToken) }
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
            .background(AppTheme.colors.backgroundGradient)
    ) {
        // Profile header
        Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier.size(48.dp).clip(CircleShape)
                        .background(AppTheme.colors.primaryGradient),
                    contentAlignment = Alignment.Center
                ) { Text(avatarEmoji, fontSize = 24.sp) }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    Text(displayEmail, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                    color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 1.sp, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp, start = 4.dp))
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
                    color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 1.sp, modifier = Modifier.padding(top = 16.dp, bottom = 4.dp, start = 4.dp))
            }
            val generalItems = listOf(
                Triple(Icons.Filled.Help, "Help", "help"),
                Triple(Icons.Filled.Star, "What's new", "whats_new"),
                Triple(Icons.Filled.Info, "About", "about"),
                Triple(Icons.Filled.Build, "Troubleshoot", "troubleshoot"),
            )
            items(generalItems) { (icon, label, action) ->
                MenuRow(icon = icon, label = label) {
                    when (action) {
                        "about" -> onNavigateToAbout()
                        "help", "whats_new", "troubleshoot" -> {
                            // Empty click handlers - these are placeholders like in webapp
                        }
                    }
                }
            }

            // Sign out
            item {
                Spacer(Modifier.height(12.dp))
                Surface(
                    shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth().clickable { onSignOut() }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Filled.Logout, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(14.dp))
                        Text("Sign Out", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.error)
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
        shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(imageVector = icon, contentDescription = label, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(14.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

private fun fetchAccountProfile(token: String): JSONObject? {
    val client = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()
    val request = Request.Builder()
        .url("https://www.mafutapass.com/api/auth/mobile-profile")
        .get().addHeader("Authorization", "Bearer $token").build()
    val response = client.newCall(request).execute()
    val body = response.body.string()
    if (!response.isSuccessful) return null
    return JSONObject(body)
}
