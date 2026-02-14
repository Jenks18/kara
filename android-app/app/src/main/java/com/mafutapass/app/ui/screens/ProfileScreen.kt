package com.mafutapass.app.ui.screens

import android.app.DatePickerDialog
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.util.DateUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.Calendar
import java.util.concurrent.TimeUnit

data class AvatarOption(
    val emoji: String,
    val gradient: List<Color>,
    val label: String
)

val AVATAR_OPTIONS = listOf(
    AvatarOption("🐻", listOf(Color(0xFFB45309), Color(0xFF92400E)), "Bear"),
    AvatarOption("🦁", listOf(Color(0xFFEA580C), Color(0xFFC2410C)), "Lion"),
    AvatarOption("🐯", listOf(Color(0xFFC2410C), Color(0xFF9A3412)), "Tiger"),
    AvatarOption("🦊", listOf(Color(0xFFDC2626), Color(0xFFB91C1C)), "Fox"),
    AvatarOption("🐺", listOf(Color(0xFF334155), Color(0xFF1E293B)), "Wolf"),
    AvatarOption("🦅", listOf(Color(0xFFA16207), Color(0xFF854D0E)), "Eagle"),
    AvatarOption("🦉", listOf(Color(0xFF4338CA), Color(0xFF3730A3)), "Owl"),
    AvatarOption("🐧", listOf(Color(0xFF475569), Color(0xFF334155)), "Penguin"),
    AvatarOption("🐘", listOf(Color(0xFF374151), Color(0xFF1F2937)), "Elephant"),
    AvatarOption("🦏", listOf(Color(0xFF57534E), Color(0xFF44403C)), "Rhino"),
    AvatarOption("🦒", listOf(Color(0xFFD97706), Color(0xFFB45309)), "Giraffe"),
    AvatarOption("🦓", listOf(Color(0xFF3F3F46), Color(0xFF27272A)), "Zebra"),
    AvatarOption("🐆", listOf(Color(0xFFCA8A04), Color(0xFFA16207)), "Leopard"),
    AvatarOption("🦈", listOf(Color(0xFF0E7490), Color(0xFF155E75)), "Shark"),
    AvatarOption("🐙", listOf(Color(0xFF7C3AED), Color(0xFF6D28D9)), "Octopus"),
    AvatarOption("🐬", listOf(Color(0xFF1D4ED8), Color(0xFF1E40AF)), "Dolphin"),
    AvatarOption("🐳", listOf(Color(0xFF0369A1), Color(0xFF075985)), "Whale"),
    AvatarOption("🦦", listOf(Color(0xFF0F766E), Color(0xFF115E59)), "Otter"),
    AvatarOption("🦘", listOf(Color(0xFFA16207), Color(0xFFB45309)), "Kangaroo"),
    AvatarOption("🦌", listOf(Color(0xFFB45309), Color(0xFFEA580C)), "Deer"),
    AvatarOption("🐎", listOf(Color(0xFF57534E), Color(0xFF44403C)), "Horse"),
    AvatarOption("🦬", listOf(Color(0xFF3F3F46), Color(0xFF374151)), "Bison"),
    AvatarOption("🐿️", listOf(Color(0xFFEA580C), Color(0xFFB45309)), "Squirrel"),
    AvatarOption("🦔", listOf(Color(0xFFD97706), Color(0xFFEA580C)), "Hedgehog"),
    AvatarOption("🐢", listOf(Color(0xFF047857), Color(0xFF065F46)), "Turtle"),
    AvatarOption("🐊", listOf(Color(0xFF15803D), Color(0xFF166534)), "Crocodile"),
    AvatarOption("🦜", listOf(Color(0xFF059669), Color(0xFF047857)), "Parrot"),
    AvatarOption("🦚", listOf(Color(0xFF2563EB), Color(0xFF1D4ED8)), "Peacock"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = context.getSharedPreferences("clerk_session", android.content.Context.MODE_PRIVATE)
    val sessionToken = prefs.getString("session_token", null)
    
    var showAvatarPicker by remember { mutableStateOf(false) }
    var selectedAvatar by remember { mutableStateOf(AVATAR_OPTIONS[0]) }
    var isLoading by remember { mutableStateOf(true) }
    
    // Profile fields from API
    var displayName by remember { mutableStateOf("") }
    var userEmail by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var dateOfBirth by remember { mutableStateOf("") }
    var legalFirstName by remember { mutableStateOf("") }
    var legalLastName by remember { mutableStateOf("") }
    var legalName by remember { mutableStateOf("") }
    var addressLine1 by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var zipCode by remember { mutableStateOf("") }
    var country by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var showDatePicker by remember { mutableStateOf(false) }
    
    // Edit dialog state
    var editMode by remember { mutableStateOf("") } // "display_name", "legal_name", "phone", "address"
    var showEditDialog by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    
    // Edit fields for each dialog
    var editDisplayName by remember { mutableStateOf("") }
    var editLegalFirst by remember { mutableStateOf("") }
    var editLegalLast by remember { mutableStateOf("") }
    var editPhone by remember { mutableStateOf("") }
    var editAddr1 by remember { mutableStateOf("") }
    var editCity by remember { mutableStateOf("") }
    var editState by remember { mutableStateOf("") }
    var editZip by remember { mutableStateOf("") }
    var editCountry by remember { mutableStateOf("") }
    
    val coroutineScope = rememberCoroutineScope()
    
    // Fetch profile data from backend
    LaunchedEffect(sessionToken) {
        if (sessionToken != null) {
            try {
                val result = withContext(Dispatchers.IO) {
                    fetchProfileData(sessionToken)
                }
                if (result != null) {
                    val clerk = result.optJSONObject("clerk")
                    val profile = result.optJSONObject("profile")
                    
                    fun org.json.JSONObject.safeString(key: String): String {
                        val v = optString(key, "")
                        return if (v == "null" || v.isBlank()) "" else v
                    }
                    
                    displayName = profile?.safeString("display_name")?.ifEmpty { null }
                        ?: clerk?.safeString("fullName")?.ifEmpty { null }
                        ?: ""
                    
                    userEmail = clerk?.safeString("email") ?: ""
                    username = clerk?.safeString("username") ?: ""
                    phoneNumber = profile?.safeString("phone_number") ?: ""
                    dateOfBirth = profile?.safeString("date_of_birth") ?: ""
                    
                    legalFirstName = profile?.safeString("legal_first_name") ?: ""
                    legalLastName = profile?.safeString("legal_last_name") ?: ""
                    legalName = listOf(legalFirstName, legalLastName).filter { it.isNotEmpty() }.joinToString(" ")
                    
                    addressLine1 = profile?.safeString("address_line1") ?: ""
                    city = profile?.safeString("city") ?: ""
                    state = profile?.safeString("state") ?: ""
                    zipCode = profile?.safeString("zip_code") ?: ""
                    country = profile?.safeString("country")?.let { if (it == "US" || it == "United States") "" else it } ?: ""
                    address = listOfNotNull(
                        addressLine1.ifEmpty { null },
                        city.ifEmpty { null },
                        state.ifEmpty { null },
                        zipCode.ifEmpty { null }
                    ).joinToString(", ")
                    
                    val avatarEmoji = profile?.safeString("avatar_emoji")?.ifEmpty { null }
                    if (avatarEmoji != null) {
                        AVATAR_OPTIONS.find { it.emoji == avatarEmoji }?.let {
                            selectedAvatar = it
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("ProfileScreen", "Error fetching profile: ${e.message}")
            }
            isLoading = false
        } else {
            isLoading = false
        }
    }
    
    // Helper to save profile fields
    fun saveFields(fields: Map<String, String>, onDone: () -> Unit) {
        if (sessionToken == null) return
        isSaving = true
        coroutineScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val json = JSONObject()
                    fields.forEach { (k, v) -> json.put(k, v) }
                    val requestBody = json.toString()
                        .toRequestBody("application/json".toMediaType())
                    val request = Request.Builder()
                        .url("https://www.mafutapass.com/api/auth/mobile-profile")
                        .patch(requestBody)
                        .addHeader("Authorization", "Bearer $sessionToken")
                        .build()
                    OkHttpClient.Builder()
                        .connectTimeout(15, TimeUnit.SECONDS)
                        .readTimeout(15, TimeUnit.SECONDS)
                        .build()
                        .newCall(request).execute()
                }
                onDone()
            } catch (e: Exception) {
                android.util.Log.e("ProfileScreen", "Save failed: ${e.message}")
            }
            isSaving = false
            showEditDialog = false
        }
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
                    Icon(Icons.Filled.Person, null, tint = Emerald600)
                    Text("Profile", fontWeight = FontWeight.Bold)
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.ArrowBack, "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
        )
        
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Emerald600)
            }
        } else {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // --- PUBLIC SECTION ---
            item {
                Column(modifier = Modifier.padding(bottom = 2.dp)) {
                    Text(
                        "Public",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        "These details are displayed on your public profile. Anyone can see them.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                }
            }

            // Compact avatar row
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showAvatarPicker = true }
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(
                                    brush = Brush.verticalGradient(selectedAvatar.gradient)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(selectedAvatar.emoji, fontSize = 28.sp)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Profile picture",
                                style = MaterialTheme.typography.bodySmall,
                                color = Gray500
                            )
                            Text(
                                selectedAvatar.label,
                                style = MaterialTheme.typography.titleMedium,
                                color = Gray900
                            )
                        }
                        Icon(Icons.Filled.ChevronRight, null, tint = Gray500)
                    }
                }
            }
            
            // Display name
            item {
                ProfileField(
                    label = "Display name",
                    value = displayName.ifEmpty { "Not set" },
                    onClick = {
                        editMode = "display_name"
                        editDisplayName = displayName
                        showEditDialog = true
                    }
                )
            }

            // Contact methods (read-only)
            item {
                ProfileField(
                    label = "Contact methods",
                    value = userEmail.ifEmpty { "Not set" },
                    onClick = { }
                )
            }

            // --- PRIVATE SECTION ---
            item {
                Column(modifier = Modifier.padding(top = 8.dp, bottom = 2.dp)) {
                    Text(
                        "Private",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    Text(
                        "These details are used for travel and payments. They're never shown on your public profile.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                }
            }
            
            // Legal name
            item {
                ProfileField(
                    label = "Legal name",
                    value = legalName.ifEmpty { "Not set" },
                    onClick = {
                        editMode = "legal_name"
                        editLegalFirst = legalFirstName
                        editLegalLast = legalLastName
                        showEditDialog = true
                    }
                )
            }

            // Date of birth
            item {
                ProfileField(
                    label = "Date of birth",
                    value = if (dateOfBirth.isNotEmpty()) DateUtils.formatFull(dateOfBirth) else "Not set",
                    onClick = { showDatePicker = true }
                )
            }
            
            // Phone number
            item {
                ProfileField(
                    label = "Phone number",
                    value = phoneNumber.ifEmpty { "Not set" },
                    onClick = {
                        editMode = "phone"
                        // Strip +254 prefix for editing
                        val num = phoneNumber.replace(Regex("[\\s\\-]"), "")
                        editPhone = when {
                            num.startsWith("+254") -> num.substring(4)
                            num.startsWith("254") -> num.substring(3)
                            num.startsWith("0") -> num.substring(1)
                            else -> num
                        }
                        showEditDialog = true
                    }
                )
            }
            
            // Address
            item {
                ProfileField(
                    label = "Address",
                    value = address.ifEmpty { "Not set" },
                    onClick = {
                        editMode = "address"
                        editAddr1 = addressLine1
                        editCity = city
                        editState = state
                        editZip = zipCode
                        editCountry = country
                        showEditDialog = true
                    }
                )
            }
            
            // Bottom spacer
            item { Spacer(Modifier.height(16.dp)) }
        }
        } // end else
    }
    
    // ---- EDIT DIALOGS ----
    if (showEditDialog) {
        when (editMode) {
            "display_name" -> {
                AlertDialog(
                    onDismissRequest = { if (!isSaving) showEditDialog = false },
                    title = { Text("Display name") },
                    text = {
                        OutlinedTextField(
                            value = editDisplayName,
                            onValueChange = { editDisplayName = it },
                            label = { Text("Display name") },
                            singleLine = true,
                            enabled = !isSaving,
                            modifier = Modifier.fillMaxWidth()
                        )
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                saveFields(mapOf("display_name" to editDisplayName)) {
                                    displayName = editDisplayName
                                }
                            },
                            enabled = !isSaving && editDisplayName.isNotBlank()
                        ) { if (isSaving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Text("Save") }
                    },
                    dismissButton = { TextButton(onClick = { showEditDialog = false }, enabled = !isSaving) { Text("Cancel") } }
                )
            }
            "legal_name" -> {
                AlertDialog(
                    onDismissRequest = { if (!isSaving) showEditDialog = false },
                    title = { Text("Legal name") },
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = editLegalFirst,
                                onValueChange = { editLegalFirst = it },
                                label = { Text("First name") },
                                singleLine = true,
                                enabled = !isSaving,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = editLegalLast,
                                onValueChange = { editLegalLast = it },
                                label = { Text("Last name") },
                                singleLine = true,
                                enabled = !isSaving,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                saveFields(mapOf(
                                    "legal_first_name" to editLegalFirst.trim(),
                                    "legal_last_name" to editLegalLast.trim()
                                )) {
                                    legalFirstName = editLegalFirst.trim()
                                    legalLastName = editLegalLast.trim()
                                    legalName = listOf(legalFirstName, legalLastName).filter { it.isNotEmpty() }.joinToString(" ")
                                }
                            },
                            enabled = !isSaving
                        ) { if (isSaving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Text("Save") }
                    },
                    dismissButton = { TextButton(onClick = { showEditDialog = false }, enabled = !isSaving) { Text("Cancel") } }
                )
            }
            "phone" -> {
                AlertDialog(
                    onDismissRequest = { if (!isSaving) showEditDialog = false },
                    title = { Text("Phone number") },
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "Enter your 9-digit Kenyan mobile number",
                                style = MaterialTheme.typography.bodySmall,
                                color = Gray500
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(0.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                // Fixed +254 prefix
                                Surface(
                                    shape = RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp),
                                    color = Color(0xFFF9FAFB),
                                    border = BorderStroke(1.dp, Gray300),
                                    modifier = Modifier.height(56.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text("🇰🇪", fontSize = 18.sp)
                                        Text("+254", fontWeight = FontWeight.Medium, color = Gray700)
                                    }
                                }
                                // Phone input
                                OutlinedTextField(
                                    value = editPhone,
                                    onValueChange = { v ->
                                        val digits = v.filter { it.isDigit() }
                                        if (digits.length <= 9) editPhone = digits
                                    },
                                    placeholder = { Text("712345678") },
                                    singleLine = true,
                                    enabled = !isSaving,
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp)
                                )
                            }
                        }
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                val fullNumber = if (editPhone.isNotBlank()) "+254${editPhone.trim()}" else ""
                                saveFields(mapOf("phone_number" to fullNumber)) {
                                    phoneNumber = fullNumber
                                }
                            },
                            enabled = !isSaving
                        ) { if (isSaving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Text("Save") }
                    },
                    dismissButton = { TextButton(onClick = { showEditDialog = false }, enabled = !isSaving) { Text("Cancel") } }
                )
            }
            "address" -> {
                AlertDialog(
                    onDismissRequest = { if (!isSaving) showEditDialog = false },
                    title = { Text("Address") },
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = editAddr1,
                                onValueChange = { editAddr1 = it },
                                label = { Text("Street address") },
                                singleLine = true,
                                enabled = !isSaving,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = editCity,
                                onValueChange = { editCity = it },
                                label = { Text("City") },
                                singleLine = true,
                                enabled = !isSaving,
                                modifier = Modifier.fillMaxWidth()
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = editState,
                                    onValueChange = { editState = it },
                                    label = { Text("State") },
                                    singleLine = true,
                                    enabled = !isSaving,
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = editZip,
                                    onValueChange = { editZip = it },
                                    label = { Text("ZIP") },
                                    singleLine = true,
                                    enabled = !isSaving,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            OutlinedTextField(
                                value = editCountry,
                                onValueChange = { editCountry = it },
                                label = { Text("Country") },
                                singleLine = true,
                                enabled = !isSaving,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                saveFields(mapOf(
                                    "address_line1" to editAddr1.trim(),
                                    "city" to editCity.trim(),
                                    "state" to editState.trim(),
                                    "zip_code" to editZip.trim(),
                                    "country" to editCountry.trim()
                                )) {
                                    addressLine1 = editAddr1.trim()
                                    city = editCity.trim()
                                    state = editState.trim()
                                    zipCode = editZip.trim()
                                    country = editCountry.trim()
                                    address = listOfNotNull(
                                        addressLine1.ifEmpty { null },
                                        city.ifEmpty { null },
                                        state.ifEmpty { null },
                                        zipCode.ifEmpty { null }
                                    ).joinToString(", ")
                                }
                            },
                            enabled = !isSaving
                        ) { if (isSaving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Text("Save") }
                    },
                    dismissButton = { TextButton(onClick = { showEditDialog = false }, enabled = !isSaving) { Text("Cancel") } }
                )
            }
        }
    }
    
    // Avatar Picker Dialog
    if (showAvatarPicker) {
        Dialog(onDismissRequest = { showAvatarPicker = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Choose Avatar", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showAvatarPicker = false }) {
                            Icon(Icons.Filled.Close, "Close")
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.height(360.dp)
                    ) {
                        items(AVATAR_OPTIONS) { option ->
                            Box(
                                modifier = Modifier
                                    .aspectRatio(1f)
                                    .clip(CircleShape)
                                    .background(brush = Brush.verticalGradient(option.gradient))
                                    .then(
                                        if (selectedAvatar.emoji == option.emoji)
                                            Modifier.padding(2.dp)
                                        else Modifier
                                    )
                                    .clickable {
                                        selectedAvatar = option
                                        showAvatarPicker = false
                                        if (sessionToken != null) {
                                            coroutineScope.launch(Dispatchers.IO) {
                                                saveAvatarToBackend(sessionToken, option.emoji)
                                            }
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(option.emoji, fontSize = 28.sp)
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Date picker dialog
    if (showDatePicker) {
        val calendar = Calendar.getInstance()
        try {
            if (dateOfBirth.isNotEmpty()) {
                val parts = DateUtils.formatYMD(dateOfBirth).split("-")
                if (parts.size == 3) {
                    calendar.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
                }
            }
        } catch (_: Exception) {}
        
        DatePickerDialog(
            context,
            { _, year, month, day ->
                val newDate = String.format("%04d-%02d-%02d", year, month + 1, day)
                dateOfBirth = newDate
                saveFields(mapOf("date_of_birth" to newDate)) {}
                showDatePicker = false
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).apply {
            setOnCancelListener { showDatePicker = false }
            show()
        }
        showDatePicker = false
    }
}

@Composable
fun ProfileField(
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
                    color = if (value == "Not set") Gray500 else Gray900
                )
            }
            
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = "Edit",
                tint = Gray500
            )
        }
    }
}

/**
 * Fetch user profile from backend API using JWT token.
 */
private fun fetchProfileData(token: String): JSONObject? {
    val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val request = Request.Builder()
        .url("https://www.mafutapass.com/api/auth/mobile-profile")
        .get()
        .addHeader("Authorization", "Bearer $token")
        .build()

    val response = client.newCall(request).execute()
    val body = response.body?.string() ?: return null

    if (!response.isSuccessful) {
        android.util.Log.e("ProfileScreen", "Profile fetch failed: ${response.code}")
        return null
    }

    return JSONObject(body)
}

/**
 * Save avatar emoji to backend.
 */
private fun saveAvatarToBackend(token: String, emoji: String) {
    try {
        val client = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        val json = JSONObject().apply {
            put("avatar_emoji", emoji)
        }

        val requestBody = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("https://www.mafutapass.com/api/auth/mobile-profile")
            .patch(requestBody)
            .addHeader("Authorization", "Bearer $token")
            .build()

        val response = client.newCall(request).execute()
        if (response.isSuccessful) {
            android.util.Log.d("ProfileScreen", "✅ Avatar saved successfully")
        } else {
            android.util.Log.e("ProfileScreen", "❌ Avatar save failed: ${response.code}")
        }
    } catch (e: Exception) {
        android.util.Log.e("ProfileScreen", "❌ Error saving avatar: ${e.message}")
    }
}