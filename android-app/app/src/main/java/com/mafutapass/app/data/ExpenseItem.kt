
package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName

data class ExpenseItem(
    val id: String,
    @SerializedName("created_at")
    val createdAt: String,
    @SerializedName("image_url")
    val imageUrl: String,
    val description: String?,
    val category: String,
    val amount: Double,
    val reimbursable: Boolean,
    @SerializedName("processing_status")
    val processingStatus: String, // "scanning", "processed", "error"
    @SerializedName("merchant_name")
    val merchantName: String?,
    @SerializedName("transaction_date")
    val transactionDate: String?
)
