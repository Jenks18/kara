import SwiftUI

// ============================================================
// Kacha Centralized Theme System
// Matches Android Color.kt + AppColors.kt + Type.kt exactly
// ============================================================

struct AppTheme {
    
    // MARK: - Brand Colors (matches Android Color.kt)
    
    struct Colors {
        // Primary Blue Scale
        static let blue50  = Color(hex: "#EFF6FF")
        static let blue100 = Color(hex: "#DBEAFE")
        static let blue200 = Color(hex: "#BFDBFE")
        static let blue300 = Color(hex: "#93C5FD")
        static let blue400 = Color(hex: "#3B82F6")
        static let blue500 = Color(hex: "#0066FF") // Primary brand
        static let blue600 = Color(hex: "#0052CC")
        static let blue700 = Color(hex: "#003D99")
        static let blue800 = Color(hex: "#002966")
        static let blue900 = Color(hex: "#001433")
        
        // Gray Scale
        static let gray50  = Color(hex: "#F9FAFB")
        static let gray100 = Color(hex: "#F3F4F6")
        static let gray200 = Color(hex: "#E5E7EB")
        static let gray300 = Color(hex: "#D1D5DB")
        static let gray400 = Color(hex: "#9CA3AF")
        static let gray500 = Color(hex: "#6B7280")
        static let gray600 = Color(hex: "#4B5563")
        static let gray700 = Color(hex: "#374151")
        static let gray800 = Color(hex: "#1F2937")
        static let gray900 = Color(hex: "#111827")
        
        // Status Colors
        static let red500    = Color(hex: "#EF4444")
        static let yellow500 = Color(hex: "#F59E0B")
        static let green500  = Color(hex: "#10B981")
        static let orange500 = Color.orange
        
        // Semantic roles
        static let primary     = blue500
        static let primaryDark = blue600
        static let onPrimary   = Color.white
        static let background  = blue50
        static let surface     = Color.white
        static let onSurface   = gray900
        static let textPrimary = gray900
        static let textSecondary = gray500
        static let textTertiary  = gray400
        static let border      = blue200
        static let divider     = gray200
        
        // Card & container
        static let cardBackground    = Color.white
        static let cardShadow        = Color.black.opacity(0.05)
        static let cardBorder        = gray200
        
        // Icon backgrounds (pill badges at 0.12 alpha)
        static let blueBadgeBg   = blue500.opacity(0.12)
        static let greenBadgeBg  = green500.opacity(0.12)
        static let redBadgeBg    = red500.opacity(0.12)
        static let yellowBadgeBg = yellow500.opacity(0.12)
    }
    
    // MARK: - Gradients (matches Android AppColors.kt)
    
    struct Gradients {
        /// Page background gradient — Blue50 → #E8F0FE → Blue100
        static let background = LinearGradient(
            colors: [
                Colors.blue50,
                Color(hex: "#E8F0FE"),
                Colors.blue100
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        
        /// Primary button / accent gradient — Blue400 → Blue500
        static let primary = LinearGradient(
            colors: [Colors.blue400, Colors.blue500],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        
        /// Header card gradient — Blue500 → Blue600
        static let header = LinearGradient(
            colors: [Colors.blue500, Colors.blue600],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    // MARK: - Typography (matches Android Type.kt)
    
    struct Typography {
        static let displayLarge  = Font.system(size: 32, weight: .bold)
        static let displayMedium = Font.system(size: 28, weight: .bold)
        static let titleLarge    = Font.system(size: 20, weight: .semibold)
        static let titleMedium   = Font.system(size: 17, weight: .semibold)
        static let titleSmall    = Font.system(size: 15, weight: .semibold)
        static let bodyLarge     = Font.system(size: 17, weight: .regular)
        static let bodyMedium    = Font.system(size: 15, weight: .regular)
        static let bodySmall     = Font.system(size: 13, weight: .regular)
        static let labelLarge    = Font.system(size: 15, weight: .semibold)
        static let labelMedium   = Font.system(size: 13, weight: .medium)
        static let labelSmall    = Font.system(size: 11, weight: .medium)
    }
    
    // MARK: - Dimensions
    
    struct Dimensions {
        static let cornerRadius: CGFloat     = 16
        static let cornerRadiusSmall: CGFloat = 12
        static let cornerRadiusPill: CGFloat  = 20
        static let buttonHeight: CGFloat      = 56
        static let iconSize: CGFloat          = 56
        static let cardPadding: CGFloat       = 16
        static let pagePadding: CGFloat       = 16
        static let tabBarHeight: CGFloat      = 64
        static let fabSize: CGFloat           = 56
    }
    
    // MARK: - Background View Builder
    
    @ViewBuilder
    static func backgroundView() -> some View {
        Gradients.background
            .ignoresSafeArea()
    }
}

// MARK: - Color hex initializer

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: // RGB
            (a, r, g, b) = (255, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB
            (a, r, g, b) = (int >> 24 & 0xFF, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Convenience View Modifiers

extension View {
    /// Standard card styling — white bg, rounded corners, subtle shadow
    func cardStyle() -> some View {
        self
            .background(AppTheme.Colors.cardBackground)
            .cornerRadius(AppTheme.Dimensions.cornerRadius)
            .shadow(color: AppTheme.Colors.cardShadow, radius: 2, y: 1)
    }
    
    /// Primary button style — full width, blue gradient, white text
    func primaryButtonStyle() -> some View {
        self
            .font(AppTheme.Typography.titleMedium)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: AppTheme.Dimensions.buttonHeight)
            .background(AppTheme.Gradients.primary)
            .cornerRadius(AppTheme.Dimensions.cornerRadius)
            .shadow(color: AppTheme.Colors.primary.opacity(0.3), radius: 8, y: 4)
    }
    
    /// Outlined / secondary button style
    func outlinedButtonStyle() -> some View {
        self
            .font(AppTheme.Typography.titleMedium)
            .foregroundColor(AppTheme.Colors.primary)
            .frame(maxWidth: .infinity)
            .frame(height: AppTheme.Dimensions.buttonHeight)
            .background(Color.white)
            .cornerRadius(AppTheme.Dimensions.cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.Dimensions.cornerRadius)
                    .stroke(AppTheme.Colors.primary, lineWidth: 1.5)
            )
    }
    
    /// Standard page background
    func pageBackground() -> some View {
        self.background(AppTheme.backgroundView())
    }
}

// MARK: - Legacy alias (EmeraldTheme → AppTheme)
// Keep this so any remaining references still compile

typealias EmeraldTheme = LegacyEmeraldTheme

struct LegacyEmeraldTheme {
    static let primary = AppTheme.Colors.primary
    static let primaryDark = AppTheme.Colors.primaryDark
    static let lightBackground = AppTheme.Colors.blue50
    static let lightBackgroundAlt = AppTheme.Colors.blue100
    static let border = AppTheme.Colors.border
    
    @ViewBuilder
    static func background() -> some View {
        AppTheme.backgroundView()
    }
}
