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

private val MONTHS = listOf("January","February","March","April","May","June","July","August","September","October","November","December")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditDateOfBirthScreen(
    onBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val profileState by viewModel.profileState.collectAsState()
    val updateState by viewModel.updateState.collectAsState()
    var day by remember { mutableStateOf("") }
    var monthIndex by remember { mutableStateOf(-1) }
    var year by remember { mutableStateOf("") }
    var monthExpanded by remember { mutableStateOf(false) }
    var initialized by remember { mutableStateOf(false) }

    LaunchedEffect(profileState) {
        if (!initialized && profileState is NetworkResult.Success) {
            val dob = (profileState as NetworkResult.Success).data.dateOfBirth ?: ""
            if (dob.isNotEmpty()) {
                val parts = dob.split("-")
                if (parts.size == 3) { year = parts[0]; monthIndex = (parts[1].toIntOrNull() ?: 1) - 1; day = parts[2].trimStart('0').ifEmpty { parts[2] } }
            }
            initialized = true
        }
    }

    val isLoading = profileState is NetworkResult.Loading
    val isSaving = updateState is ProfileViewModel.UpdateState.Loading

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
        TopAppBar(title = { Text("Date of birth", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Enter your date of birth in DD/Month/YYYY format.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Column {
                        Text("Day", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = day, onValueChange = { v -> val d = v.filter { it.isDigit() }; if (d.length <= 2) { val n = d.toIntOrNull(); if (n == null || n in 1..31) day = d } },
                            placeholder = { Text("DD") }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = appOutlinedTextFieldColors())
                    }
                    Column {
                        Text("Month", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        ExposedDropdownMenuBox(expanded = monthExpanded, onExpandedChange = { monthExpanded = it }) {
                            OutlinedTextField(value = if (monthIndex >= 0) MONTHS[monthIndex] else "", onValueChange = {}, readOnly = true,
                                placeholder = { Text("Select month") }, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = monthExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor(), shape = RoundedCornerShape(12.dp),
                                colors = appOutlinedTextFieldColors())
                            ExposedDropdownMenu(expanded = monthExpanded, onDismissRequest = { monthExpanded = false }) {
                                MONTHS.forEachIndexed { i, m -> DropdownMenuItem(text = { Text(m) }, onClick = { monthIndex = i; monthExpanded = false }) }
                            }
                        }
                    }
                    Column {
                        Text("Year", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = year, onValueChange = { v -> val d = v.filter { it.isDigit() }; if (d.length <= 4) year = d },
                            placeholder = { Text("YYYY") }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = appOutlinedTextFieldColors())
                    }
                }
                Button(onClick = {
                    val d = day.padStart(2, '0'); val m = (monthIndex + 1).toString().padStart(2, '0')
                    viewModel.updateDateOfBirth("$year-$m-$d") { onBack() }
                }, enabled = !isSaving && day.isNotEmpty() && monthIndex >= 0 && year.length == 4, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, disabledContainerColor = MaterialTheme.colorScheme.outline)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
