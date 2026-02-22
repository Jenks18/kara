import SwiftUI
import CoreLocation
import VisionKit
import Combine

struct ConfirmExpensesView: View {
    @Environment(\.dismiss) var dismiss
    @State var images: [UIImage]
    
    @State private var currentImageIndex = 0
    @State private var selectedWorkspace: String = ""
    @State private var description: String = ""
    @State private var selectedCategory: String = "fuel"
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var locationPermissionGranted = false
    @State private var showDocumentScanner = false
    // Workspaces come from WorkspaceManager (already cached — no extra API call)
    @State private var workspaces: [Workspace] = WorkspaceManager.shared.workspaces
    @State private var uploadErrorMessage: String?
    @State private var showUploadError = false
    @State private var detectedQRUrl: String? = nil
    @State private var scanningQR = false
    @StateObject private var locationManager = LocationManager()
    
    let categories = ["fuel", "food", "transport", "accommodation", "office supplies", "communication", "maintenance", "shopping", "entertainment", "utilities", "health", "other"]
    
    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.backgroundView()
                
                VStack(spacing: 0) {
                    // Header with navigation
                    HStack {
                        Button(action: { dismiss() }) {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 17, weight: .semibold))
                                Text("Back")
                            }
                            .foregroundColor(AppTheme.Colors.primary)
                        }
                        
                        Spacer()
                        
                        Text("Confirm Expenses")
                            .font(.system(size: 17, weight: .semibold))
                        
                        Spacer()
                        
                        // X button — dismisses back to capture screen
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.gray)
                                .frame(width: 32, height: 32)
                                .background(Color.gray.opacity(0.15))
                                .clipShape(Circle())
                        }
                    }
                    .padding()
                    .background(AppTheme.Colors.cardSurface)
                    
                    ScrollView {
                        VStack(spacing: 20) {
                            // Image counter + navigation
                            if images.count > 1 {
                                HStack {
                                    Button(action: goToPrevImage) {
                                        Image(systemName: "chevron.left")
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundColor(.white)
                                            .frame(width: 32, height: 32)
                                            .background(currentImageIndex == 0 ? Color.gray.opacity(0.3) : AppTheme.Colors.primary)
                                            .cornerRadius(16)
                                    }
                                    .disabled(currentImageIndex == 0)
                                    .opacity(currentImageIndex == 0 ? 0.5 : 1.0)
                                    
                                    Spacer()
                                    
                                    Text("\(currentImageIndex + 1) of \(images.count)")
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                    
                                    Spacer()
                                    
                                    Button(action: goToNextImage) {
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundColor(.white)
                                            .frame(width: 32, height: 32)
                                            .background(currentImageIndex == images.count - 1 ? Color.gray.opacity(0.3) : AppTheme.Colors.primary)
                                            .cornerRadius(16)
                                    }
                                    .disabled(currentImageIndex == images.count - 1)
                                    .opacity(currentImageIndex == images.count - 1 ? 0.5 : 1.0)
                                }
                                .padding(.horizontal)
                            }
                            
                            // Receipt image — properly separated from controls
                            if currentImageIndex < images.count {
                                ZStack(alignment: .topTrailing) {
                                    Image(uiImage: images[currentImageIndex])
                                        .resizable()
                                        .scaledToFit()
                                        .frame(maxWidth: .infinity)
                                        .frame(maxHeight: 350)
                                        .background(Color.black)
                                        .cornerRadius(12)
                                    
                                    // QR badge overlay (small, top-right of image only)
                                    if detectedQRUrl != nil {
                                        HStack(spacing: 4) {
                                            Image(systemName: "qrcode")
                                                .font(.system(size: 12))
                                            Text("eTIMS QR")
                                                .font(.system(size: 12, weight: .medium))
                                        }
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(AppTheme.Colors.primary.opacity(0.9))
                                        .cornerRadius(12)
                                        .padding(8)
                                    } else if scanningQR {
                                        HStack(spacing: 4) {
                                            ProgressView()
                                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                                .scaleEffect(0.7)
                                            Text("Scanning...")
                                                .font(.system(size: 12, weight: .medium))
                                        }
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color.gray.opacity(0.8))
                                        .cornerRadius(12)
                                        .padding(8)
                                    }
                                }
                                .padding(.horizontal)
                            }
                            
                            // Add more images button (uses Document Scanner)
                            HStack(spacing: 12) {
                                Button(action: { showDocumentScanner = true }) {
                                    HStack {
                                        Image(systemName: "doc.viewfinder")
                                            .font(.system(size: 15))
                                        Text("Add More")
                                            .font(.system(size: 15, weight: .medium))
                                    }
                                    .foregroundColor(AppTheme.Colors.primary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(AppTheme.Colors.primary, lineWidth: 1.5)
                                    )
                                }
                            }
                            .padding(.horizontal)
                            
                            // Workspace picker — below image, not overlapping
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Workspace")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                
                                Menu {
                                    if workspaces.isEmpty {
                                        Text("No workspaces — create one first")
                                    } else {
                                        ForEach(workspaces) { workspace in
                                            Button(workspace.name) {
                                                selectedWorkspace = workspace.id
                                            }
                                        }
                                    }
                                } label: {
                                    HStack {
                                        Text(selectedWorkspace.isEmpty ? "Select workspace" : (workspaces.first(where: { $0.id == selectedWorkspace })?.name ?? "Select workspace"))
                                            .foregroundColor(selectedWorkspace.isEmpty ? .secondary : .primary)
                                        Spacer()
                                        Image(systemName: "chevron.down")
                                            .font(.system(size: 14))
                                            .foregroundColor(AppTheme.Colors.textSecondary)
                                    }
                                    .padding()
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(10)
                                }
                            }
                            .padding(.horizontal)
                            
                            // Category picker (matches Android)
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Category")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                
                                Menu {
                                    ForEach(categories, id: \.self) { category in
                                        Button(category.capitalized) {
                                            selectedCategory = category
                                        }
                                    }
                                } label: {
                                    HStack {
                                        Text(selectedCategory.capitalized)
                                        Spacer()
                                        Image(systemName: "chevron.down")
                                            .font(.system(size: 14))
                                            .foregroundColor(AppTheme.Colors.textSecondary)
                                    }
                                    .padding()
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(10)
                                }
                            }
                            .padding(.horizontal)
                            
                            // Description / Notes
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Notes")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                
                                TextField("Add description or notes", text: $description)
                                    .padding()
                                    .background(AppTheme.Colors.cardSurface)
                                    .cornerRadius(10)
                            }
                            .padding(.horizontal)
                            
                            // Location info
                            if locationPermissionGranted, let location = locationManager.location {
                                HStack(spacing: 8) {
                                    Image(systemName: "location.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(AppTheme.Colors.primary)
                                    
                                    Text("Location: \(String(format: "%.4f, %.4f", location.coordinate.latitude, location.coordinate.longitude))")
                                        .font(.system(size: 13))
                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                    
                                    Spacer()
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 8)
                            }
                        }
                        .padding(.top)
                        .padding(.bottom, 100) // Space for fixed submit button
                    }
                    
                    // Fixed submit button at bottom
                    VStack {
                        Button(action: submitExpenses) {
                            HStack {
                                if isSubmitting {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Submit \(images.count) Receipt\(images.count == 1 ? "" : "s")")
                                        .font(.system(size: 17, weight: .semibold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                selectedWorkspace.isEmpty || isSubmitting ?
                                    Color.gray :
                                    AppTheme.Colors.primary
                            )
                            .cornerRadius(12)
                        }
                        .disabled(selectedWorkspace.isEmpty || isSubmitting)
                        .padding(.horizontal)
                        .padding(.bottom, 8)
                    }
                    .padding(.top, 8)
                    .background(AppTheme.Colors.cardSurface.opacity(0.95))
                }
            }
            .onAppear {
                scanForQRCodes()
                checkLocationPermission()
                workspaces = WorkspaceManager.shared.workspaces
                if selectedWorkspace.isEmpty {
                    selectedWorkspace = WorkspaceManager.shared.activeWorkspace?.id
                        ?? WorkspaceManager.shared.workspaces.first?.id
                        ?? ""
                }
            }
            .sheet(isPresented: $showDocumentScanner) {
                DocumentScannerView { scannedImages in
                    images.append(contentsOf: scannedImages)
                }
            }
            .alert("Success", isPresented: $showSuccess) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Receipts submitted successfully!")
            }
            .alert("Upload Failed", isPresented: $showUploadError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(uploadErrorMessage ?? "An error occurred while uploading receipts.")
            }
        }
    }
    
    private func goToPrevImage() {
        if currentImageIndex > 0 {
            withAnimation(.easeInOut(duration: 0.2)) {
                currentImageIndex -= 1
            }
        }
    }
    
    private func goToNextImage() {
        if currentImageIndex < images.count - 1 {
            withAnimation(.easeInOut(duration: 0.2)) {
                currentImageIndex += 1
            }
        }
    }
    
    private func checkLocationPermission() {
        locationManager.checkPermission { granted in
            locationPermissionGranted = granted
        }
    }
    
    private func submitExpenses() {
        isSubmitting = true
        
        Task {
            do {
                let imageDataArray = images.compactMap { $0.jpegData(compressionQuality: 0.8) }
                
                let lat = locationManager.location?.coordinate.latitude
                let lon = locationManager.location?.coordinate.longitude
                
                let wsName = workspaces.first(where: { $0.id == selectedWorkspace })?.name ?? "Personal"
                
                let response = try await API.shared.uploadReceipts(
                    images: imageDataArray,
                    workspaceId: selectedWorkspace,
                    workspaceName: wsName,
                    description: description.isEmpty ? nil : description,
                    category: selectedCategory,
                    latitude: lat,
                    longitude: lon,
                    qrUrl: detectedQRUrl
                )
                
                await MainActor.run {
                    isSubmitting = false
                    if response.success {
                        showSuccess = true
                    }
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    uploadErrorMessage = error.localizedDescription
                    showUploadError = true
                }
            }
        }
    }
    
    /// Scan all images for eTIMS QR codes (post-capture like Android)
    func scanForQRCodes() {
        scanningQR = true
        Task {
            do {
                if let qrUrl = try await QRScannerService.shared.scanImagesForQR(images: images) {
                    await MainActor.run {
                        detectedQRUrl = qrUrl
                        scanningQR = false
                        print("✅ eTIMS QR detected: \(qrUrl)")
                    }
                } else {
                    await MainActor.run {
                        scanningQR = false
                        print("ℹ️ No eTIMS QR found")
                    }
                }
            } catch {
                await MainActor.run {
                    scanningQR = false
                    print("⚠️ QR scan failed: \(error)")
                }
            }
        }
    }
}

// Location manager
class LocationManager: NSObject, ObservableObject {
    @Published var location: CLLocation?
    private let manager = CLLocationManager()
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }
    
    func checkPermission(completion: @escaping (Bool) -> Void) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
            completion(true)
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
            completion(false)
        default:
            completion(false)
        }
    }
}

extension LocationManager: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.first
        manager.stopUpdatingLocation()
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }
}

#Preview {
    ConfirmExpensesView(images: [UIImage(systemName: "photo")!])
}
