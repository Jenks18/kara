package com.mafutapass.app.data

data class ExpenseItem(
    val id: String,
    val imageUrl: String,
    val amount: Double,
    val category: String,
    val merchantName: String?,
    val transactionDate: String?,
    val kraVerified: Boolean?,
    val workspaceName: String,
    val description: String?
)

data class ExpenseReport(
    val id: String,
    val title: String,
    val status: String, // draft, submitted, approved, rejected
    val itemsCount: Int,
    val totalAmount: Double,
    val workspaceName: String,
    val thumbnails: List<String>,
    val createdAt: String
)

data class Workspace(
    val id: String,
    val name: String,
    val currency: String,
    val currencySymbol: String,
    val avatar: String?
) {
    val initials: String
        get() = name.split(" ")
            .take(2)
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .joinToString("")
            .ifEmpty { name.take(1).uppercase() }
}

data class User(
    val id: String,
    val name: String,
    val email: String,
    val avatar: String?
)
