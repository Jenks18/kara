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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.compose.material3.Text
import com.clerk.api.Clerk
import com.mafutapass.app.ui.components.BottomNavBar
import com.mafutapass.app.ui.Screen
import com.mafutapass.app.ui.screens.*
import com.mafutapass.app.ui.theme.MafutaPassTheme
import com.mafutapass.app.viewmodel.AuthViewModel
import com.mafutapass.app.viewmodel.AuthState
import com.mafutapass.app.viewmodel.OAuthViewModel
import kotlinx.coroutines.launch
import androidx.compose.runtime.mutableStateOf

class MainActivity : ComponentActivity() {
    // Store OAuth callback URI to handle in composable
    private val oauthCallbackUri = mutableStateOf<Uri?>(null)
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize Clerk SDK
        try {
            Clerk.initialize(this, "pk_live_Y2xlcmsubWFmdXRhcGFzcy5jb20k")
            Log.d("MainActivity", "✅ Clerk initialized successfully")
        } catch (e: Exception) {
            Log.e("MainActivity", "❌ Failed to initialize Clerk: ${e.message}")
        }
        
        setContent {
            MafutaPassTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MafutaPassApp(oauthCallbackUri = oauthCallbackUri.value)
                }
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        Log.d("MainActivity", "onResume - checking auth session")
        Log.d("MainActivity", "Current user: ${Clerk.user?.id}, has session: ${Clerk.session != null}")
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        
        // Handle auth callback from web app
        intent.data?.let { uri ->
            Log.d("MainActivity", "📥 Received deep link: $uri")
            if (uri.scheme == "mafutapass" && uri.host == "auth") {
                Log.d("MainActivity", "🔐 Processing auth callback")
                // Store URI to be handled by composable
                oauthCallbackUri.value = uri
            }
        }
    }
}

@Composable
fun MafutaPassApp(oauthCallbackUri: Uri? = null) {
    val authViewModel: AuthViewModel = viewModel()
    val oauthViewModel: OAuthViewModel = viewModel()
    val authState by authViewModel.authState.collectAsState()
    val navController = rememberNavController()
    
    // Handle auth callback when received
    if (oauthCallbackUri != null) {
        androidx.compose.runtime.LaunchedEffect(oauthCallbackUri) {
            Log.d("MafutaPassApp", "⚙️ Handling auth callback")
            oauthViewModel.handleAuthCallback(oauthCallbackUri)
        }
    }

    when (authState) {
        AuthState.Loading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }
        AuthState.SignedOut -> {
            // Show sign-in screen
            SignInOrUpScreen()
        }
        AuthState.SignedIn -> {
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
                }
            }
        }
    }
}
