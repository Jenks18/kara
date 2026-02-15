package com.mafutapass.app.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

/**
 * Manages the app's theme preference (Light / Dark / System).
 *
 * Reads and persists the user's choice in SharedPreferences under
 * "app_preferences" → "theme".  The three valid values mirror the
 * strings used in PreferencesScreen's picker: "Light", "Dark", "System".
 */
@HiltViewModel
class ThemeViewModel @Inject constructor(
    @ApplicationContext context: Context
) : ViewModel() {

    enum class ThemeMode { Light, Dark, System }

    private val prefs = context.getSharedPreferences("app_preferences", Context.MODE_PRIVATE)

    private val _themeMode = MutableStateFlow(loadThemeMode())
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    /** Called when the user picks a new theme in Preferences. */
    fun setThemeMode(mode: ThemeMode) {
        _themeMode.value = mode
        prefs.edit().putString("theme", mode.toPrefString()).apply()
    }

    /** Re‑read preference (e.g. after returning from Preferences screen). */
    fun refresh() {
        _themeMode.value = loadThemeMode()
    }

    private fun loadThemeMode(): ThemeMode {
        return when (prefs.getString("theme", "System")) {
            "Light" -> ThemeMode.Light
            "Dark"  -> ThemeMode.Dark
            else    -> ThemeMode.System
        }
    }

    private fun ThemeMode.toPrefString(): String = when (this) {
        ThemeMode.Light  -> "Light"
        ThemeMode.Dark   -> "Dark"
        ThemeMode.System -> "System"
    }
}
