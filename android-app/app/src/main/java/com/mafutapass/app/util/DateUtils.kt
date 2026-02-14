package com.mafutapass.app.util

import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Format an ISO date string (e.g. "2025-02-14T10:30:00Z") into a user-friendly display.
 *
 * Examples:
 *  - "Feb 14, 2025"
 *  - "Jan 3"  (short form)
 */
object DateUtils {

    private val isoFormats = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") },
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") },
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US),
        SimpleDateFormat("yyyy-MM-dd", Locale.US),
    )

    private val displayFull = SimpleDateFormat("dd/MM/yyyy", Locale.UK)
    private val displayShort = SimpleDateFormat("d MMM", Locale.UK)
    private val displayDate = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    /**
     * "2025-02-14T10:30:00Z" → "14/02/2025"
     */
    fun formatFull(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return parse(iso)?.let { displayFull.format(it) } ?: iso.take(10)
    }

    /**
     * "2025-02-14T10:30:00Z" → "14 Feb"
     */
    fun formatShort(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return parse(iso)?.let { displayShort.format(it) } ?: iso.take(10)
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
