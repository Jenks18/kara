package com.mafutapass.app.data

import android.content.Context
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

interface ApiService {
    @GET("api/workspaces")
    suspend fun getWorkspaces(): List<Workspace>
    
    @GET("api/expense-reports")
    suspend fun getExpenseReports(@Query("workspaceId") workspaceId: String? = null): List<ExpenseReport>
    
    @GET("api/receipts")
    suspend fun getReceipts(@Query("workspaceId") workspaceId: String? = null): List<ExpenseItem>
    
    @GET("api/user-profile")
    suspend fun getUserProfile(): User
}

object ApiClient {
    private const val BASE_URL = "https://www.mafutapass.com/"
    
    private var applicationContext: Context? = null
    
    fun initialize(context: Context) {
        applicationContext = context.applicationContext
    }
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val authInterceptor: (okhttp3.Interceptor.Chain) -> okhttp3.Response = { chain ->
        val token = applicationContext?.let { context ->
            context.getSharedPreferences("clerk_session", Context.MODE_PRIVATE)
                .getString("session_token", null)
        }
        
        val request = chain.request().newBuilder()
            .addHeader("Content-Type", "application/json")
            .apply {
                if (token != null) {
                    addHeader("Authorization", "Bearer $token")
                    android.util.Log.d("ApiClient", "Added auth token to request: ${token.take(30)}...")
                } else {
                    android.util.Log.w("ApiClient", "No auth token available for request")
                }
            }
            .build()
        chain.proceed(request)
    }
    
    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(authInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
