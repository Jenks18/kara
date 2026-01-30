package com.mafutapass.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mafutapass.app.ui.components.BottomNavBar
import com.mafutapass.app.ui.components.Screen
import com.mafutapass.app.ui.screens.*
import com.mafutapass.app.ui.theme.MafutaPassTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MafutaPassTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MafutaPassApp()
                }
            }
        }
    }
}

@Composable
fun MafutaPassApp() {
    val navController = rememberNavController()
    
    Scaffold(
        bottomBar = { BottomNavBar(navController) }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Reports.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.Reports.route) {
                ReportsScreen()
            }
            composable(Screen.Create.route) {
                CreateScreen()
            }
            composable(Screen.Workspaces.route) {
                WorkspacesScreen()
            }
            composable(Screen.Account.route) {
                AccountScreen()
            }
        }
    }
}
