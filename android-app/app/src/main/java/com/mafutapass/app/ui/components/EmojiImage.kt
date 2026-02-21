package com.mafutapass.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.rememberAsyncImagePainter
import coil.request.ImageRequest

/**
 * Renders an emoji as an image from a CDN instead of using platform-native text.
 *
 * Why: Android uses Google's Noto emoji font while iOS/webapp use Apple's emoji font.
 * The same 🐻 looks completely different. By rendering as images from a consistent
 * CDN, all platforms show the same visual. This is the approach used by Slack, Discord,
 * WhatsApp, and other production apps for cross-platform emoji consistency.
 *
 * Source: Twemoji (Twitter's open-source emoji set) via jsDelivr CDN.
 * License: CC-BY 4.0 / MIT
 */
@Composable
fun EmojiImage(
    emoji: String,
    size: Dp = 24.dp,
    contentDescription: String? = null
) {
    val codepoint = emojiToCodepoint(emoji)
    if (codepoint != null) {
        val url = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/$codepoint.png"
        Image(
            painter = rememberAsyncImagePainter(
                ImageRequest.Builder(LocalContext.current)
                    .data(url)
                    .crossfade(true)
                    .build()
            ),
            contentDescription = contentDescription,
            modifier = Modifier.size(size),
            contentScale = ContentScale.Fit
        )
    } else {
        // Fallback: render as native text (shouldn't happen for our 30 avatar emojis)
        androidx.compose.material3.Text(emoji, fontSize = with(androidx.compose.ui.platform.LocalDensity.current) { size.toSp() })
    }
}

/**
 * Converts a Unicode emoji string to its Twemoji CDN codepoint format.
 *
 * Examples:
 *  - "🐻" → "1f43b"
 *  - "🦁" → "1f981"
 *  - "🐿️" → "1f43f-fe0f" (squirrel with variation selector)
 */
private fun emojiToCodepoint(emoji: String): String? {
    if (emoji.isEmpty()) return null
    
    val codepoints = mutableListOf<String>()
    var i = 0
    while (i < emoji.length) {
        val cp = Character.codePointAt(emoji, i)
        // Skip zero-width joiners (U+200D) — Twemoji uses dashes instead
        if (cp != 0x200D) {
            codepoints.add(Integer.toHexString(cp))
        }
        i += Character.charCount(cp)
    }
    
    return if (codepoints.isNotEmpty()) codepoints.joinToString("-") else null
}
