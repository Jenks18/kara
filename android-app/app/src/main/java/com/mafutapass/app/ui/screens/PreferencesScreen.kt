package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreferencesScreen(onBack: () -> Unit, onThemeChanged: (String) -> Unit = {}) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("app_preferences", android.content.Context.MODE_PRIVATE)
    var selectedLanguage by remember { mutableStateOf(prefs.getString("language", "English") ?: "English") }
    var selectedCurrency by remember { mutableStateOf(prefs.getString("currency", "KES - KSh") ?: "KES - KSh") }
    var selectedTheme by remember { mutableStateOf(prefs.getString("theme", "System") ?: "System") }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showCurrencyDialog by remember { mutableStateOf(false) }
    var showThemeDialog by remember { mutableStateOf(false) }
    val languages = listOf("English", "Swahili")
    val currencies = listOf("KES - KSh", "USD - $", "EUR - €", "GBP - £")
    val themes = listOf("Light", "Dark", "System")

    Column(modifier = Modifier.fillMaxSize().background(brush = AppTheme.colors.backgroundGradient)) {
        TopAppBar(
            title = { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.Settings, null, tint = MaterialTheme.colorScheme.primary); Text("Preferences", fontWeight = FontWeight.Bold) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0))
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("App preferences", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    PrefItem("Language", selectedLanguage) { showLanguageDialog = true }
                    PrefItem("Payment currency", selectedCurrency) { showCurrencyDialog = true }
                    PrefItem("Theme", selectedTheme) { showThemeDialog = true }
                }
            }
        }
    }
    if (showLanguageDialog) PrefPickerDialog("Select Language", languages, selectedLanguage, { selectedLanguage = it; prefs.edit().putString("language", it).apply(); showLanguageDialog = false }, { showLanguageDialog = false })
    if (showCurrencyDialog) PrefPickerDialog("Select Currency", currencies, selectedCurrency, { selectedCurrency = it; prefs.edit().putString("currency", it).apply(); showCurrencyDialog = false }, { showCurrencyDialog = false })
    if (showThemeDialog) PrefPickerDialog("Select Theme", themes, selectedTheme, { selectedTheme = it; prefs.edit().putString("theme", it).apply(); onThemeChanged(it); showThemeDialog = false }, { showThemeDialog = false })
}

@Composable
fun PrefPickerDialog(title: String, options: List<String>, selected: String, onSelect: (String) -> Unit, onDismiss: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) },
        text = { Column { options.forEach { option -> Row(Modifier.fillMaxWidth().clickable { onSelect(option) }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { RadioButton(selected = option == selected, onClick = { onSelect(option) }, colors = RadioButtonDefaults.colors(selectedColor = MaterialTheme.colorScheme.primary)); Text(option, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface) } } } },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
fun PrefItem(label: String, value: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}
