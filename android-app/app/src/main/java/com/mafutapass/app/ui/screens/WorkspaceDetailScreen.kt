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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.ApiClient
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.DateUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceDetailScreen(
    workspaceId: String,
    workspaceName: String = "",
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var workspace by remember { mutableStateOf<Workspace?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    // Fetch real workspace data from API
    LaunchedEffect(workspaceId) {
        isLoading = true
        try {
            val fetched = withContext(Dispatchers.IO) {
                ApiClient.apiService.getWorkspace(workspaceId)
            }
            workspace = fetched
        } catch (e: Exception) {
            android.util.Log.e("WorkspaceDetail", "Failed to fetch: ${e.message}", e)
            error = e.message
            // Fallback to minimal data from nav args
            workspace = Workspace(
                id = workspaceId,
                name = workspaceName.ifEmpty { "Workspace" },
                currency = "KES",
                currencySymbol = "KSh"
            )
        } finally {
            isLoading = false
        }
    }

    val ws = workspace
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Emerald600)
        }
        return
    }

    if (ws == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Workspace not found", color = Gray500)
        }
        return
    }

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
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Avatar — show image or initials
                    val hasImageAvatar = ws.avatar?.startsWith("http") == true
                    if (hasImageAvatar) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(ws.avatar)
                                .crossfade(true)
                                .build(),
                            contentDescription = ws.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Emerald100)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .background(
                                    brush = Brush.verticalGradient(
                                        listOf(Emerald600, Color(0xFF059669))
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = ws.initials,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                    Column {
                        Text(
                            ws.name,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            "${ws.currency} - ${ws.currencySymbol}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray500
                        )
                    }
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Workspace info card
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Description
                        if (!ws.description.isNullOrBlank()) {
                            Column {
                                Text(
                                    "Description",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Gray500
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    ws.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Gray900
                                )
                            }
                        }
                        // Address
                        if (!ws.address.isNullOrBlank()) {
                            Column {
                                Text(
                                    "Address",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Gray500
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    ws.address,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Gray900
                                )
                            }
                        }
                        // Currency + Created
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    "Currency",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Gray500
                                )
                                Text(
                                    "${ws.currency} (${ws.currencySymbol})",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Gray900
                                )
                            }
                            if (!ws.createdAt.isNullOrBlank()) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "Created",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Gray500
                                    )
                                    Text(
                                        DateUtils.formatFull(ws.createdAt),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = Gray900
                                    )
                                }
                            }
                        }
                        // Plan type
                        if (!ws.planType.isNullOrBlank()) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Emerald100
                            ) {
                                Text(
                                    text = ws.planType.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Emerald600,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }

            item {
                WorkspaceDetailOption(
                    icon = Icons.Filled.Description,
                    label = "Overview",
                    onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                )
            }
            
            item {
                WorkspaceDetailOption(
                    icon = Icons.Filled.People,
                    label = "Members",
                    onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                )
            }
            
            item {
                WorkspaceDetailOption(
                    icon = Icons.Filled.Settings,
                    label = "Settings",
                    onClick = { Toast.makeText(context, "Coming soon", Toast.LENGTH_SHORT).show() }
                )
            }
        }
    }
}

@Composable
fun WorkspaceDetailOption(
    icon: ImageVector,
    label: String,
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
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = Emerald600
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.titleMedium,
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
