package com.mafutapass.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.mafutapass.app.data.ApiClient
import com.mafutapass.app.data.Workspace
import com.mafutapass.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class WorkspaceMember(
    val id: String,
    val userId: String,
    val email: String,
    val role: String,
    val displayName: String?,
    val firstName: String?,
    val lastName: String?,
    val avatarEmoji: String?
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceMembersScreen(
    workspaceId: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)

    var workspace by remember { mutableStateOf<Workspace?>(null) }
    var members by remember { mutableStateOf<List<WorkspaceMember>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showInviteDialog by remember { mutableStateOf(false) }
    var showMoreMenu by remember { mutableStateOf(false) }
    var showShareDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var inviteInput by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()
    val shareUrl = "https://www.mafutapass.com/workspaces/$workspaceId/join"

    // Fetch workspace and members
    LaunchedEffect(workspaceId) {
        isLoading = true
        try {
            val fetched = withContext(Dispatchers.IO) {
                ApiClient.apiService.getWorkspace(workspaceId)
            }
            workspace = fetched

            // Fetch members
            if (sessionToken != null) {
                val membersList = withContext(Dispatchers.IO) {
                    fetchWorkspaceMembers(sessionToken, workspaceId)
                }
                members = membersList
            }
        } catch (e: Exception) {
            android.util.Log.e("WorkspaceMembers", "Failed to fetch: ${e.message}", e)
        }
        isLoading = false
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Emerald600)
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
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Filled.People, null, tint = Emerald600)
                    Text("Members", fontWeight = FontWeight.Bold)
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Invite + More buttons
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { showInviteDialog = true },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.PersonAdd, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Invite", fontWeight = FontWeight.SemiBold)
                    }

                    Box {
                        OutlinedButton(
                            onClick = { showMoreMenu = !showMoreMenu },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("More", color = Gray700)
                            Icon(
                                if (showMoreMenu) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                                null,
                                tint = Gray700
                            )
                        }

                        DropdownMenu(
                            expanded = showMoreMenu,
                            onDismissRequest = { showMoreMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Share") },
                                onClick = {
                                    showMoreMenu = false
                                    showShareDialog = true
                                },
                                leadingIcon = { Icon(Icons.Filled.Share, null, tint = Emerald600) }
                            )
                            DropdownMenuItem(
                                text = { Text("Delete", color = Color(0xFFDC2626)) },
                                onClick = {
                                    showMoreMenu = false
                                    showDeleteDialog = true
                                },
                                leadingIcon = { Icon(Icons.Filled.Delete, null, tint = Color(0xFFDC2626)) }
                            )
                        }
                    }
                }
            }

            // Member count
            item {
                Text(
                    "Total workspace members: ${members.size}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
            }

            // Table header
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Member", style = MaterialTheme.typography.bodySmall, color = Gray500)
                    Text("Role", style = MaterialTheme.typography.bodySmall, color = Gray500)
                }
            }

            // Members list
            items(members) { member ->
                val fullName = if (!member.firstName.isNullOrBlank() && !member.lastName.isNullOrBlank()) {
                    "${member.firstName} ${member.lastName}".trim()
                } else null
                val displayText = fullName ?: member.displayName ?: member.email
                val secondaryText = if (fullName != null || member.displayName != null) member.email else ""

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
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
                            // Avatar
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(
                                        brush = Brush.verticalGradient(
                                            listOf(Emerald600, Color(0xFF059669))
                                        ),
                                        shape = CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    member.avatarEmoji ?: member.email.first().uppercase(),
                                    fontSize = 20.sp,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Column {
                                Text(
                                    displayText,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Gray900
                                )
                                if (secondaryText.isNotEmpty()) {
                                    Text(
                                        secondaryText,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Gray500
                                    )
                                }
                            }
                        }

                        // Role badge
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (member.role == "admin") Emerald100 else Color(0xFFF3F4F6)
                        ) {
                            Text(
                                if (member.role == "admin") "Admin" else "Member",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Medium,
                                color = if (member.role == "admin") Emerald600 else Gray700,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }

            // Empty state
            if (members.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("No members found", color = Gray500)
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }

    // ── Invite Dialog ──
    if (showInviteDialog) {
        Dialog(onDismissRequest = { showInviteDialog = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Invite new members",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { showInviteDialog = false }) {
                            Icon(Icons.Filled.Close, "Close")
                        }
                    }
                    Text(
                        "Add members to this workspace",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = inviteInput,
                        onValueChange = { inviteInput = it },
                        placeholder = { Text("Name, email, or phone number") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (inviteInput.isNotBlank()) {
                                Toast.makeText(context, "Invite sent to: $inviteInput", Toast.LENGTH_SHORT).show()
                                inviteInput = ""
                                showInviteDialog = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("Next", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(vertical = 8.dp))
                    }
                }
            }
        }
    }

    // ── Share Dialog ──
    if (showShareDialog) {
        Dialog(onDismissRequest = { showShareDialog = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Share workspace",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { showShareDialog = false }) {
                            Icon(Icons.Filled.Close, "Close")
                        }
                    }
                    Spacer(Modifier.height(16.dp))

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Emerald50
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Share link", style = MaterialTheme.typography.bodySmall, color = Gray500)
                            Spacer(Modifier.height(4.dp))
                            Text(shareUrl, style = MaterialTheme.typography.bodySmall, color = Gray900)
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    Button(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Share URL", shareUrl))
                            Toast.makeText(context, "Link copied to clipboard!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.Share, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Copy Link", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    // ── Delete Confirmation Dialog ──
    if (showDeleteDialog) {
        Dialog(onDismissRequest = { showDeleteDialog = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(Color(0xFFFEE2E2), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.Delete,
                            null,
                            tint = Color(0xFFDC2626),
                            modifier = Modifier.size(32.dp)
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Delete workspace?",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Are you sure you want to delete \"${workspace?.name}\"? This action cannot be undone and all data will be permanently lost.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray500,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(24.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showDeleteDialog = false },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    try {
                                        withContext(Dispatchers.IO) {
                                            ApiClient.apiService.deleteWorkspace(workspaceId)
                                        }
                                        showDeleteDialog = false
                                        onBack()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Failed to delete", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Delete")
                        }
                    }
                }
            }
        }
    }
}

/**
 * Fetch workspace members from /api/workspaces/{id}/members endpoint.
 */
private fun fetchWorkspaceMembers(token: String, workspaceId: String): List<WorkspaceMember> {
    val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val request = Request.Builder()
        .url("https://www.mafutapass.com/api/workspaces/$workspaceId/members")
        .get()
        .addHeader("Authorization", "Bearer $token")
        .addHeader("Content-Type", "application/json")
        .build()

    return try {
        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: return emptyList()

        if (!response.isSuccessful) {
            android.util.Log.e("WorkspaceMembers", "Members fetch failed: ${response.code}")
            return emptyList()
        }

        val json = JSONObject(body)
        val membersArray = json.optJSONArray("members") ?: return emptyList()
        val result = mutableListOf<WorkspaceMember>()

        for (i in 0 until membersArray.length()) {
            val m = membersArray.getJSONObject(i)
            result.add(
                WorkspaceMember(
                    id = m.optString("id", ""),
                    userId = m.optString("user_id", ""),
                    email = m.optString("email", ""),
                    role = m.optString("role", "member"),
                    displayName = m.optString("display_name", "").ifBlank { null },
                    firstName = m.optString("first_name", "").ifBlank { null },
                    lastName = m.optString("last_name", "").ifBlank { null },
                    avatarEmoji = m.optString("avatar_emoji", "").ifBlank { null }
                )
            )
        }
        result
    } catch (e: Exception) {
        android.util.Log.e("WorkspaceMembers", "Error fetching members: ${e.message}")
        emptyList()
    }
}
