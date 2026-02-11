package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mafutapass.app.ui.theme.*

@Composable
fun CreateScreen() {
    val options = listOf(
        CreateOption(
            icon = Icons.Filled.Receipt,
            label = "Scan Receipt",
            description = "Capture fuel receipt with camera",
            onClick = { /* TODO: Implement receipt scanner */ }
        ),
        CreateOption(
            icon = Icons.Filled.ChatBubble,
            label = "Start chat",
            description = "Message your manager or team",
            onClick = { /* TODO */ }
        ),
        CreateOption(
            icon = Icons.Filled.Description,
            label = "Create report",
            description = "Create a new expense report",
            onClick = { /* TODO */ }
        )
    )
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Emerald50, Green50, Emerald100)
                )
            )
            .padding(16.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        options.forEach { option ->
            CreateOptionCard(option)
            Spacer(modifier = Modifier.height(12.dp))
        }
    }
    
    // TODO: Add Receipt Scanner Dialog when camera is implemented
}


data class CreateOption(
    val icon: ImageVector,
    val label: String,
    val description: String,
    val onClick: () -> Unit
)

@Composable
fun CreateOptionCard(option: CreateOption) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = option.onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon circle
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Emerald100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = option.icon,
                    contentDescription = option.label,
                    tint = Emerald600,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(
                    text = option.label,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray900
                )
                Text(
                    text = option.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray600
                )
            }
        }
    }
}
