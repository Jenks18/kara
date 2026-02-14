package com.mafutapass.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.compose.material3.Text
import com.mafutapass.app.ui.components.BottomNavBar
import com.mafutapass.app.ui.Screen
import com.mafutapass.app.ui.screens.*
import com.mafutapass.app.ui.theme.MafutaPassTheme
import com.mafutapass.app.viewmodel.AuthViewModel
import com.mafutapass.app.viewmodel.AuthState

class MainActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Auth is handled via backend proxy — no Clerk SDK initialization needed
        Log.d("MainActivity", "✅ MainActivity created")
        
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
    
    override fun onResume() {
        super.onResume()
        Log.d("MainActivity", "onResume - auth managed via SharedPreferences")
    }
}

@Composable
fun MafutaPassApp() {
    val context = LocalContext.current
    val authViewModel: AuthViewModel = viewModel(
        factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return AuthViewModel(context.applicationContext as android.app.Application) as T
            }
        }
    )
    val authState by authViewModel.authState.collectAsState()
    val navController = rememberNavController()

    when (authState) {
        AuthState.Loading -> {
            android.util.Log.d("MainActivity", "Auth state: Loading")
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }
        AuthState.SignedOut -> {
            android.util.Log.d("MainActivity", "Auth state: SignedOut - showing sign-in screen")
            // Show sign-in screen with key to force recomposition
            key(authState) {
                SignInOrUpScreen()
            }
        }
        AuthState.SignedIn -> {
            android.util.Log.d("MainActivity", "Auth state: SignedIn - showing main app")
            
            // Username setup now happens during sign-in flow via OAuth ViewModel
            // Show main app
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
                            WorkspacesScreen(
                                onNavigateToNewWorkspace = { navController.navigate("workspaces/new") },
                                onNavigateToWorkspaceDetail = { id -> navController.navigate("workspaces/$id") }
                            )
                        }
                        composable(Screen.Account.route) {
                            AccountScreen(
                                onNavigateToProfile = { navController.navigate("profile") },
                                onNavigateToPreferences = { navController.navigate("preferences") },
                                onNavigateToSecurity = { navController.navigate("security") },
                                onNavigateToAbout = { navController.navigate("about") },
                                onSignOut = { authViewModel.signOut() }
                            )
                        }
                        composable("profile") {
                            ProfileScreen(onBack = { navController.popBackStack() })
                        }
                        composable("preferences") {
                            PreferencesScreen(onBack = { navController.popBackStack() })
                        }
                        composable("security") {
                            SecurityScreen(onBack = { navController.popBackStack() })
                        }
                        composable("about") {
                            AboutScreen(onBack = { navController.popBackStack() })
                        }
                        composable("workspaces/new") {
                            NewWorkspaceScreen(
                                onBack = { navController.popBackStack() },
                                onConfirm = { navController.popBackStack() }
                            )
                        }
                        composable("workspaces/{workspaceId}") { backStackEntry ->
                            val workspaceId = backStackEntry.arguments?.getString("workspaceId") ?: return@composable
                            WorkspaceDetailScreen(
                                workspaceId = workspaceId,
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }
                }
        }
    }
}
