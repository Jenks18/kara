package com.mafutapass.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ExpenseItem(
    val id: String,
    @SerialName("image_url")
    val imageUrl: String,
    val amount: Double,
    val category: String,
    @SerialName("merchant_name")
    val merchantName: String? = null,
    @SerialName("transaction_date")
    val transactionDate: String? = null,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("kra_verified")
    val kraVerified: Boolean? = null,
    @SerialName("workspace_name")
    val workspaceName: String = "",
    val description: String? = null
)

@Serializable
data class ExpenseReport(
    val id: String,
    val title: String,
    val status: String, // draft, submitted, approved, rejected
    @SerialName("items_count")
    val itemsCount: Int = 0,
    @SerialName("total_amount")
    val totalAmount: Double,
    @SerialName("workspace_name")
    val workspaceName: String = "",
    val thumbnails: List<String> = emptyList(),
    @SerialName("created_at")
    val createdAt: String
)

@Serializable
data class Workspace(
    val id: String,
    val name: String,
    val currency: String,
    @SerialName("currency_symbol")
    val currencySymbol: String,
    val avatar: String? = null
) {
    val initials: String
        get() = name.split(" ")
            .take(2)
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .joinToString("")
            .ifEmpty { name.take(1).uppercase() }
}

@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String,
    val avatar: String? = null
)
