/**
 * Currency formatting utility — production-grade approach using Intl.NumberFormat.
 *
 * This is the same approach used by Stripe, Square, Expensify, and every
 * serious fintech app. JavaScript's built-in Intl.NumberFormat handles:
 *  - Correct currency symbols ($ → USD, KSh → KES, € → EUR, etc.)
 *  - Proper decimal places (JPY has 0, USD has 2, etc.)
 *  - Locale-aware grouping (1,000 vs 1.000 vs 1 000)
 *
 * No external library needed — works in every browser and Node.js.
 */

// ── Supported currencies ────────────────────────────────────────────
export interface CurrencyInfo {
  code: string        // ISO 4217 code (USD, KES, EUR…)
  symbol: string      // Display symbol ($, KSh, €…)
  name: string        // Full name
  locale: string      // Primary locale for formatting
  decimals: number    // Decimal places (most are 2, JPY is 0)
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', decimals: 0 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', decimals: 2 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA', decimals: 2 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG', decimals: 2 },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', locale: 'en-GH', decimals: 2 },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'en-TZ', decimals: 2 },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG', decimals: 0 },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc', locale: 'en-RW', decimals: 0 },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', locale: 'en-ET', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', decimals: 2 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE', decimals: 2 },
]

// Quick lookup map
const currencyMap = new Map(CURRENCIES.map(c => [c.code, c]))

export function getCurrencyInfo(code: string): CurrencyInfo {
  return currencyMap.get(code) || {
    code,
    symbol: code,
    name: code,
    locale: 'en-US',
    decimals: 2,
  }
}

// ── Formatter cache (Intl.NumberFormat is expensive to create) ───────
const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(currencyCode: string, compact = false): Intl.NumberFormat {
  const key = `${currencyCode}-${compact ? 'compact' : 'full'}`
  let fmt = formatterCache.get(key)
  if (!fmt) {
    const info = getCurrencyInfo(currencyCode)
    fmt = new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: compact ? 0 : info.decimals,
      maximumFractionDigits: info.decimals,
      ...(compact ? { notation: 'compact', compactDisplay: 'short' } : {}),
    })
    formatterCache.set(key, fmt)
  }
  return fmt
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Format an amount in the given currency.
 *
 * @example
 * formatCurrency(1234.56, 'USD')  → "$1,234.56"
 * formatCurrency(1234.56, 'KES')  → "KSh 1,234.56"
 * formatCurrency(1234.56, 'JPY')  → "¥1,235"
 */
export function formatCurrency(amount: number, currencyCode: string = 'KES'): string {
  try {
    return getFormatter(currencyCode).format(amount)
  } catch {
    // Fallback for unknown/invalid currency codes
    const info = getCurrencyInfo(currencyCode)
    return `${info.symbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    })}`
  }
}

/**
 * Compact format for large numbers on dashboards.
 *
 * @example
 * formatCurrencyCompact(1_500_000, 'USD') → "$1.5M"
 * formatCurrencyCompact(45_000, 'KES')    → "KSh 45K"
 */
export function formatCurrencyCompact(amount: number, currencyCode: string = 'KES'): string {
  try {
    return getFormatter(currencyCode, true).format(amount)
  } catch {
    const info = getCurrencyInfo(currencyCode)
    if (amount >= 1_000_000) return `${info.symbol}${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 10_000) return `${info.symbol}${(amount / 1_000).toFixed(1)}K`
    return formatCurrency(amount, currencyCode)
  }
}

/**
 * Get just the symbol for a currency code.
 */
export function getCurrencySymbol(code: string): string {
  return getCurrencyInfo(code).symbol
}

/**
 * Default currency for the app (user's primary workspace currency).
 * This will be overridden per-workspace when displaying workspace-specific data.
 */
export const DEFAULT_CURRENCY = 'KES'
