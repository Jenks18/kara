package com.mafutapass.app.utils

import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Cloudflare Turnstile CAPTCHA Helper
 * 
 * Site Key: Get from https://dash.cloudflare.com/
 * For testing, you can use Clerk's test keys or get your own
 */
object TurnstileHelper {
    
    // Production Cloudflare Turnstile site key (invisible mode)
    private const val TURNSTILE_SITE_KEY = "0x4AAAAAACbS8XWWo0qzeEJk"
    
    /**
     * Get CAPTCHA token using WebView
     */
    suspend fun getCaptchaToken(): Result<String> = suspendCancellableCoroutine { continuation ->
        try {
            // For now, return a placeholder
            // In production, this would load Turnstile widget
            continuation.resume(Result.success("dummy-captcha-token"))
        } catch (e: Exception) {
            continuation.resume(Result.failure(e))
        }
    }
}

/**
 * Turnstile CAPTCHA Composable Widget
 * Invisible - automatically solves in background
 */
@Composable
fun TurnstileWidget(
    onTokenReceived: (String) -> Unit,
    onError: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    // Load CAPTCHA widget from actual domain (not inline HTML)
    // This ensures Cloudflare sees it as legitimate request from mafutapass.com
    val widgetUrl = "https://mafutapass.com/turnstile-widget.html"
    
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                
                // Cloudflare docs: Enable cookies for Turnstile
                CookieManager.getInstance().setAcceptCookie(true)
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                
                // Cloudflare docs: Maintain consistent User Agent
                settings.userAgentString = settings.userAgentString
                
                // Recommended settings from Cloudflare docs
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                settings.allowFileAccess = true
                settings.allowContentAccess = true
                
                webViewClient = WebViewClient()
                
                addJavascriptInterface(object {
                    @JavascriptInterface
                    fun onCaptchaSuccess(token: String) {
                        onTokenReceived(token)
                    }
                    
                    @JavascriptInterface
                    fun onCaptchaError(error: String) {
                        onError(error)
                    }
                }, "Android")
                
                // Load from actual domain URL (not loadData)
                loadUrl(widgetUrl)
            }
        }
    )
}
