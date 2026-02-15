package com.mafutapass.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditPhoneNumberScreen(
    onBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val profileState by viewModel.profileState.collectAsState()
    val updateState by viewModel.updateState.collectAsState()
    var phoneDigits by remember { mutableStateOf("") }
    var initialized by remember { mutableStateOf(false) }

    LaunchedEffect(profileState) {
        if (!initialized && profileState is NetworkResult.Success) {
            val user = (profileState as NetworkResult.Success).data
            val num = (user.phoneNumber ?: "").replace(Regex("[\\s\\-]"), "")
            phoneDigits = when {
                num.startsWith("+254") -> num.substring(4)
                num.startsWith("254") -> num.substring(3)
                num.startsWith("0") -> num.substring(1)
                else -> num
            }
            initialized = true
        }
    }

    val isLoading = profileState is NetworkResult.Loading
    val isSaving = updateState is ProfileViewModel.UpdateState.Loading
    val isValid = phoneDigits.length == 9 && (phoneDigits.startsWith("7") || phoneDigits.startsWith("1"))

    LaunchedEffect(updateState) {
        when (updateState) {
            is ProfileViewModel.UpdateState.Error -> {
                Toast.makeText(context, (updateState as ProfileViewModel.UpdateState.Error).message, Toast.LENGTH_SHORT).show()
                viewModel.resetUpdateState()
            }
            else -> {}
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(AppTheme.colors.backgroundGradient)) {
        TopAppBar(title = { Text("Phone number", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Enter your 9-digit Kenyan mobile number", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Column {
                        Text("Phone number", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                            Surface(shape = RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp), color = MaterialTheme.colorScheme.surfaceVariant,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline), modifier = Modifier.height(56.dp)) {
                                Row(Modifier.padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("\uD83C\uDDF0\uD83C\uDDEA", fontSize = 20.sp); Text("+254", fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                            OutlinedTextField(value = phoneDigits, onValueChange = { v -> val d = v.filter { it.isDigit() }; if (d.length <= 9) phoneDigits = d },
                                placeholder = { Text("712345678") }, singleLine = true, enabled = !isSaving, modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(topEnd = 12.dp, bottomEnd = 12.dp),
                                colors = appOutlinedTextFieldColors())
                        }
                        if (phoneDigits.isNotEmpty() && !isValid) {
                            Text(if (phoneDigits.length < 9) "Enter exactly 9 digits" else "Number must start with 7 or 1",
                                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 6.dp))
                        }
                    }
                }
                Button(onClick = {
                    val fullNum = if (phoneDigits.isNotBlank()) "+254${phoneDigits.trim()}" else ""
                    viewModel.updatePhoneNumber(fullNum) { onBack() }
                }, enabled = !isSaving && (isValid || phoneDigits.isEmpty()), modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, disabledContainerColor = MaterialTheme.colorScheme.outline)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
