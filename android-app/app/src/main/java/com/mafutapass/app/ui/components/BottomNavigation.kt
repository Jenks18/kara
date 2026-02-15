package com.mafutapass.app.ui.components

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.BusinessCenter
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.mafutapass.app.ui.Screen
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.ui.theme.AppTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector? = null,
    val isAvatar: Boolean = false
)

@Composable
fun BottomNavBar(navController: NavController) {
    val items = listOf(
        BottomNavItem(Screen.Reports.route, "Reports", Icons.Filled.Assessment),
        BottomNavItem(Screen.Create.route, "Create", Icons.Filled.AddCircle),
        BottomNavItem(Screen.Workspaces.route, "Workspaces", Icons.Filled.BusinessCenter),
        BottomNavItem(Screen.Account.route, "Account", isAvatar = true)
    )

    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

    // Load avatar emoji from SharedPreferences (cached from profile API)
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", Context.MODE_PRIVATE)
    var avatarEmoji by remember { mutableStateOf(prefs.getString("avatar_emoji", null) ?: "\uD83D\uDC3B") }

    // Listen for changes when navigating back to account tab
    LaunchedEffect(currentRoute) {
        val cached = prefs.getString("avatar_emoji", null)
        if (cached != null) avatarEmoji = cached
    }

    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
        modifier = Modifier.height(80.dp)
    ) {
        items.forEach { screen ->
            val isSelected = currentRoute == screen.route

            NavigationBarItem(
                icon = {
                    if (screen.isAvatar) {
                        // Show avatar emoji in a gradient circle — like webapp
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(
                                    brush = AppTheme.colors.primaryGradient
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = avatarEmoji,
                                fontSize = 14.sp
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
                        style = MaterialTheme.typography.bodySmall
                    )
                },
                selected = isSelected,
                onClick = {
                    if (currentRoute != screen.route) {
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
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
}
