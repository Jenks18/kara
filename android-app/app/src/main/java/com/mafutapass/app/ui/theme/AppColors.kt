package com.mafutapass.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Extended color system for MafutaPass.
 *
 * Material3 ColorScheme covers most needs but doesn't have slots for
 * gradients, brand-specific semantic colors, or status indicators.
 * This class fills those gaps while remaining theme-aware so dark mode
 * can simply swap in a different instance.
 */
@Immutable
data class AppColors(
    // ── Gradients ──────────────────────────────────────────────
    val backgroundGradient: Brush,
    val primaryGradient: Brush,
    val headerGradient: Brush,

    // ── Brand / Identity ──────────────────────────────────────
    val googleBlue: Color = Color(0xFF4285F4),

    // ── Status / Semantic ─────────────────────────────────────
    val statusApproved: Color,
    val statusPending: Color,
    val statusRejected: Color,
    val statusDraft: Color,

    // ── Surface helpers (lightweight aliases) ─────────────────
    val cardSurface: Color,
    val divider: Color,
    val shimmerBase: Color,
    val shimmerHighlight: Color,
)

// ── Light palette ─────────────────────────────────────────────
val LightAppColors = AppColors(
    backgroundGradient = Brush.linearGradient(listOf(Emerald50, Green50, Emerald100)),
    primaryGradient = Brush.linearGradient(listOf(Emerald400, Emerald600)),
    headerGradient = Brush.linearGradient(listOf(Emerald600, Color(0xFF059669))),
    statusApproved = Emerald600,
    statusPending = Color(0xFFD97706),
    statusRejected = Color(0xFFDC2626),
    statusDraft = Gray500,
    cardSurface = Color.White,
    divider = Gray200,
    shimmerBase = Gray200,
    shimmerHighlight = Gray100,
)

// ── Dark palette (ready to wire up when dark mode is enabled) ─
val DarkAppColors = AppColors(
    backgroundGradient = Brush.linearGradient(
        listOf(Color(0xFF0A1A10), Color(0xFF0F1F15), Color(0xFF0A1A10))
    ),
    primaryGradient = Brush.linearGradient(listOf(Emerald600, Emerald700)),
    headerGradient = Brush.linearGradient(listOf(Emerald700, Color(0xFF065F46))),
    statusApproved = Emerald400,
    statusPending = Color(0xFFFBBF24),
    statusRejected = Color(0xFFF87171),
    statusDraft = Gray400,
    cardSurface = Color(0xFF1E1E1E),
    divider = Color(0xFF2D2D2D),
    shimmerBase = Color(0xFF1E1E1E),
    shimmerHighlight = Color(0xFF2D2D2D),
)

// ── CompositionLocal ──────────────────────────────────────────
val LocalAppColors = staticCompositionLocalOf { LightAppColors }

/**
 * Convenience accessor — use like `AppTheme.colors.backgroundGradient`.
 */
object AppTheme {
    val colors: AppColors
        @Composable get() = LocalAppColors.current
}

// ── Reusable OutlinedTextField color sets ──────────────────────
/**
 * Standard text field colors.  Every screen should use this instead of
 * manually specifying 3 colors and forgetting text color.
 */
@Composable
fun appOutlinedTextFieldColors(): TextFieldColors =
    OutlinedTextFieldDefaults.colors(
        focusedTextColor = MaterialTheme.colorScheme.onSurface,
        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
        disabledTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
        focusedBorderColor = MaterialTheme.colorScheme.primary,
        unfocusedBorderColor = MaterialTheme.colorScheme.outline,
        disabledBorderColor = MaterialTheme.colorScheme.outlineVariant,
        focusedContainerColor = MaterialTheme.colorScheme.surface,
        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
        disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
        cursorColor = MaterialTheme.colorScheme.primary,
        focusedLabelColor = MaterialTheme.colorScheme.primary,
        unfocusedLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
        disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
        focusedPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant,
        unfocusedPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant,
    )
