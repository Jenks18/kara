package com.mafutapass.app.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    Column(modifier = Modifier.fillMaxSize().background(brush = Brush.verticalGradient(listOf(Emerald50, Green50, Emerald100)))) {
        TopAppBar(
            title = { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.Info, null, tint = Emerald600); Text("About", fontWeight = FontWeight.Bold) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            windowInsets = WindowInsets(0, 0, 0, 0))
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { Text("v1.0.0", style = MaterialTheme.typography.bodySmall, color = Gray500, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
            item {
                Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("About MafutaPass", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, color = Gray900)
                        Text("MafutaPass is a fuel expense tracking app built for Kenyan businesses and drivers. Track your fuel expenses, receipts, and mileage all in one place.", style = MaterialTheme.typography.bodyMedium, color = Gray600, lineHeight = MaterialTheme.typography.bodyMedium.lineHeight)
                    }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AboutRow(Icons.Filled.Link, "App download links") { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.mafutapass.com"))) }
                    AboutRow(Icons.Filled.Keyboard, "Keyboard shortcuts") { Toast.makeText(context, "No keyboard shortcuts on mobile", Toast.LENGTH_SHORT).show() }
                    AboutRow(Icons.Filled.Work, "View open jobs") { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.mafutapass.com"))) }
                    AboutRow(Icons.Filled.BugReport, "Report a bug") { context.startActivity(Intent(Intent.ACTION_SENDTO).apply { data = Uri.parse("mailto:support@mafutapass.com"); putExtra(Intent.EXTRA_SUBJECT, "Bug Report - MafutaPass Android") }) }
                }
            }
            item { Text("Read the Terms of Service and Privacy.", style = MaterialTheme.typography.bodySmall, color = Gray500, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
        }
    }
}

@Composable
fun AboutRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Icon(icon, label, tint = Emerald600, modifier = Modifier.size(22.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = Gray800)
        }
    }
}
