import Foundation

/// Centralized currency formatting — mirrors the Android CurrencyFormatter and web's lib/currency.ts.
///
/// Usage:
/// ```
/// CurrencyFormatter.shared.formatSimple(1234.50)         // "KES 1,234.50"
/// CurrencyFormatter.shared.formatSimple(1234.50, "USD")  // "USD 1,234.50"
/// CurrencyFormatter.shared.format(1234.50, "KES")        // "KSh1,234.50" (locale-aware)
/// ```
final class CurrencyFormatter {
    static let shared = CurrencyFormatter()
    
    /// Default currency code — updated by WorkspaceManager when the active workspace changes.
    /// Falls back to "KES" until a workspace is loaded from the API.
    var defaultCurrencyCode: String = "KES"
    
    private let localeMap: [String: Locale] = [
        "KES": Locale(identifier: "en_KE"),
        "USD": Locale(identifier: "en_US"),
        "EUR": Locale(identifier: "de_DE"),
        "GBP": Locale(identifier: "en_GB"),
        "JPY": Locale(identifier: "ja_JP"),
        "AUD": Locale(identifier: "en_AU"),
        "CAD": Locale(identifier: "en_CA"),
        "CHF": Locale(identifier: "de_CH"),
        "CNY": Locale(identifier: "zh_CN"),
        "INR": Locale(identifier: "en_IN"),
        "ZAR": Locale(identifier: "en_ZA"),
        "NGN": Locale(identifier: "en_NG"),
        "TZS": Locale(identifier: "en_TZ"),
        "UGX": Locale(identifier: "en_UG"),
    ]
    
    private var formatters: [String: NumberFormatter] = [:]
    
    /// Locale-aware format: "KSh1,234.50" or "$1,234.50" depending on locale.
    func format(_ amount: Double, _ currencyCode: String? = nil) -> String {
        let code = currencyCode ?? defaultCurrencyCode
        if formatters[code] == nil {
            let nf = NumberFormatter()
            nf.numberStyle = .currency
            nf.locale = localeMap[code] ?? Locale(identifier: "en_US")
            nf.currencyCode = code
            nf.minimumFractionDigits = 2
            nf.maximumFractionDigits = 2
            formatters[code] = nf
        }
        return formatters[code]!.string(from: NSNumber(value: amount)) ?? "\(code) \(amount)"
    }
    
    /// Simple format: "KES 1,234.50" — always uses the code prefix, consistent cross-platform.
    func formatSimple(_ amount: Double, _ currencyCode: String? = nil) -> String {
        let code = currencyCode ?? defaultCurrencyCode
        let nf = NumberFormatter()
        nf.numberStyle = .decimal
        nf.minimumFractionDigits = 2
        nf.maximumFractionDigits = 2
        nf.groupingSeparator = ","
        nf.decimalSeparator = "."
        let formatted = nf.string(from: NSNumber(value: amount)) ?? String(format: "%.2f", amount)
        return "\(code) \(formatted)"
    }
}
