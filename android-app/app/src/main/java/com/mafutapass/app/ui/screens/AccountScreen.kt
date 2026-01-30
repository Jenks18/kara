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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@Composable
fun AccountScreen() {
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
                        .background(Gray200),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.BusinessCenter,
                        contentDescription = "Profile",
                        tint = Gray500,
                        modifier = Modifier.size(28.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Text(
                        text = "Ian Njenga",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        text = "foronjenga19@gmail.com",
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
                    )
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
                    )
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
                        .clickable { }
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

data class MenuItem(
    val icon: ImageVector,
    val title: String,
    val showExternal: Boolean,
    val showChevron: Boolean = !showExternal
)

@Composable
fun MenuSection(title: String, items: List<MenuItem>) {
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
                            .clickable { }
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
                        Divider(
                            color = Gray100,
                            modifier = Modifier.padding(start = 60.dp)
                        )
                    }
                }
            }
        }
    }
}
