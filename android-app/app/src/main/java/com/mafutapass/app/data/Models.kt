package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName

data class ExpenseItem(
    val id: String = "",
    @SerializedName("image_url")
    val imageUrl: String = "",
    val amount: Double = 0.0,
    val category: String = "Uncategorized",
    @SerializedName("merchant_name")
    val merchantName: String? = null,
    @SerializedName("transaction_date")
    val transactionDate: String? = null,
    @SerializedName("created_at")
    val createdAt: String = "",
    @SerializedName("kra_verified")
    val kraVerified: Boolean? = null,
    @SerializedName("workspace_name")
    val workspaceName: String = "",
    @SerializedName("processing_status")
    val processingStatus: String = "processed",
    val description: String? = null
)

data class ExpenseReport(
    val id: String = "",
    val title: String = "",
    val status: String = "draft", // draft, submitted, approved, rejected
    @SerializedName("items_count")
    val itemsCount: Int = 0,
    @SerializedName("total_amount")
    val totalAmount: Double = 0.0,
    @SerializedName("workspace_name")
    val workspaceName: String = "",
    val thumbnails: List<String> = emptyList(),
    @SerializedName("created_at")
    val createdAt: String = ""
)

data class Workspace(
    val id: String = "",
    val name: String = "",
    val currency: String = "KES",
    @SerializedName("currency_symbol")
    val currencySymbol: String = "KSh",
    val avatar: String? = null,
    val description: String? = null,
    @SerializedName("plan_type")
    val planType: String? = null,
    val address: String? = null,
    @SerializedName("is_active")
    val isActive: Boolean = true,
    @SerializedName("created_at")
    val createdAt: String? = null
) {
    val initials: String
        get() = name.split(" ")
            .take(2)
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .joinToString("")
            .ifEmpty { name.take(1).uppercase() }
}

/**
 * User profile data model.
 * Matches the backend API response structure.
 */
data class User(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val avatar: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val displayName: String? = null,
    val phoneNumber: String? = null,
    val dateOfBirth: String? = null,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null,
    val postalCode: String? = null
)

/**
 * Request body for updating user profile.
 * Only include fields that are being updated.
 */
data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val displayName: String? = null,
    val phoneNumber: String? = null,
    val dateOfBirth: String? = null,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null,
    val postalCode: String? = null
)

/**
 * Response from profile update API.
 */
data class UpdateProfileResponse(
    val success: Boolean,
    val message: String? = null,
    val user: User? = null
)
