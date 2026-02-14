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
                        imageVector = Icons.Filled.Shield,
                        contentDescription = null,
                        tint = Emerald600
                    )
                    Text("Security", fontWeight = FontWeight.Bold)
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
                        text = "Security options",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        text = "Enable two-factor authentication to keep your account safe.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray600
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    SecurityOption(
                        icon = Icons.Filled.Shield,
                        label = "Two-factor authentication",
                        onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    )
                    
                    SecurityOption(
                        icon = Icons.Filled.SwapHoriz,
                        label = "Merge accounts",
                        onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    )
                    
                    SecurityOption(
                        icon = Icons.Filled.Warning,
                        label = "Report suspicious activity",
                        onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    )
                    
                    SecurityOption(
                        icon = Icons.Filled.ExitToApp,
                        label = "Close account",
                        onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() },
                        isDestructive = true
                    )
                }
            }
            
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Copilot: Delegated access",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        text = "Allow other members to access your account. Learn more.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray600
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    SecurityOption(
                        icon = Icons.Filled.PersonAdd,
                        label = "Add copilot",
                        onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                    )
                }
            }
        }
    }
}

@Composable
fun SecurityOption(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    isDestructive: Boolean = false
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
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = if (isDestructive) Red500 else Emerald600
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.titleMedium,
                    color = Gray900,
                    fontWeight = FontWeight.Medium
                )
            }
            
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = "Navigate",
                tint = Gray500
            )
        }
    }
}
