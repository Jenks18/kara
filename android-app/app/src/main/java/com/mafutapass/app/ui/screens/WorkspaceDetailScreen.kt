package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceDetailScreen(
    workspaceId: String,
    workspaceName: String = "",
    onBack: () -> Unit,
    onNavigateToOverview: () -> Unit = {},
    onNavigateToMembers: () -> Unit = {}
) {
    val context = LocalContext.current
    var workspace by remember { mutableStateOf<Workspace?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

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
        TopAppBar(
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
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
                                text = ws.avatar ?: ws.initials,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                    Text(
                        ws.name,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleLarge
                    )
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            WorkspaceDetailOption(
                icon = Icons.Filled.Description,
                label = "Overview",
                onClick = onNavigateToOverview
            )
            WorkspaceDetailOption(
                icon = Icons.Filled.People,
                label = "Members",
                onClick = onNavigateToMembers
            )
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
                Icon(icon, label, tint = Emerald600)
                Text(
                    label,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
            }
            Icon(Icons.Filled.ChevronRight, "Navigate", tint = Gray500)
        }
    }
}
