package com.mafutapass.app.util

import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Format an ISO date string (e.g. "2025-02-14T10:30:00Z") into a user-friendly display.
 * Uses locale-aware formatting so dates adapt to the user's device locale.
 *
 * Examples (en_KE / en_GB):
 *  - "14 Feb 2025"
 *  - "14/02/2025"
 */
object DateUtils {

    private val isoFormats = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") },
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") },
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US),
        SimpleDateFormat("yyyy-MM-dd", Locale.US),
    )

    /** Locale-aware medium date format (e.g. "14 Feb 2025" or "Feb 14, 2025") */
    private val displayFull: DateFormat get() = DateFormat.getDateInstance(DateFormat.MEDIUM)

    /** Locale-aware short date format (e.g. "14/02/2025" or "2/14/25") */
    private val displayShort: DateFormat get() = DateFormat.getDateInstance(DateFormat.SHORT)

    /** Locale-aware medium date format — same as full but explicit for card displays */
    private val displayMedium: DateFormat get() = DateFormat.getDateInstance(DateFormat.MEDIUM)

    private val displayDate = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    /**
     * "2025-02-14T10:30:00Z" → locale-aware medium date (e.g. "14 Feb 2025")
     */
    fun formatFull(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return parse(iso)?.let { displayFull.format(it) } ?: iso.take(10)
    }

    /**
     * "2025-02-14T10:30:00Z" → locale-aware short date (e.g. "14/02/2025")
     */
    fun formatShort(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return parse(iso)?.let { displayShort.format(it) } ?: iso.take(10)
    }

    /**
     * "2025-02-14T10:30:00Z" → locale-aware medium date (e.g. "Feb 14, 2025")
     * Used for card displays — no time component.
     */
    fun formatMedium(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return parse(iso)?.let { displayMedium.format(it) } ?: iso.take(10)
    }

    /**
     * "2025-02-14T10:30:00Z" → "2025-02-14"
     */
    fun formatYMD(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return parse(iso)?.let { displayDate.format(it) } ?: iso.take(10)
    }

    private fun parse(iso: String): java.util.Date? {
        for (fmt in isoFormats) {
            try { return fmt.parse(iso) } catch (_: Exception) {}
        }
        return null
    }
}
