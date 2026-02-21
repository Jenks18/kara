package com.mafutapass.app.di

import com.mafutapass.app.data.ApiService
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Hilt entry point for accessing ApiService from @Composable functions.
 *
 * Usage in a Composable:
 * ```
 * val context = LocalContext.current
 * val apiService = remember {
 *     EntryPointAccessors.fromApplication(
 *         context.applicationContext,
 *         ApiServiceEntryPoint::class.java
 *     ).apiService()
 * }
 * ```
 *
 * This exposes the same singleton ApiService that Hilt provides to
 * ViewModels / repositories — no extra OkHttpClient, no manual Bearer
 * attachment, automatic 401 retry via AuthAuthenticator.
 */
@EntryPoint
@InstallIn(SingletonComponent::class)
interface ApiServiceEntryPoint {
    fun apiService(): ApiService
}
