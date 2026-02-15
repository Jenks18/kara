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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.DateUtils
import com.mafutapass.app.viewmodel.ProfileViewModel

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
    onNavigateToEditAddress: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel()
) {
    var showAvatarPicker by remember { mutableStateOf(false) }
    var selectedAvatar by remember { mutableStateOf(AVATAR_OPTIONS[0]) }

    val profileState by viewModel.profileState.collectAsState()

    // Derived display values from ViewModel state
    val user = (profileState as? NetworkResult.Success)?.data
    val displayName = user?.displayName ?: ""
    val userEmail = user?.email ?: ""
    val phoneNumber = user?.phoneNumber ?: ""
    val dateOfBirth = user?.dateOfBirth ?: ""
    val legalName = listOfNotNull(
        user?.legalFirstName?.ifEmpty { null },
        user?.legalLastName?.ifEmpty { null }
    ).joinToString(" ")
    val address = listOfNotNull(
        user?.addressLine1?.ifEmpty { null },
        user?.city?.ifEmpty { null },
        user?.state?.ifEmpty { null },
        user?.postalCode?.ifEmpty { null }
    ).joinToString(", ")

    // Restore avatar from profile data
    LaunchedEffect(user?.avatarEmoji) {
        val emoji = user?.avatarEmoji
        if (!emoji.isNullOrEmpty()) {
            AVATAR_OPTIONS.find { it.emoji == emoji }?.let { selectedAvatar = it }
        }
    }

    // Re-fetch when navigating back from edit screens
    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) viewModel.loadProfile()
    }

    Column(
        modifier = Modifier.fillMaxSize()
            .background(AppTheme.colors.backgroundGradient)
    ) {
        TopAppBar(
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.Person, null, tint = MaterialTheme.colorScheme.primary)
                    Text("Profile", fontWeight = FontWeight.Bold)
                }
            },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0)
        )

        // Show loading indicator while profile data is being fetched
        if (profileState is NetworkResult.Loading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else {

        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Column(modifier = Modifier.padding(bottom = 6.dp)) {
                    Text("Public", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    Text("These details are displayed on your public profile.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // Avatar — large centered, no label text
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                    Box(contentAlignment = Alignment.BottomEnd) {
                        Box(
                            modifier = Modifier.size(120.dp).clip(CircleShape)
                                .background(brush = Brush.verticalGradient(selectedAvatar.gradient))
                                .clickable { showAvatarPicker = true },
                            contentAlignment = Alignment.Center
                        ) { Text(selectedAvatar.emoji, fontSize = 56.sp) }
                        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primary, shadowElevation = 4.dp,
                            modifier = Modifier.size(36.dp).clickable { showAvatarPicker = true }) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Icon(Icons.Filled.Edit, "Change avatar", tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }

            item { ProfileField("Display name", displayName.ifEmpty { "Not set" }) { onNavigateToEditDisplayName() } }
            item { ProfileField("Contact methods", userEmail.ifEmpty { "Not set" }) { } }

            item {
                Column(modifier = Modifier.padding(top = 8.dp, bottom = 6.dp)) {
                    Text("Private", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    Text("These details are used for travel and payments.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            item { ProfileField("Legal name", legalName.ifEmpty { "Not set" }) { onNavigateToEditLegalName() } }
            item { ProfileField("Date of birth", if (dateOfBirth.isNotEmpty()) DateUtils.formatFull(dateOfBirth) else "Not set") { onNavigateToEditDateOfBirth() } }
            item { ProfileField("Phone number", phoneNumber.ifEmpty { "Not set" }) { onNavigateToEditPhoneNumber() } }
            item { ProfileField("Address", address.ifEmpty { "Not set" }) { onNavigateToEditAddress() } }
            item { Spacer(Modifier.height(16.dp)) }
        }
        } // end else (not loading)
    }

    // Avatar picker dialog
    if (showAvatarPicker) {
        Dialog(onDismissRequest = { showAvatarPicker = false }) {
            Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Edit profile picture", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showAvatarPicker = false }) { Icon(Icons.Filled.Close, "Close") }
                    }
                    Text("Choose a custom avatar", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                        viewModel.updateAvatar(option.emoji)
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
    Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(modifier = Modifier.padding(18.dp).fillMaxWidth()) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium,
                color = if (value == "Not set") MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
        }
    }
}
