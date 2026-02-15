
package com.mafutapass.app.ui

sealed class Screen(val route: String) {
    object Reports : Screen("reports")
    object Create : Screen("create")
    object Account : Screen("account")
}
