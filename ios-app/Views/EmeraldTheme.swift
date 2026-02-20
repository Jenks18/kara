import SwiftUI

// ============================================================
// Legacy file – kept only for EmeraldSegmentedControl
// All colors & theme now live in AppTheme.swift
// ============================================================

// A themed segmented control matching the blue theme
struct EmeraldSegmentedControl: View {
    @Binding var selection: Int
    let titles: [String]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(titles.indices, id: \.self) { index in
                Button(action: { withAnimation(.easeInOut(duration: 0.2)) { selection = index } }) {
                    Text(titles[index])
                        .font(AppTheme.Typography.labelLarge)
                        .foregroundColor(selection == index ? .white : AppTheme.Colors.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            Group {
                                if selection == index {
                                    AppTheme.Gradients.primary
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                } else {
                                    AppTheme.Colors.primary.opacity(0.08)
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                            }
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(AppTheme.Colors.primary.opacity(0.25), lineWidth: 1)
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
                        .stroke(AppTheme.Colors.border.opacity(0.6), lineWidth: 1)
                )
        )
    }
}
