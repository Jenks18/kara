package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreferencesScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("app_preferences", android.content.Context.MODE_PRIVATE)
    var selectedLanguage by remember { mutableStateOf(prefs.getString("language", "English") ?: "English") }
    var selectedCurrency by remember { mutableStateOf(prefs.getString("currency", "KES - KSh") ?: "KES - KSh") }
    var selectedTheme by remember { mutableStateOf(prefs.getString("theme", "Light") ?: "Light") }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showCurrencyDialog by remember { mutableStateOf(false) }
    var showThemeDialog by remember { mutableStateOf(false) }
    val languages = listOf("English", "Swahili")
    val currencies = listOf("KES - KSh", "USD - $", "EUR - €", "GBP - £")
    val themes = listOf("Light", "Dark", "System")

    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(
            title = { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.Settings, null, tint = Emerald600); Text("Preferences", fontWeight = FontWeight.Bold) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("App preferences", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                    PrefItem("Language", selectedLanguage) { showLanguageDialog = true }
                    PrefItem("Payment currency", selectedCurrency) { showCurrencyDialog = true }
                    PrefItem("Theme", selectedTheme) { showThemeDialog = true }
                }
            }
        }
    }
    if (showLanguageDialog) PrefPickerDialog("Select Language", languages, selectedLanguage, { selectedLanguage = it; prefs.edit().putString("language", it).apply(); showLanguageDialog = false }, { showLanguageDialog = false })
    if (showCurrencyDialog) PrefPickerDialog("Select Currency", currencies, selectedCurrency, { selectedCurrency = it; prefs.edit().putString("currency", it).apply(); showCurrencyDialog = false }, { showCurrencyDialog = false })
    if (showThemeDialog) PrefPickerDialog("Select Theme", themes, selectedTheme, { selectedTheme = it; prefs.edit().putString("theme", it).apply(); showThemeDialog = false }, { showThemeDialog = false })
}

@Composable
fun PrefPickerDialog(title: String, options: List<String>, selected: String, onSelect: (String) -> Unit, onDismiss: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) },
        text = { Column { options.forEach { option -> Row(Modifier.fillMaxWidth().clickable { onSelect(option) }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { RadioButton(selected = option == selected, onClick = { onSelect(option) }, colors = RadioButtonDefaults.colors(selectedColor = Emerald600)); Text(option, style = MaterialTheme.typography.bodyLarge, color = Gray900) } } } },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
fun PrefItem(label: String, value: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = Emerald600)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = Gray800)
        }
    }
}
