import SwiftUI

// =============================================================
// AddReceiptPage — matches Android AddReceiptScreen design
// Two clean options: Scan Receipt (camera) + Choose from Gallery
// Presentation is handled by MainAppView for reliable iOS 26 context
// =============================================================

struct CreateExpensePage: View {
    let onScanTapped: () -> Void
    let onGalleryTapped: () -> Void
    
    var body: some View {
        ZStack {
            // Blue gradient background (matches Android)
            AppTheme.backgroundView()
            
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 4) {
                    Text("Add Receipt")
                        .font(AppTheme.Typography.displayMedium)
                        .foregroundColor(AppTheme.Colors.textPrimary)
                    
                    Text("Choose how to capture your receipt")
                        .font(AppTheme.Typography.bodyMedium)
                        .foregroundColor(AppTheme.Colors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
                .padding(.bottom, 32)
                
                // Illustration icon
                ZStack {
                    Circle()
                        .fill(AppTheme.Colors.blueBadgeBg)
                        .frame(width: 120, height: 120)
                    
                    Image(systemName: "doc.viewfinder.fill")
                        .font(.system(size: 56))
                        .foregroundColor(AppTheme.Colors.primary)
                }
                .padding(.bottom, 40)
                
                // Action buttons
                VStack(spacing: 16) {
                    // Primary: Scan Receipt (Camera)
                    Button(action: onScanTapped) {
                        HStack(spacing: 12) {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 22))
                            Text("Scan Receipt")
                        }
                        .primaryButtonStyle()
                    }
                    
                    // Secondary: Choose from Gallery
                    Button(action: onGalleryTapped) {
                        HStack(spacing: 12) {
                            Image(systemName: "photo.on.rectangle.angled")
                                .font(.system(size: 22))
                            Text("Choose from Gallery")
                        }
                        .outlinedButtonStyle()
                    }
                }
                .padding(.horizontal, AppTheme.Dimensions.pagePadding)
                
                Spacer()
                
                // Tip text at bottom
                HStack(spacing: 8) {
                    Image(systemName: "lightbulb.fill")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.Colors.yellow500)
                    Text("Tip: Use good lighting for best results")
                        .font(AppTheme.Typography.bodySmall)
                        .foregroundColor(AppTheme.Colors.textSecondary)
                }
                .padding(.bottom, 100)
            }
        }
    }
}
