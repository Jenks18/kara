package com.mafutapass.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.mafutapass.app.ui.theme.Emerald600

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Reports : Screen("reports", "Reports", Icons.Filled.Description)
    object Create : Screen("create", "Create", Icons.Filled.AddCircle)
    object Workspaces : Screen("workspaces", "Workspaces", Icons.Filled.BusinessCenter)
    object Account : Screen("account", "Account", Icons.Filled.AccountCircle)
}

@Composable
fun BottomNavBar(navController: NavController) {
    val items = listOf(
        Screen.Reports,
        Screen.Create,
        Screen.Workspaces,
        Screen.Account
    )
    
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp,
        modifier = Modifier.height(80.dp)
    ) {
        items.forEach { screen ->
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = screen.icon,
                        contentDescription = screen.title,
                        modifier = Modifier.size(24.dp)
                    )
                },
                label = {
                    Text(
                        text = screen.title,
                        style = MaterialTheme.typography.bodySmall
                    )
                },
                selected = currentRoute == screen.route,
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
                    selectedIconColor = Emerald600,
                    selectedTextColor = Emerald600,
                    indicatorColor = MaterialTheme.colorScheme.surface,
                    unselectedIconColor = Emerald600,
                    unselectedTextColor = Emerald600
                )
            )
        }
    }
}
