package com.mafutapass.app

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mafutapass.app.ui.components.BottomNavBar
import com.mafutapass.app.ui.Screen
import com.mafutapass.app.ui.screens.*
import com.mafutapass.app.ui.theme.MafutaPassTheme
import com.mafutapass.app.viewmodel.AuthViewModel
import com.mafutapass.app.viewmodel.AuthState
import com.mafutapass.app.viewmodel.ThemeViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d("MainActivity", "MainActivity created")
        setContent {
            val themeViewModel: ThemeViewModel = viewModel(
                factory = object : ViewModelProvider.Factory {
                    override fun <T : ViewModel> create(modelClass: Class<T>): T {
                        @Suppress("UNCHECKED_CAST")
                        return ThemeViewModel(application) as T
                    }
                }
            )
            val themeMode by themeViewModel.themeMode.collectAsState()

            val isDark = when (themeMode) {
                ThemeViewModel.ThemeMode.Light -> false
                ThemeViewModel.ThemeMode.Dark -> true
                ThemeViewModel.ThemeMode.System -> isSystemInDarkTheme()
            }

            MafutaPassTheme(darkTheme = isDark) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    MafutaPassApp(themeViewModel = themeViewModel)
                }
            }
        }
    }
}

@Composable
fun MafutaPassApp(themeViewModel: ThemeViewModel) {
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

    // Refresh triggers — incremented when returning from sub-screens after saves
    var profileRefreshKey by remember { mutableIntStateOf(0) }
    var accountRefreshKey by remember { mutableIntStateOf(0) }

    when (authState) {
        AuthState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
        AuthState.SignedOut -> {
            key(authState) { SignInOrUpScreen() }
        }
        AuthState.SignedIn -> {
            Scaffold(bottomBar = { BottomNavBar(navController) }) { paddingValues ->
                NavHost(navController = navController, startDestination = Screen.Reports.route,
                    modifier = Modifier.padding(paddingValues)) {

                    composable(Screen.Reports.route) { ReportsScreen() }
                    composable(Screen.Create.route) { CreateScreen() }
                    composable(Screen.Workspaces.route) {
                        WorkspacesScreen(
                            onNavigateToNewWorkspace = { navController.navigate("workspaces/new") },
                            onNavigateToWorkspaceDetail = { id -> navController.navigate("workspaces/$id") }
                        )
                    }
                    composable(Screen.Account.route) {
                        AccountScreen(
                            refreshTrigger = accountRefreshKey,
                            onNavigateToProfile = { navController.navigate("profile") },
                            onNavigateToPreferences = { navController.navigate("preferences") },
                            onNavigateToSecurity = { navController.navigate("security") },
                            onNavigateToAbout = { navController.navigate("about") },
                            onSignOut = { authViewModel.signOut() }
                        )
                    }
                    composable("profile") {
                        ProfileScreen(
                            refreshTrigger = profileRefreshKey,
                            onBack = { accountRefreshKey++; navController.popBackStack() },
                            onNavigateToEditDisplayName = { navController.navigate("profile/edit-display-name") },
                            onNavigateToEditLegalName = { navController.navigate("profile/edit-legal-name") },
                            onNavigateToEditPhoneNumber = { navController.navigate("profile/edit-phone") },
                            onNavigateToEditDateOfBirth = { navController.navigate("profile/edit-dob") },
                            onNavigateToEditAddress = { navController.navigate("profile/edit-address") }
                        )
                    }
                    composable("profile/edit-display-name") {
                        EditDisplayNameScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-legal-name") {
                        EditLegalNameScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-phone") {
                        EditPhoneNumberScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-dob") {
                        EditDateOfBirthScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("profile/edit-address") {
                        EditAddressScreen(onBack = { profileRefreshKey++; navController.popBackStack() })
                    }
                    composable("preferences") {
                        PreferencesScreen(
                            onBack = { navController.popBackStack() },
                            onThemeChanged = { theme ->
                                val mode = when (theme) {
                                    "Light" -> ThemeViewModel.ThemeMode.Light
                                    "Dark" -> ThemeViewModel.ThemeMode.Dark
                                    else -> ThemeViewModel.ThemeMode.System
                                }
                                themeViewModel.setThemeMode(mode)
                            }
                        )
                    }
                    composable("security") {
                        SecurityScreen(onBack = { navController.popBackStack() })
                    }
                    composable("about") {
                        AboutScreen(onBack = { navController.popBackStack() })
                    }
                    composable("workspaces/new") {
                        NewWorkspaceScreen(onBack = { navController.popBackStack() }, onConfirm = { navController.popBackStack() })
                    }
                    composable("workspaces/{workspaceId}") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceDetailScreen(workspaceId = wid, onBack = { navController.popBackStack() },
                            onNavigateToOverview = { navController.navigate("workspaces/$wid/overview") },
                            onNavigateToMembers = { navController.navigate("workspaces/$wid/members") })
                    }
                    composable("workspaces/{workspaceId}/overview") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceOverviewScreen(workspaceId = wid, onBack = { navController.popBackStack() })
                    }
                    composable("workspaces/{workspaceId}/members") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceMembersScreen(workspaceId = wid, onBack = { navController.popBackStack() })
                    }
                }
            }
        }
    }
}
