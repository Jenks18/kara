package com.mafutapass.app.ui.screens

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class MenuItem(
    val icon: ImageVector,
    val title: String,
    val showExternal: Boolean,
    val showChevron: Boolean = !showExternal
)

@Composable
fun AccountScreen(
    onNavigateToProfile: () -> Unit = {},
    onNavigateToPreferences: () -> Unit = {},
    onNavigateToSecurity: () -> Unit = {},
    onNavigateToAbout: () -> Unit = {},
    onSignOut: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    
    // Get stored user data from SharedPreferences
    val userEmail = prefs.getString("user_email", null) ?: "User"
    val userId = prefs.getString("user_id", null)
    val sessionToken = prefs.getString("session_token", null)
    val storedFirstName = prefs.getString("first_name", null)
    
    // Profile data from API
    var displayName by remember { mutableStateOf(storedFirstName ?: userEmail.substringBefore("@")) }
    var displayEmail by remember { mutableStateOf(userEmail) }
    var avatarEmoji by remember { mutableStateOf("🐻") }
    
    // Fetch profile from backend on load
    LaunchedEffect(userId, sessionToken) {
        if (sessionToken != null && userId != null) {
            try {
                val profile = withContext(Dispatchers.IO) {
                    fetchProfile(sessionToken)
                }
                if (profile != null) {
                    val clerkName = profile.optJSONObject("clerk")?.let { clerk ->
                        clerk.optString("fullName").takeIf { it.isNotEmpty() }
                            ?: clerk.optString("firstName").takeIf { it.isNotEmpty() }
                    }
                    val profileName = profile.optJSONObject("profile")?.let { p ->
                        p.optString("display_name").takeIf { it.isNotEmpty() }
                            ?: p.optString("first_name").takeIf { it.isNotEmpty() }
                    }
                    displayName = profileName ?: clerkName ?: userEmail.substringBefore("@")
                    displayEmail = profile.optJSONObject("clerk")?.optString("email")?.takeIf { it.isNotEmpty() } ?: userEmail
                    
                    profile.optJSONObject("profile")?.optString("avatar_emoji")?.takeIf { it.isNotEmpty() }?.let {
                        avatarEmoji = it
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("AccountScreen", "Error fetching profile: ${e.message}")
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
        // Profile Header
        Surface(
            color = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .padding(16.dp)
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(
                            brush = Brush.verticalGradient(
                                listOf(Emerald400, Emerald600)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = avatarEmoji,
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Text(
                        text = displayName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        text = displayEmail,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray500
                    )
                }
            }
        }
        
        // Content
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                MenuSection(
                    title = "ACCOUNT",
                    items = listOf(
                        MenuItem(Icons.Filled.Person, "Profile", false),
                        MenuItem(Icons.Filled.Settings, "Preferences", false),
                        MenuItem(Icons.Filled.Shield, "Security", false)
                    ),
                    onItemClick = { item ->
                        when (item.title) {
                            "Profile" -> onNavigateToProfile()
                            "Preferences" -> onNavigateToPreferences()
                            "Security" -> onNavigateToSecurity()
                        }
                    }
                )
            }
            
            item {
                MenuSection(
                    title = "GENERAL",
                    items = listOf(
                        MenuItem(Icons.Filled.Help, "Help", true),
                        MenuItem(Icons.Filled.Star, "What's new", true),
                        MenuItem(Icons.Filled.Info, "About", false),
                        MenuItem(Icons.Filled.Build, "Troubleshoot", false)
                    ),
                    onItemClick = { item ->
                        when (item.title) {
                            "About" -> onNavigateToAbout()
                        }
                    }
                )
            }
            
            item {
                // Sign Out Button
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { 
                            onSignOut()
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Logout,
                            contentDescription = "Sign Out",
                            tint = Red500,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = "Sign Out",
                            style = MaterialTheme.typography.titleMedium,
                            color = Red500
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MenuSection(
    title: String,
    items: List<MenuItem>,
    onItemClick: (MenuItem) -> Unit = {}
) {
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            color = Gray500,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 12.dp)
        )
        
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Color.White,
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column {
                items.forEachIndexed { index, item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onItemClick(item) }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.title,
                            tint = Gray600,
                            modifier = Modifier.size(20.dp)
                        )
                        
                        Spacer(modifier = Modifier.width(16.dp))
                        
                        Text(
                            text = item.title,
                            style = MaterialTheme.typography.titleMedium,
                            color = Gray900,
                            modifier = Modifier.weight(1f)
                        )
                        
                        if (item.showExternal) {
                            Icon(
                                imageVector = Icons.Filled.OpenInNew,
                                contentDescription = "External",
                                tint = Gray500,
                                modifier = Modifier.size(14.dp)
                            )
                        } else if (item.showChevron) {
                            Icon(
                                imageVector = Icons.Filled.ChevronRight,
                                contentDescription = "Navigate",
                                tint = Gray500,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                    
                    if (index < items.size - 1) {
                        HorizontalDivider(
                            color = Gray100,
                            modifier = Modifier.padding(start = 60.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Fetch user profile from backend API using JWT token.
 */
private fun fetchProfile(token: String): JSONObject? {
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

    if (!response.isSuccessful) {
        android.util.Log.e("AccountScreen", "Profile fetch failed: ${response.code} - $body")
        return null
    }

    return JSONObject(body)
}
