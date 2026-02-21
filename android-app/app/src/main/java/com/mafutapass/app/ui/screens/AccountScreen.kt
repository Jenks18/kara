package com.mafutapass.app.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
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
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.data.AvatarManager
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.ui.components.EmojiImage
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.ProfileViewModel

@Composable
fun AccountScreen(
    refreshTrigger: Int = 0,
    avatarManager: AvatarManager,
    onNavigateToProfile: () -> Unit = {},
    onNavigateToPreferences: () -> Unit = {},
    onNavigateToSecurity: () -> Unit = {},
    onNavigateToAbout: () -> Unit = {},
    onSignOut: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val profileState by viewModel.profileState.collectAsState()

    val isLoading = profileState is NetworkResult.Loading
    val user = (profileState as? NetworkResult.Success)?.data
    val displayName = user?.displayName?.ifEmpty { null }
        ?: user?.firstName?.ifEmpty { null }
        ?: user?.email?.substringBefore("@")
    val displayEmail = user?.email ?: ""
    val avatarEmoji by avatarManager.emoji.collectAsState()

    // Re-fetch when navigating back from edit screens
    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) viewModel.loadProfile()
    }

    val lazyListState = rememberLazyListState()
    val isScrolled = remember {
        derivedStateOf { lazyListState.firstVisibleItemIndex > 0 || lazyListState.firstVisibleItemScrollOffset > 0 }
    }
    val headerElevation by animateDpAsState(
        targetValue = if (isScrolled.value) 4.dp else 0.dp,
        label = "headerElevation"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        // Profile header
        Surface(
            color = MaterialTheme.colorScheme.surface.copy(
                alpha = if (isScrolled.value) 0.95f else 1f
            ),
            shadowElevation = headerElevation,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.statusBarsPadding().padding(horizontal = 16.dp, vertical = 14.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 4.dp,
                    modifier = Modifier.size(48.dp)
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary
                            )
                        } else {
                            EmojiImage(avatarEmoji, size = 24.dp)
                        }
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (isLoading) {
                        // Skeleton placeholders — no stale data shown
                        Box(
                            modifier = Modifier
                                .width(130.dp).height(14.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                        )
                        Box(
                            modifier = Modifier
                                .width(180.dp).height(12.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.13f))
                        )
                    } else {
                        Text(displayName ?: "", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                        Text(displayEmail, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // Menu sections — 1x1 rows, no grid, no chevrons
        LazyColumn(
            state = lazyListState,
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
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
                Triple(Icons.Filled.Info, "About", "about"),
            )
            items(generalItems) { (icon, label, action) ->
                MenuRow(icon = icon, label = label) {
                    when (action) {
                        "about" -> onNavigateToAbout()
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
                        modifier = Modifier
                            .padding(horizontal = 16.dp, vertical = 18.dp)
                            .fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Filled.Logout, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(16.dp))
                        Text("Sign Out", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.error)
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun MenuRow(icon: ImageVector, label: String, isExternal: Boolean = false, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 18.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
            Spacer(Modifier.width(16.dp))
            Text(
                label,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            if (isExternal) {
                Icon(
                    imageVector = Icons.Filled.OpenInNew,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            } else {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
