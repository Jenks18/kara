package com.mafutapass.app.data

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
    private const val BASE_URL = "https://kara-zeta.vercel.app/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Content-Type", "application/json")
                .build()
            chain.proceed(request)
        }
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
