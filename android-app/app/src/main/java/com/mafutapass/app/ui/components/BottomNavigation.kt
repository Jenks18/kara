package com.mafutapass.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.mafutapass.app.data.AvatarManager
import com.mafutapass.app.ui.Screen
import com.mafutapass.app.ui.theme.AppTheme
import com.mafutapass.app.ui.theme.Blue500
import com.mafutapass.app.ui.theme.Blue600
import com.mafutapass.app.ui.components.EmojiImage

data class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector? = null,
    val isAvatar: Boolean = false
)

@Composable
fun BottomNavBar(navController: NavController, avatarManager: AvatarManager) {
    val leftItems = listOf(
        BottomNavItem(Screen.Home.route, "Home", Icons.Filled.Home),
        BottomNavItem(Screen.Reports.route, "Reports", Icons.Filled.Assessment)
    )
    
    val rightItems = listOf(
        BottomNavItem(Screen.Workspaces.route, "Workspaces", Icons.Filled.Business),
        BottomNavItem(Screen.Account.route, "Account", isAvatar = true)
    )

    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    val avatarEmoji by avatarManager.emoji.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .navigationBarsPadding()
    ) {
        // Background navigation bar
        NavigationBar(
            containerColor = MaterialTheme.colorScheme.surface,
            tonalElevation = 0.dp,
            windowInsets = WindowInsets(0, 0, 0, 0),
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
        ) {
            // Left items
            leftItems.forEach { screen ->
                val isSelected = currentRoute?.substringBefore("?") == screen.route
                NavigationBarItem(
                    icon = {
                        if (screen.icon != null) {
                            Icon(
                                imageVector = screen.icon,
                                contentDescription = screen.title,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    },
                    label = {
                        Text(
                            text = screen.title,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                            softWrap = false,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    selected = isSelected,
                    onClick = {
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = false
                            }
                            launchSingleTop = true
                            restoreState = false
                        }
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.surface,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                )
            }
            
            // Spacer for center button
            Spacer(modifier = Modifier.weight(1f))
            
            // Right items
            rightItems.forEach { screen ->
                val isSelected = currentRoute?.substringBefore("?") == screen.route
                NavigationBarItem(
                    icon = {
                        if (screen.isAvatar) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surface)
                                    .then(
                                        if (isSelected) Modifier.border(
                                            width = 2.dp,
                                            color = MaterialTheme.colorScheme.primary,
                                            shape = CircleShape
                                        )
                                        else Modifier
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                EmojiImage(
                                    emoji = avatarEmoji,
                                    size = 14.dp
                                )
                            }
                        } else if (screen.icon != null) {
                            Icon(
                                imageVector = screen.icon,
                                contentDescription = screen.title,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    },
                    label = {
                        Text(
                            text = screen.title,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                            softWrap = false,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    selected = isSelected,
                    onClick = {
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = false
                            }
                            launchSingleTop = true
                            restoreState = false
                        }
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.surface,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                )
            }
        }
        
        // Elevated center scan button
        FloatingActionButton(
            onClick = {
                navController.navigate(Screen.Create.route) {
                    popUpTo(navController.graph.startDestinationId) {
                        saveState = false
                    }
                    launchSingleTop = true
                    restoreState = false
                }
            },
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-16).dp)
                .size(56.dp),
            containerColor = Blue500,
            elevation = FloatingActionButtonDefaults.elevation(
                defaultElevation = 8.dp,
                pressedElevation = 12.dp
            )
        ) {
            Icon(
                imageVector = Icons.Filled.DocumentScanner,
                contentDescription = "Scan",
                tint = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}
