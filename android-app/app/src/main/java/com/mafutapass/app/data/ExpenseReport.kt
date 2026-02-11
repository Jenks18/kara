
package com.mafutapass.app.data

import com.google.gson.annotations.SerializedName

data class ExpenseReport(
    val id: String,
    @SerializedName("created_at")
    val createdAt: String,
    @SerializedName("user_id")
    val userId: String,
    @SerializedName("user_email")
    val userEmail: String,
    @SerializedName("workspace_name")
    val workspaceName: String,
    @SerializedName("workspace_avatar")
    val workspaceAvatar: String?,
    val title: String,
    val status: String, // "draft", "submitted", "approved", "rejected"
    @SerializedName("total_amount")
    val totalAmount: Double,
    val items: List<ExpenseItem>
)
