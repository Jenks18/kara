package com.mafutapass.app

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.mafutapass.app.ui.components.BottomNavBar
import com.mafutapass.app.data.AvatarManager
import com.mafutapass.app.ui.Screen
import com.mafutapass.app.ui.screens.*
import com.mafutapass.app.ui.theme.MafutaPassTheme
import com.mafutapass.app.viewmodel.AuthViewModel
import com.mafutapass.app.viewmodel.AuthState
import com.mafutapass.app.viewmodel.ThemeViewModel
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var avatarManager: AvatarManager

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        Log.d("MainActivity", "MainActivity created")
        setContent {
            val themeViewModel: ThemeViewModel = hiltViewModel()
            val themeMode by themeViewModel.themeMode.collectAsState()

            val isDark = when (themeMode) {
                ThemeViewModel.ThemeMode.Light -> false
                ThemeViewModel.ThemeMode.Dark -> true
                ThemeViewModel.ThemeMode.System -> isSystemInDarkTheme()
            }

            MafutaPassTheme(darkTheme = isDark) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    MafutaPassApp(themeViewModel = themeViewModel, avatarManager = avatarManager)
                }
            }
        }
    }
}

@Composable
fun MafutaPassApp(themeViewModel: ThemeViewModel, avatarManager: AvatarManager) {
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.authState.collectAsState()
    val sessionKey by authViewModel.sessionKey.collectAsState()

    when (authState) {
        AuthState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
        AuthState.SignedOut -> {
            key(authState) { SignInOrUpScreen() }
        }
        AuthState.SignedIn -> {
            // key(sessionKey) guarantees Compose fully destroys and recreates the
            // entire signed-in UI subtree — NavController, all NavBackStackEntries,
            // all hiltViewModel() instances — for every distinct login session.
            // This is the Compose equivalent of SwiftUI rebuilding MainAppView
            // when clerk.user changes: deterministic, no remembered-state leakage.
            key(sessionKey) {
            val navController = rememberNavController()
            var profileRefreshKey by remember { mutableIntStateOf(0) }
            var accountRefreshKey by remember { mutableIntStateOf(0) }
            // Navbar visibility is driven purely by the current nav route — no callbacks needed.
            // When the user is on the Create (scan) screen the navbar and its padding must not exist.
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val onScanScreen = navBackStackEntry?.destination?.route == Screen.Create.route
            Scaffold(
                bottomBar = { if (!onScanScreen) BottomNavBar(navController, avatarManager) },
                contentWindowInsets = WindowInsets(0, 0, 0, 0)
            ) { paddingValues ->
                NavHost(navController = navController, startDestination = Screen.Home.route,
                    modifier = if (onScanScreen) Modifier.fillMaxSize() else Modifier.padding(paddingValues)) {

                    composable(Screen.Home.route) {
                        HomeScreen(
                            onViewAllExpenses = { navController.navigate(Screen.Reports.route) },
                            onViewAllReports = { navController.navigate("${Screen.Reports.route}?initialTab=1") },
                            onExpenseClick = { id -> navController.navigate("expenses/$id") },
                            onReportClick = { id -> navController.navigate("reports/$id") }
                        )
                    }
                    composable("${Screen.Reports.route}?initialTab={initialTab}&highlight={highlight}",
                        arguments = listOf(
                            androidx.navigation.navArgument("initialTab") {
                                type = androidx.navigation.NavType.IntType; defaultValue = 0
                            },
                            androidx.navigation.navArgument("highlight") {
                                type = androidx.navigation.NavType.StringType; nullable = true; defaultValue = null
                            }
                        )
                    ) { backStackEntry ->
                        val initialTab = backStackEntry.arguments?.getInt("initialTab") ?: 0
                        val highlight = backStackEntry.arguments?.getString("highlight")
                        ReportsScreen(
                            initialTab = initialTab,
                            highlightReportId = highlight,
                            onNavigateToExpenseDetail = { id -> navController.navigate("expenses/$id") },
                            onNavigateToReportDetail = { id -> navController.navigate("reports/$id") }
                        )
                    }
                    composable(
                        Screen.Create.route,
                        // Zero-duration exit so the Create screen vanishes instantly — eliminates
                        // the transition window where the navbar is already visible but the scan
                        // screen is still drawing its outgoing animation.
                        exitTransition = { fadeOut(tween(durationMillis = 0)) },
                        popExitTransition = { fadeOut(tween(durationMillis = 0)) }
                    ) {
                        AddReceiptScreen(
                            onDone = { reportId ->
                                if (reportId != null) {
                                    // Upload completed — go to Reports with the new expense highlighted.
                                    navController.navigate("${Screen.Reports.route}?initialTab=0&highlight=$reportId") {
                                        popUpTo(Screen.Create.route) { inclusive = true }
                                        launchSingleTop = true
                                    }
                                } else {
                                    // User cancelled — return to wherever they came from (Home, Reports, etc.).
                                    // Using popBackStack preserves the prior screen's state and avoids
                                    // the two-part render caused by navigating to a fresh Reports instance.
                                    navController.popBackStack()
                                }
                            }
                        )
                    }
                    composable(Screen.Workspaces.route) {
                        WorkspacesScreen(
                            onNavigateToDetail = { id -> navController.navigate("workspaces/$id") },
                            onNavigateToCreate = { navController.navigate("workspaces/new") }
                        )
                    }
                    composable(Screen.Account.route) {
                        AccountScreen(
                            refreshTrigger = accountRefreshKey,
                            avatarManager = avatarManager,
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
                            onNavigateToTheme = { navController.navigate("preferences/theme") },
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
                    composable("preferences/theme") {
                        ThemeScreen(
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
                        SecurityScreen(
                            onBack = { navController.popBackStack() },
                            onNavigateToReportActivity = { navController.navigate("security/report-activity") },
                            onNavigateToCloseAccount = { navController.navigate("security/close-account") }
                        )
                    }
                    composable("security/report-activity") {
                        ReportSuspiciousActivityScreen(onBack = { navController.popBackStack() })
                    }
                    composable("security/close-account") {
                        CloseAccountScreen(
                            onBack = { navController.popBackStack() },
                            onAccountDeleted = { authViewModel.signOut() }
                        )
                    }
                    composable("about") {
                        AboutScreen(
                            onBack = { navController.popBackStack() },
                            onNavigateToReportBug = { navController.navigate("about/report-bug") }
                        )
                    }
                    composable("about/report-bug") {
                        ReportBugScreen(onBack = { navController.popBackStack() })
                    }
                    composable("expenses/{expenseId}") { entry ->
                        val eid = entry.arguments?.getString("expenseId") ?: return@composable
                        ExpenseDetailScreen(expenseId = eid, onBack = { navController.popBackStack() })
                    }
                    composable("reports/{reportId}") { entry ->
                        val rid = entry.arguments?.getString("reportId") ?: return@composable
                        ReportDetailScreen(
                            reportId = rid,
                            onBack = { navController.popBackStack() },
                            onNavigateToExpense = { id -> navController.navigate("expenses/$id") }
                        )
                    }

                    // ── Workspace Detail Flows ──

                    composable("workspaces/new") {
                        CreateWorkspaceScreen(
                            onBack = { navController.popBackStack() },
                            onCreated = { navController.popBackStack() }
                        )
                    }
                    composable("workspaces/{workspaceId}") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceDetailScreen(
                            workspaceId = wid,
                            onBack = { navController.popBackStack() },
                            onNavigateToOverview = { id -> navController.navigate("workspaces/$id/overview") },
                            onNavigateToMembers = { id -> navController.navigate("workspaces/$id/members") }
                        )
                    }
                    composable("workspaces/{workspaceId}/overview") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceOverviewScreen(
                            workspaceId = wid,
                            onBack = { navController.popBackStack() }
                        )
                    }
                    composable("workspaces/{workspaceId}/members") { entry ->
                        val wid = entry.arguments?.getString("workspaceId") ?: return@composable
                        WorkspaceMembersScreen(
                            workspaceId = wid,
                            onBack = { navController.popBackStack() }
                        )
                    }
                }
            }
            } // key(sessionKey)
        }
    }
}
