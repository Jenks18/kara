package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.WorkspaceDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceDetailScreen(
    workspaceId: String,
    workspaceName: String = "",
    onBack: () -> Unit,
    onNavigateToOverview: () -> Unit = {},
    onNavigateToMembers: () -> Unit = {},
    viewModel: WorkspaceDetailViewModel = hiltViewModel()
) {
    val workspace by viewModel.workspace.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(workspaceId) {
        viewModel.fetchWorkspace(workspaceId, workspaceName)
    }

    val ws = workspace
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
        return
    }

    if (ws == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Workspace not found", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = AppTheme.colors.backgroundGradient)
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
                                .background(MaterialTheme.colorScheme.primaryContainer)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .background(
                                    brush = AppTheme.colors.headerGradient,
                                    shape = RoundedCornerShape(12.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = ws.avatar ?: ws.initials,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimary
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
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
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
        color = MaterialTheme.colorScheme.surface,
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
                Icon(icon, label, tint = MaterialTheme.colorScheme.primary)
                Text(
                    label,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
            }
            Icon(Icons.Filled.ChevronRight, "Navigate", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
