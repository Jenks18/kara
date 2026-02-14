package com.mafutapass.app.ui.screens

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
