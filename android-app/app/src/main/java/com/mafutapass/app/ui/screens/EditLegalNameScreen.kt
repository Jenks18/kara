package com.mafutapass.app.ui.screens

import android.widget.Toast
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
import androidx.hilt.navigation.compose.hiltViewModel
import com.mafutapass.app.data.network.NetworkResult
import com.mafutapass.app.ui.theme.*
import com.mafutapass.app.viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditLegalNameScreen(
    onBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val profileState by viewModel.profileState.collectAsState()
    val updateState by viewModel.updateState.collectAsState()
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var initialized by remember { mutableStateOf(false) }

    // Pre-populate from profile when loaded
    LaunchedEffect(profileState) {
        if (!initialized && profileState is NetworkResult.Success) {
            val user = (profileState as NetworkResult.Success).data
            firstName = user.legalFirstName ?: user.firstName ?: ""
            lastName = user.legalLastName ?: user.lastName ?: ""
            initialized = true
        }
    }

    val isLoading = profileState is NetworkResult.Loading
    val isSaving = updateState is ProfileViewModel.UpdateState.Loading

    // Handle update result
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
        TopAppBar(title = { Text("Legal name", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Column {
                        Text("First name", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = firstName, onValueChange = { firstName = it }, placeholder = { Text("First name") },
                            singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = appOutlinedTextFieldColors())
                    }
                    Column {
                        Text("Last name", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = lastName, onValueChange = { lastName = it }, placeholder = { Text("Last name") },
                            singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = appOutlinedTextFieldColors())
                    }
                }
                Button(onClick = {
                    viewModel.updateLegalName(firstName.trim(), lastName.trim()) { onBack() }
                }, enabled = !isSaving, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, disabledContainerColor = MaterialTheme.colorScheme.outline)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
