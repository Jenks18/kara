package com.mafutapass.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.material3.MenuAnchorType
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

private val COUNTRIES = listOf("Kenya", "United States", "United Kingdom", "Canada", "Tanzania", "Uganda")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditAddressScreen(
    onBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val profileState by viewModel.profileState.collectAsState()
    val updateState by viewModel.updateState.collectAsState()
    var addressLine1 by remember { mutableStateOf("") }
    var addressLine2 by remember { mutableStateOf("") }
    var country by remember { mutableStateOf("Kenya") }
    var state by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    @Suppress("UNUSED_VALUE")
    var zipCode by remember { mutableStateOf("") }
    var countryExpanded by remember { mutableStateOf(false) }
    var initialized by remember { mutableStateOf(false) }

    LaunchedEffect(profileState) {
        if (!initialized && profileState is NetworkResult.Success) {
            val user = (profileState as NetworkResult.Success).data
            addressLine1 = user.addressLine1 ?: ""
            addressLine2 = user.addressLine2 ?: ""
            city = user.city ?: ""
            state = user.state ?: ""
            zipCode = user.postalCode ?: ""
            country = user.country?.ifEmpty { "Kenya" } ?: "Kenya"
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
        TopAppBar(title = { Text("Address", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            windowInsets = WindowInsets(0, 0, 0, 0))

        if (isLoading) { Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) } }
        else {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    @Composable fun Field(lbl: String, v: String, onChange: (String) -> Unit) {
                        Column {
                            Text(lbl, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                            OutlinedTextField(value = v, onValueChange = onChange, placeholder = { Text(lbl) }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                                colors = appOutlinedTextFieldColors())
                        }
                    }
                    Field("Address line 1", addressLine1) { addressLine1 = it }
                    Field("Address line 2", addressLine2) { addressLine2 = it }
                    Column {
                        Text("Country", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        ExposedDropdownMenuBox(expanded = countryExpanded, onExpandedChange = { countryExpanded = it }) {
                            OutlinedTextField(value = country, onValueChange = {}, readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = countryExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable, true), shape = RoundedCornerShape(12.dp),
                                colors = appOutlinedTextFieldColors())
                            ExposedDropdownMenu(expanded = countryExpanded, onDismissRequest = { countryExpanded = false }) {
                                COUNTRIES.forEach { c -> DropdownMenuItem(text = { Text(c) }, onClick = { country = c; countryExpanded = false }) }
                            }
                        }
                    }
                    Field("State", state) { state = it }
                    Field("City", city) { city = it }
                    Column {
                        Text("Zip / Postcode", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = zipCode, onValueChange = { zipCode = it }, placeholder = { Text("Zip / Postcode") }, singleLine = true, enabled = !isSaving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            colors = appOutlinedTextFieldColors())
                        Text("e.g. 12345, 12345-1234", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                    }
                    Spacer(Modifier.height(8.dp))
                }
                Button(onClick = {
                    viewModel.updateAddress(
                        addressLine1 = addressLine1.trim(),
                        addressLine2 = addressLine2.trim().ifEmpty { null },
                        city = city.trim().ifEmpty { null },
                        state = state.trim().ifEmpty { null },
                        country = country.trim(),
                        postalCode = zipCode.trim().ifEmpty { null }
                    ) { onBack() }
                }, enabled = !isSaving, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(56.dp),
                    shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, disabledContainerColor = MaterialTheme.colorScheme.outline)) {
                    if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    else Text("Save", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
