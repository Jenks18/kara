package com.mafutapass.app.util

import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

/**
 * Format an amount with a currency code.
 * Uses Intl NumberFormat under the hood — consistent with the web app's lib/currency.ts.
 *
 * Usage: formatCurrency(1234.50, "KES") → "KES 1,234.50"
 */
object CurrencyFormatter {

    /**
     * Default currency code used when callers omit the currencyCode parameter.
     * Updated automatically by WorkspaceRepository when the active workspace changes.
     * Defaults to "KES" until the workspace is fetched from the API.
     */
    @Volatile
    var defaultCurrencyCode: String = "KES"

    private val formatters = mutableMapOf<String, NumberFormat>()

    private val localeMap = mapOf(
        "KES" to Locale("en", "KE"),
        "USD" to Locale.US,
        "EUR" to Locale.GERMANY,
        "GBP" to Locale.UK,
        "JPY" to Locale.JAPAN,
        "AUD" to Locale("en", "AU"),
        "CAD" to Locale.CANADA,
        "CHF" to Locale("de", "CH"),
        "CNY" to Locale.CHINA,
        "INR" to Locale("en", "IN"),
        "ZAR" to Locale("en", "ZA"),
        "NGN" to Locale("en", "NG"),
        "TZS" to Locale("en", "TZ"),
        "UGX" to Locale("en", "UG"),
    )

    fun format(amount: Double, currencyCode: String = defaultCurrencyCode): String {
        val formatter = formatters.getOrPut(currencyCode) {
            val locale = localeMap[currencyCode] ?: Locale.US
            NumberFormat.getCurrencyInstance(locale).apply {
                try {
                    currency = Currency.getInstance(currencyCode)
                } catch (_: Exception) {
                    // Fall back to locale default
                }
                minimumFractionDigits = 2
                maximumFractionDigits = 2
            }
        }
        return synchronized(formatter) { formatter.format(amount) }
    }

    /**
     * Simple format: "KES 1,234.50" — always uses the code prefix.
     * Useful when the platform NumberFormat produces symbols the user won't recognize.
     */
    fun formatSimple(amount: Double, currencyCode: String = defaultCurrencyCode): String {
        return "$currencyCode ${String.format("%,.2f", amount)}"
    }
}
