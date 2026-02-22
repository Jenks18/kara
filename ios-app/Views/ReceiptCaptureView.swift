import SwiftUI
import PhotosUI
import VisionKit

struct ReceiptCaptureView: View {
    @Environment(\.dismiss) var dismiss
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var capturedImages: [UIImage] = []
    @State private var showPhotosPicker = false
    @State private var showConfirmExpenses = false
    @State private var showDocumentScanner = false
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            // Main selection screen
            VStack(spacing: 0) {
                // Top bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                    
                    Spacer()
                    
                    if !capturedImages.isEmpty {
                        Text("\(capturedImages.count) photo\(capturedImages.count == 1 ? "" : "s")")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.5))
                            .cornerRadius(20)
                    }
                }
                .padding()
                
                Spacer()
                
                // Center content
                VStack(spacing: 24) {
                    Image(systemName: "doc.viewfinder")
                        .font(.system(size: 64))
                        .foregroundColor(.white)
                    
                    Text("How would you like to add your receipt?")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    Text("Auto-detects receipt edges and corrects perspective")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    VStack(spacing: 16) {
                        // Primary: Document Scanner
                        Button(action: { showDocumentScanner = true }) {
                            HStack {
                                Image(systemName: "doc.viewfinder")
                                    .font(.system(size: 20))
                                Text("Scan Receipt")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(AppTheme.Colors.primary)
                            .cornerRadius(16)
                        }
                        
                        // Secondary: Gallery
                        Button(action: { showPhotosPicker = true }) {
                            HStack {
                                Image(systemName: "photo.on.rectangle")
                                    .font(.system(size: 20))
                                Text("Choose from Gallery")
                                    .font(.system(size: 17, weight: .medium))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.white.opacity(0.4), lineWidth: 1.5)
                            )
                        }
                        
                        Text("Gallery: up to 10 images")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.5))
                    }
                    .padding(.horizontal, 24)
                    
                    // Done button (when images already captured)
                    if !capturedImages.isEmpty {
                        Button(action: { showConfirmExpenses = true }) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20))
                                Text("Review \(capturedImages.count) Receipt\(capturedImages.count == 1 ? "" : "s")")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                            .foregroundColor(AppTheme.Colors.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.white)
                            .cornerRadius(16)
                        }
                        .padding(.horizontal, 24)
                    }
                }
                
                Spacer()
            }
        }
        .photosPicker(isPresented: $showPhotosPicker, selection: $selectedPhotos, maxSelectionCount: 10, matching: .images)
        .onChange(of: selectedPhotos) { _, newValue in
            Task {
                await loadPhotos(newValue)
            }
        }
        .sheet(isPresented: $showDocumentScanner) {
            DocumentScannerView { scannedImages in
                capturedImages.append(contentsOf: scannedImages)
                if !capturedImages.isEmpty {
                    showConfirmExpenses = true
                }
            }
        }
        .fullScreenCover(isPresented: $showConfirmExpenses) {
            ConfirmExpensesView(images: capturedImages)
        }
    }
    
    private func loadPhotos(_ items: [PhotosPickerItem]) async {
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                await MainActor.run {
                    capturedImages.append(image)
                }
            }
        }
        
        // Auto-advance to confirm if we have images from gallery
        if !capturedImages.isEmpty {
            await MainActor.run {
                showConfirmExpenses = true
            }
        }
    }
}

// MARK: - Document Scanner (VisionKit)
// Uses Apple's built-in VNDocumentCameraViewController which:
// - Auto-detects document edges
// - Perspective-corrects the image
// - Supports multi-page scanning
// - Matches Android's ML Kit Document Scanner behaviour

struct DocumentScannerView: UIViewControllerRepresentable {
    let onScanCompleted: ([UIImage]) -> Void
    @Environment(\.dismiss) var dismiss
    
    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = context.coordinator
        return scanner
    }
    
    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onScanCompleted: onScanCompleted, dismiss: dismiss)
    }
    
    class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onScanCompleted: ([UIImage]) -> Void
        let dismiss: DismissAction
        
        init(onScanCompleted: @escaping ([UIImage]) -> Void, dismiss: DismissAction) {
            self.onScanCompleted = onScanCompleted
            self.dismiss = dismiss
        }
        
        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            var images: [UIImage] = []
            for i in 0..<scan.pageCount {
                images.append(scan.imageOfPage(at: i))
            }
            onScanCompleted(images)
            controller.dismiss(animated: true)
        }
        
        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            controller.dismiss(animated: true)
        }
        
        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            print("Document scanner failed: \(error.localizedDescription)")
            controller.dismiss(animated: true)
        }
    }
}

#Preview {
    ReceiptCaptureView()
}
