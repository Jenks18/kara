package com.mafutapass.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mafutapass.app.data.ApiClient
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun WorkspacesScreen(
    onNavigateToNewWorkspace: () -> Unit = {},
    onNavigateToWorkspaceDetail: (String) -> Unit = {}
) {
    var workspaces by remember { mutableStateOf<List<Workspace>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    // Fetch workspaces from API
    LaunchedEffect(Unit) {
        isLoading = true
        error = null
        try {
            val response = withContext(Dispatchers.IO) {
                ApiClient.apiService.getWorkspaces()
            }
            workspaces = response.workspaces
        } catch (e: Exception) {
            android.util.Log.e("WorkspacesScreen", "Failed to fetch workspaces: ${e.message}", e)
            error = e.message
            workspaces = emptyList()
        } finally {
            isLoading = false
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Emerald50)
    ) {
        // Header
        Surface(
            color = Color.White,
            shadowElevation = 1.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Workspaces",
                    style = MaterialTheme.typography.displayLarge,
                    fontWeight = FontWeight.Bold,
                    color = Gray900
                )
                
                IconButton(onClick = { /* TODO: Search */ }) {
                    Icon(
                        imageVector = Icons.Filled.Search,
                        contentDescription = "Search",
                        tint = Gray600,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
        
        // Content
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Emerald600)
            }
        } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (workspaces.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "No workspaces yet",
                                style = MaterialTheme.typography.titleMedium,
                                color = Gray500
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Create a workspace to get started",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Gray400
                            )
                        }
                    }
                }
            }
            items(workspaces) { workspace ->
                WorkspaceCard(
                    workspace = workspace,
                    onClick = { onNavigateToWorkspaceDetail(workspace.id) }
                )
            }
            
            item {
                // Add workspace button
                Button(
                    onClick = onNavigateToNewWorkspace,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Emerald600
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = "Add",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Add workspace",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        } // end else (not loading)
    }
}

@Composable
fun WorkspaceCard(workspace: Workspace, onClick: () -> Unit = {}) {
    var showMenu by remember { mutableStateOf(false) }
    
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
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Emerald600),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = workspace.initials,
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = workspace.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray900
                )
                Text(
                    text = "${workspace.currency} - ${workspace.currencySymbol}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray500
                )
            }
            
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(
                        imageVector = Icons.Filled.MoreVert,
                        contentDescription = "More options",
                        tint = Gray600
                    )
                }
                
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        onClick = { showMenu = false }
                    )
                    DropdownMenuItem(
                        text = { Text("Delete", color = Red500) },
                        onClick = { showMenu = false }
                    )
                }
            }
        }
    }
}
