
package com.mafutapass.app.ui

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Reports : Screen("reports")
    object Create : Screen("create")
    object Workspaces : Screen("workspaces")
    object Account : Screen("account")
}
