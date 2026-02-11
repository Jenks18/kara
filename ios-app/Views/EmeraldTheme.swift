import SwiftUI

// Centralized theme for MafutaPass (Emerald)
struct EmeraldTheme {
    // Core brand colors
    static let primary = Color(red: 0.063, green: 0.725, blue: 0.506) // emerald-500
    static let primaryDark = Color(red: 0.022, green: 0.588, blue: 0.412) // emerald-600
    static let lightBackground = Color(red: 0.925, green: 0.992, blue: 0.961) // emerald-50
    static let lightBackgroundAlt = Color(red: 0.820, green: 0.980, blue: 0.898) // emerald-100/green-50 via
    static let border = Color(red: 0.654, green: 0.906, blue: 0.816) // emerald-200

    // Gradient background used across pages
    @ViewBuilder
    static func background() -> some View {
        LinearGradient(
            colors: [
                EmeraldTheme.lightBackground,
                Color(red: 0.937, green: 0.992, blue: 0.937),
                EmeraldTheme.lightBackgroundAlt
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

// A themed segmented control matching the Emerald theme
struct EmeraldSegmentedControl: View {
    @Binding var selection: Int
    let titles: [String]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(titles.indices, id: \.self) { index in
                Button(action: { withAnimation(.easeInOut(duration: 0.2)) { selection = index } }) {
                    Text(titles[index])
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(selection == index ? .white : EmeraldTheme.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            Group {
                                if selection == index {
                                    LinearGradient(
                                        colors: [EmeraldTheme.primary, EmeraldTheme.primaryDark],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                } else {
                                    EmeraldTheme.primary.opacity(0.08)
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                            }
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(EmeraldTheme.primary.opacity(0.25), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(EmeraldTheme.border.opacity(0.6), lineWidth: 1)
                )
        )
    }
}
