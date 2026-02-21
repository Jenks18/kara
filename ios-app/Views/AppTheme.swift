import SwiftUI

// ============================================================
//  Kacha Centralized Theme System
//
//  Architecture: matches Android Color.kt + AppColors.kt exactly.
//  All semantic roles use UIColor(dynamicProvider:) so they adapt
//  to light / dark / system preference automatically.
// ============================================================

// MARK: - UIColor helpers

extension UIColor {
    convenience init(hex: String, alpha: CGFloat = 1) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = CGFloat((int >> 16) & 0xFF) / 255
        let g = CGFloat((int >> 8)  & 0xFF) / 255
        let b = CGFloat( int        & 0xFF) / 255
        self.init(red: r, green: g, blue: b, alpha: alpha)
    }
}

extension Color {
    /// Adaptive color — light value in light mode, dark value in dark mode.
    /// Mirrors Compose\'s Color(light = ..., dark = ...) pattern.
    static func adaptive(light: String, dark: String) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: dark)
                : UIColor(hex: light)
        })
    }

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: (a, r, g, b) = (255, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24 & 0xFF, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB,
                  red:     Double(r) / 255,
                  green:   Double(g) / 255,
                  blue:    Double(b) / 255,
                  opacity: Double(a) / 255)
    }
}

// MARK: - AppTheme

struct AppTheme {

    // Raw Palette — not adaptive, use for overlays/opacity/brand moments only
    struct Palette {
        static let blue50  = Color(hex: "#EFF6FF")
        static let blue100 = Color(hex: "#DBEAFE")
        static let blue200 = Color(hex: "#BFDBFE")
        static let blue300 = Color(hex: "#93C5FD")
        static let blue400 = Color(hex: "#60A5FA")
        static let blue500 = Color(hex: "#0066FF")
        static let blue600 = Color(hex: "#0052CC")
        static let blue700 = Color(hex: "#0041A8")
        static let blue800 = Color(hex: "#002966")
        static let blue900 = Color(hex: "#001433")
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
        static let red500    = Color(hex: "#EF4444")
        static let yellow500 = Color(hex: "#F59E0B")
        static let green500  = Color(hex: "#10B981")
    }

    // Adaptive Colors — Light <-> LightAppColors, Dark <-> DarkAppColors
    struct Colors {
        // Primary brand — Blue500 light, Blue400 dark (more legible on dark surfaces)
        static let primary     = Color.adaptive(light: "#0066FF", dark: "#60A5FA")
        static let primaryDark = Color.adaptive(light: "#0052CC", dark: "#3B82F6")
        static let onPrimary   = Color.white

        // Text
        static let textPrimary   = Color.adaptive(light: "#111827", dark: "#F1F5F9")
        static let textSecondary = Color.adaptive(light: "#6B7280", dark: "#9CA3AF")
        static let textTertiary  = Color.adaptive(light: "#9CA3AF", dark: "#6B7280")

        // Surfaces — white light, #1E1E1E dark (matches Android DarkAppColors.cardSurface)
        static let cardSurface         = Color.adaptive(light: "#FFFFFF", dark: "#1E1E1E")
        static let cardSurfaceElevated = Color.adaptive(light: "#FFFFFF", dark: "#252525")
        static let surface             = cardSurface
        static let cardBackground      = cardSurface
        static let onSurface           = textPrimary

        // Page background (non-gradient fallback)
        static let backgroundBase = Color.adaptive(light: "#EFF6FF", dark: "#0A1020")
        static let background     = backgroundBase

        // Borders / dividers
        static let divider    = Color.adaptive(light: "#E5E7EB", dark: "#2D2D2D")
        static let cardBorder = divider
        static let border     = Color.adaptive(light: "#BFDBFE", dark: "#1E3A5F")

        // Status
        static let statusApproved = Color.adaptive(light: "#0066FF", dark: "#60A5FA")
        static let statusPending  = Color.adaptive(light: "#D97706", dark: "#FBBF24")
        static let statusRejected = Color.adaptive(light: "#DC2626", dark: "#F87171")
        static let statusDraft    = Color.adaptive(light: "#6B7280", dark: "#9CA3AF")

        // Shimmer
        static let shimmerBase      = Color.adaptive(light: "#E5E7EB", dark: "#1E1E1E")
        static let shimmerHighlight = Color.adaptive(light: "#F3F4F6", dark: "#2D2D2D")

        // Non-adaptive (safe on coloured surfaces)
        static let green500   = Palette.green500
        static let red500     = Palette.red500
        static let yellow500  = Palette.yellow500
        static let orange500  = Color.orange
        static let cardShadow = Color.black.opacity(0.05)

        // Badge backgrounds
        static let blueBadgeBg   = primary.opacity(0.12)
        static let greenBadgeBg  = green500.opacity(0.12)
        static let redBadgeBg    = red500.opacity(0.12)
        static let yellowBadgeBg = yellow500.opacity(0.12)

        // Raw palette pass-through
        static let blue50  = Palette.blue50
        static let blue100 = Palette.blue100
        static let blue200 = Palette.blue200
        static let blue300 = Palette.blue300
        static let blue400 = Palette.blue400
        static let blue500 = Palette.blue500
        static let blue600 = Palette.blue600
        static let blue700 = Palette.blue700
        static let gray50  = Palette.gray50
        static let gray100 = Palette.gray100
        static let gray200 = Palette.gray200
        static let gray300 = Palette.gray300
        static let gray400 = Palette.gray400
        static let gray500 = Palette.gray500
        static let gray600 = Palette.gray600
        static let gray700 = Palette.gray700
        static let gray800 = Palette.gray800
        static let gray900 = Palette.gray900
    }

    // Gradients — background is adaptive via BackgroundView
    struct Gradients {
        static let primary = LinearGradient(
            colors: [Palette.blue400, Palette.blue500],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
        static let header = LinearGradient(
            colors: [Palette.blue500, Palette.blue600],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
    }

    // BackgroundView — reads @Environment(\.colorScheme) for adaptive gradient
    // Light: blue50 -> #E8F0FE -> blue100   (matches LightAppColors.backgroundGradient)
    // Dark:  #0A1020 -> #0F1528 -> #0A1020  (matches DarkAppColors.backgroundGradient)
    struct BackgroundView: View {
        @Environment(\.colorScheme) private var scheme
        private var colors: [Color] {
            scheme == .dark
                ? [Color(hex: "#0A1020"), Color(hex: "#0F1528"), Color(hex: "#0A1020")]
                : [Color(hex: "#EFF6FF"), Color(hex: "#E8F0FE"), Color(hex: "#DBEAFE")]
        }
        var body: some View {
            LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()
        }
    }

    @ViewBuilder
    static func backgroundView() -> some View { BackgroundView() }

    // Typography (matches Android Type.kt)
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

    struct Dimensions {
        static let cornerRadius: CGFloat      = 16
        static let cornerRadiusSmall: CGFloat = 12
        static let cornerRadiusPill: CGFloat  = 20
        static let buttonHeight: CGFloat      = 56
        static let iconSize: CGFloat          = 56
        static let cardPadding: CGFloat       = 16
        static let pagePadding: CGFloat       = 16
        static let tabBarHeight: CGFloat      = 64
        static let fabSize: CGFloat           = 56
    }
}

// MARK: - View Modifiers

extension View {
    func cardStyle() -> some View {
        self
            .background(AppTheme.Colors.cardSurface)
            .cornerRadius(AppTheme.Dimensions.cornerRadius)
            .shadow(color: AppTheme.Colors.cardShadow, radius: 2, y: 1)
    }

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

    func outlinedButtonStyle() -> some View {
        self
            .font(AppTheme.Typography.titleMedium)
            .foregroundColor(AppTheme.Colors.primary)
            .frame(maxWidth: .infinity)
            .frame(height: AppTheme.Dimensions.buttonHeight)
            .background(AppTheme.Colors.cardSurface)
            .cornerRadius(AppTheme.Dimensions.cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.Dimensions.cornerRadius)
                    .stroke(AppTheme.Colors.primary, lineWidth: 1.5)
            )
    }

    func pageBackground() -> some View {
        self.background(AppTheme.backgroundView())
    }
}

// MARK: - Legacy alias
typealias EmeraldTheme = LegacyEmeraldTheme

struct LegacyEmeraldTheme {
    static let primary            = AppTheme.Colors.primary
    static let primaryDark        = AppTheme.Colors.primaryDark
    static let lightBackground    = AppTheme.Colors.blue50
    static let lightBackgroundAlt = AppTheme.Colors.blue100
    static let border             = AppTheme.Colors.border

    @ViewBuilder
    static func background() -> some View { AppTheme.backgroundView() }
}
