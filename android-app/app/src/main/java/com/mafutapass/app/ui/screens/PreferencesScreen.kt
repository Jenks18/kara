package com.mafutapass.app.ui.screens

import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreferencesScreen(onBack: () -> Unit) {
    val context = LocalContext.current
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
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
    ) {
        // Header
        TopAppBar(
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Settings,
                        contentDescription = null,
                        tint = Emerald600
                    )
                    Text("Preferences", fontWeight = FontWeight.Bold)
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.White
            )
        )
        
        // Content
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "App preferences",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    
                    PreferenceItem(
                        label = "Language",
                        value = selectedLanguage,
                        onClick = { showLanguageDialog = true }
                    )
                    
                    PreferenceItem(
                        label = "Payment currency",
                        value = selectedCurrency,
                        onClick = { showCurrencyDialog = true }
                    )
                    
                    PreferenceItem(
                        label = "Theme",
                        value = selectedTheme,
                        onClick = { showThemeDialog = true }
                    )
                }
            }
        }
    }

    // Language Picker Dialog
    if (showLanguageDialog) {
        PreferencePickerDialog(
            title = "Select Language",
            options = languages,
            selected = selectedLanguage,
            onSelect = { choice ->
                selectedLanguage = choice
                prefs.edit().putString("language", choice).apply()
                showLanguageDialog = false
            },
            onDismiss = { showLanguageDialog = false }
        )
    }

    // Currency Picker Dialog
    if (showCurrencyDialog) {
        PreferencePickerDialog(
            title = "Select Currency",
            options = currencies,
            selected = selectedCurrency,
            onSelect = { choice ->
                selectedCurrency = choice
                prefs.edit().putString("currency", choice).apply()
                showCurrencyDialog = false
            },
            onDismiss = { showCurrencyDialog = false }
        )
    }

    // Theme Picker Dialog
    if (showThemeDialog) {
        PreferencePickerDialog(
            title = "Select Theme",
            options = themes,
            selected = selectedTheme,
            onSelect = { choice ->
                selectedTheme = choice
                prefs.edit().putString("theme", choice).apply()
                showThemeDialog = false
            },
            onDismiss = { showThemeDialog = false }
        )
    }
}

@Composable
fun PreferencePickerDialog(
    title: String,
    options: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                options.forEach { option ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(option) }
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        RadioButton(
                            selected = option == selected,
                            onClick = { onSelect(option) },
                            colors = RadioButtonDefaults.colors(selectedColor = Emerald600)
                        )
                        Text(
                            text = option,
                            style = MaterialTheme.typography.bodyLarge,
                            color = Gray900
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun PreferenceItem(
    label: String,
    value: String,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleMedium,
                    color = Gray900,
                    fontWeight = FontWeight.Medium
                )
            }
            
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = "Change",
                tint = Gray500
            )
        }
    }
}
