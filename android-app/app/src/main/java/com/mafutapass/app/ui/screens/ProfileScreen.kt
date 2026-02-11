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

data class AvatarOption(
    val emoji: String,
    val gradient: List<Color>,
    val label: String
)

val AVATAR_OPTIONS = listOf(
    AvatarOption("🐻", listOf(Color(0xFFB45309), Color(0xFF92400E)), "Bear"),
    AvatarOption("🦁", listOf(Color(0xFFEA580C), Color(0xFFC2410C)), "Lion"),
    AvatarOption("🐯", listOf(Color(0xFFC2410C), Color(0xFF9A3412)), "Tiger"),
    AvatarOption("🦊", listOf(Color(0xFFDC2626), Color(0xFFB91C1C)), "Fox"),
    AvatarOption("🐺", listOf(Color(0xFF334155), Color(0xFF1E293B)), "Wolf"),
    AvatarOption("🦅", listOf(Color(0xFFA16207), Color(0xFF854D0E)), "Eagle"),
    AvatarOption("🦉", listOf(Color(0xFF4338CA), Color(0xFF3730A3)), "Owl"),
    AvatarOption("🐧", listOf(Color(0xFF475569), Color(0xFF334155)), "Penguin"),
    AvatarOption("🐘", listOf(Color(0xFF374151), Color(0xFF1F2937)), "Elephant"),
    AvatarOption("🦏", listOf(Color(0xFF57534E), Color(0xFF44403C)), "Rhino"),
    AvatarOption("🦒", listOf(Color(0xFFD97706), Color(0xFFB45309)), "Giraffe"),
    AvatarOption("🦓", listOf(Color(0xFF3F3F46), Color(0xFF27272A)), "Zebra"),
    AvatarOption("🐆", listOf(Color(0xFFCA8A04), Color(0xFFA16207)), "Leopard"),
    AvatarOption("🦈", listOf(Color(0xFF0E7490), Color(0xFF155E75)), "Shark"),
    AvatarOption("🐙", listOf(Color(0xFF7C3AED), Color(0xFF6D28D9)), "Octopus"),
    AvatarOption("🐬", listOf(Color(0xFF1D4ED8), Color(0xFF1E40AF)), "Dolphin"),
    AvatarOption("🐳", listOf(Color(0xFF0369A1), Color(0xFF075985)), "Whale"),
    AvatarOption("🦦", listOf(Color(0xFF0F766E), Color(0xFF115E59)), "Otter"),
    AvatarOption("🦘", listOf(Color(0xFFA16207), Color(0xFFB45309)), "Kangaroo"),
    AvatarOption("🦌", listOf(Color(0xFFB45309), Color(0xFFEA580C)), "Deer"),
    AvatarOption("🐎", listOf(Color(0xFF57534E), Color(0xFF44403C)), "Horse"),
    AvatarOption("🦬", listOf(Color(0xFF3F3F46), Color(0xFF374151)), "Bison"),
    AvatarOption("🐿️", listOf(Color(0xFFEA580C), Color(0xFFB45309)), "Squirrel"),
    AvatarOption("🦔", listOf(Color(0xFFD97706), Color(0xFFEA580C)), "Hedgehog"),
    AvatarOption("🐢", listOf(Color(0xFF047857), Color(0xFF065F46)), "Turtle"),
    AvatarOption("🐊", listOf(Color(0xFF15803D), Color(0xFF166534)), "Crocodile"),
    AvatarOption("🦜", listOf(Color(0xFF059669), Color(0xFF047857)), "Parrot"),
    AvatarOption("🦚", listOf(Color(0xFF2563EB), Color(0xFF1D4ED8)), "Peacock"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onBack: () -> Unit) {
    var showAvatarPicker by remember { mutableStateOf(false) }
    var selectedAvatar by remember { mutableStateOf(AVATAR_OPTIONS[0]) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
    ) {
        // Header
        TopAppBar(
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Person,
                        contentDescription = null,
                        tint = Emerald600
                    )
                    Text("Profile", fontWeight = FontWeight.Bold)
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.White
            )
        )
        
        // Content
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Avatar Section
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showAvatarPicker = true }
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(
                                    brush = Brush.verticalGradient(selectedAvatar.gradient)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = selectedAvatar.emoji,
                                fontSize = 40.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Change avatar",
                            style = MaterialTheme.typography.titleMedium,
                            color = Emerald600,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
            
            // Profile Fields
            item {
                ProfileField(
                    label = "Display name",
                    value = "Ian Njenga",
                    onClick = { }
                )
            }
            
            item {
                ProfileField(
                    label = "Phone number",
                    value = "Not set",
                    onClick = { }
                )
            }
            
            item {
                ProfileField(
                    label = "Date of birth",
                    value = "Not set",
                    onClick = { }
                )
            }
            
            item {
                ProfileField(
                    label = "Legal name",
                    value = "Not set",
                    onClick = { }
                )
            }
            
            item {
                ProfileField(
                    label = "Address",
                    value = "Not set",
                    onClick = { }
                )
            }
        }
    }
    
    // Avatar Picker Dialog
    if (showAvatarPicker) {
        Dialog(onDismissRequest = { showAvatarPicker = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Choose Avatar",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { showAvatarPicker = false }) {
                            Icon(
                                imageVector = Icons.Filled.Close,
                                contentDescription = "Close"
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(4),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.height(400.dp)
                    ) {
                        items(AVATAR_OPTIONS) { option ->
                            Box(
                                modifier = Modifier
                                    .aspectRatio(1f)
                                    .clip(CircleShape)
                                    .background(
                                        brush = Brush.verticalGradient(option.gradient)
                                    )
                                    .clickable {
                                        selectedAvatar = option
                                        showAvatarPicker = false
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = option.emoji,
                                    fontSize = 32.sp
                                )
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
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
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
            
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = "Edit",
                tint = Gray500
            )
        }
    }
}
