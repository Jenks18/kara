import SwiftUI
import PhotosUI

// =============================================================
// AddReceiptPage — matches Android AddReceiptScreen design
// Two clean options: Scan Receipt (camera) + Choose from Gallery
// =============================================================

struct CreateExpensePage: View {
    @State private var showReceiptCapture = false
    @State private var showPhotosPicker = false
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var galleryImages: [UIImage] = []
    @State private var showConfirmExpenses = false
    
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
                    Button(action: { showReceiptCapture = true }) {
                        HStack(spacing: 12) {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 22))
                            Text("Scan Receipt")
                        }
                        .primaryButtonStyle()
                    }
                    
                    // Secondary: Choose from Gallery
                    Button(action: { showPhotosPicker = true }) {
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
        .fullScreenCover(isPresented: $showReceiptCapture) {
            ReceiptCaptureView()
        }
        .photosPicker(isPresented: $showPhotosPicker, selection: $selectedPhotos, maxSelectionCount: 10, matching: .images)
        .onChange(of: selectedPhotos) { _, newValue in
            Task {
                await loadGalleryPhotos(newValue)
            }
        }
        .fullScreenCover(isPresented: $showConfirmExpenses) {
            ConfirmExpensesView(images: galleryImages)
        }
    }
    
    private func loadGalleryPhotos(_ items: [PhotosPickerItem]) async {
        var loaded: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                loaded.append(image)
            }
        }
        await MainActor.run {
            galleryImages = loaded
            selectedPhotos = []
            if !galleryImages.isEmpty {
                showConfirmExpenses = true
            }
        }
    }
}
