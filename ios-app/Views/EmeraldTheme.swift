import SwiftUI

// Centralized theme for MafutaPass (Blue)
struct EmeraldTheme {
    // Core brand colors - Updated to blue
    static let primary = Color(red: 0.0, green: 0.4, blue: 1.0) // blue-500 #0066FF
    static let primaryDark = Color(red: 0.0, green: 0.322, blue: 0.8) // blue-600 #0052CC
    static let lightBackground = Color(red: 0.937, green: 0.965, blue: 1.0) // blue-50 #eff6ff
    static let lightBackgroundAlt = Color(red: 0.859, green: 0.918, blue: 0.996) // blue-100 #dbeafe
    static let border = Color(red: 0.749, green: 0.859, blue: 0.996) // blue-200 #bfdbfe

    // Gradient background used across pages
    @ViewBuilder
    static func background() -> some View {
        LinearGradient(
            colors: [
                EmeraldTheme.lightBackground,
                Color(red: 0.898, green: 0.941, blue: 0.996),
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
