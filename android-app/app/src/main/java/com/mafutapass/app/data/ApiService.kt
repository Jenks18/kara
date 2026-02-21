package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API service interface.
 * 
 * All endpoints are authenticated automatically via AuthInterceptor.
 * 401 responses are handled automatically via AuthAuthenticator.
 * 
 * Inject this service via Hilt:
 * ```
 * @Inject lateinit var apiService: ApiService
 * ```
 */
interface ApiService {
    
    // ============= Workspaces =============
    
    @GET("api/mobile/workspaces")
    suspend fun getWorkspaces(): WorkspacesResponse
    
    @GET("api/mobile/workspaces/{id}")
    suspend fun getWorkspace(@Path("id") id: String): WorkspaceDetailResponse
    
    @DELETE("api/mobile/workspaces/{id}")
    suspend fun deleteWorkspace(@Path("id") id: String): Map<String, Any>
    
    @POST("api/mobile/workspaces")
    suspend fun createWorkspace(@Body body: CreateWorkspaceRequest): CreateWorkspaceResponse

    @PATCH("api/mobile/workspaces/{id}")
    suspend fun updateWorkspace(@Path("id") id: String, @Body body: Map<String, String>): WorkspaceDetailResponse
    
    // ============= Expense Reports =============
    
    @GET("api/mobile/expense-reports")
    suspend fun getExpenseReports(@Query("workspaceId") workspaceId: String? = null): List<ExpenseReport>
    
    @POST("api/mobile/expense-reports")
    suspend fun createExpenseReport(@Body body: Map<String, String>): ExpenseReport
    
    // ============= Receipts =============
    
    @GET("api/mobile/receipts")
    suspend fun getReceipts(@Query("workspaceId") workspaceId: String? = null): List<ExpenseItem>
    
    @GET("api/mobile/receipts/{id}")
    suspend fun getReceipt(@Path("id") id: String): ExpenseItem
    
    @PATCH("api/mobile/receipts/{id}")
    suspend fun updateReceipt(
        @Path("id") id: String,
        @Body body: UpdateReceiptRequest
    ): UpdateReceiptResponse
    
    @GET("api/mobile/expense-reports/{id}")
    suspend fun getExpenseReport(@Path("id") id: String): ExpenseReportDetail
    
    @Multipart
    @POST("api/mobile/receipts/upload")
    suspend fun uploadReceipt(
        @Part image: okhttp3.MultipartBody.Part,
        @Part("reportId") reportId: okhttp3.RequestBody? = null,
        @Part("workspaceId") workspaceId: okhttp3.RequestBody? = null,
        @Part("workspaceName") workspaceName: okhttp3.RequestBody? = null,
        @Part("latitude") latitude: okhttp3.RequestBody? = null,
        @Part("longitude") longitude: okhttp3.RequestBody? = null,
        @Part("qrUrl") qrUrl: okhttp3.RequestBody? = null
    ): ReceiptUploadResponse
    
    // ============= Workspace Members =============
    
    @GET("api/mobile/workspaces/{id}/members")
    suspend fun getWorkspaceMembers(@Path("id") workspaceId: String): WorkspaceMembersResponse
    
    // ============= User Profile =============
    
    @GET("api/auth/mobile-profile")
    suspend fun getUserProfile(): MobileProfileResponse

    @PATCH("api/auth/mobile-profile")
    suspend fun updateUserProfile(@Body request: UpdateProfileRequest): UpdateProfileResponse

    // ============= Account Management =============

    @POST("api/account/delete-request")
    suspend fun deleteAccount(@Body request: DeleteAccountRequest): Response<Void>

    @POST("api/account/report-bug")
    suspend fun reportBug(@Body request: ReportBugRequest): Response<Void>

    @POST("api/account/suspicious-activity")
    suspend fun reportSuspiciousActivity(@Body request: ReportSuspiciousActivityRequest): Response<Void>
}

data class WorkspacesResponse(val workspaces: List<Workspace>)
data class WorkspaceDetailResponse(val workspace: Workspace)
data class CreateWorkspaceRequest(val name: String, val currency: String = "KES", val currencySymbol: String = "KSh")
data class CreateWorkspaceResponse(val workspace: Workspace)
data class WorkspaceMembersResponse(val members: List<WorkspaceMember>)
data class WorkspaceMember(
    val id: String = "",
    @SerializedName("user_id") val userId: String = "",
    val email: String = "",
    val role: String = "member",
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("first_name") val firstName: String? = null,
    @SerializedName("last_name") val lastName: String? = null,
    @SerializedName("avatar_emoji") val avatarEmoji: String? = null
)

// ============= Account Management Request Models =============

data class DeleteAccountRequest(
    val email: String,
    val reason: String
)

data class ReportBugRequest(
    val category: String,
    val severity: String,
    val title: String,
    val description: String,
    val stepsToReproduce: String,
    val userEmail: String,
    val userId: String,
    val platform: String = "Android"
)

data class ReportSuspiciousActivityRequest(
    val activityTypes: List<String>,
    val description: String,
    val userEmail: String,
    val userId: String,
    val platform: String = "Android"
)
