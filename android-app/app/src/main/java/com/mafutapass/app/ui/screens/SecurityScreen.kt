package com.mafutapass.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecurityScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(
            title = { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.Shield, null, tint = Emerald600); Text("Security", fontWeight = FontWeight.Bold) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Security options", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("Enable two-factor authentication to keep your account safe.", style = MaterialTheme.typography.bodyMedium, color = Gray600)
                    Spacer(Modifier.height(8.dp))
                    SecOption(Icons.Filled.Shield, "Two-factor authentication") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    SecOption(Icons.Filled.SwapHoriz, "Merge accounts") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    SecOption(Icons.Filled.Warning, "Report suspicious activity") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    SecOption(Icons.Filled.ExitToApp, "Close account", true) { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Copilot: Delegated access", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("Allow other members to access your account.", style = MaterialTheme.typography.bodyMedium, color = Gray600)
                    Spacer(Modifier.height(8.dp))
                    SecOption(Icons.Filled.PersonAdd, "Add copilot") { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                }
            }
        }
    }
}

@Composable
fun SecOption(icon: ImageVector, label: String, isDestructive: Boolean = false, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Icon(icon, label, tint = if (isDestructive) Red500 else Emerald600, modifier = Modifier.size(22.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = if (isDestructive) Red500 else Gray800)
        }
    }
}
