import SwiftUI
import CoreLocation
import Combine

struct ConfirmExpensesView: View {
    @Environment(\.dismiss) var dismiss
    let images: [UIImage]
    
    @State private var currentImageIndex = 0
    @State private var selectedWorkspace: String = ""
    @State private var description: String = ""
    @State private var selectedCategory: String = "fuel"
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var locationPermissionGranted = false
    @State private var workspaces: [Workspace] = []
    @State private var isLoadingWorkspaces = false
    @State private var uploadErrorMessage: String?
    @State private var showUploadError = false
    @State private var detectedQRUrl: String? = nil // NEW: Detected eTIMS QR code
    @State private var scanningQR = false // NEW: QR scan progress
    @StateObject private var locationManager = LocationManager()
    
    let categories = ["fuel", "food", "transport", "shopping", "entertainment", "utilities", "health", "other"]
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color(uiColor: .systemGroupedBackground)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header
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
                        
                        // Placeholder for balance
                        Text("")
                            .frame(width: 60)
                    }
                    .padding()
                    .background(Color(uiColor: .systemBackground))
                    
                    ScrollView {
                        VStack(spacing: 20) {
                            // Image viewer with chevrons
                            ZStack {
                                // Receipt image
                                if currentImageIndex < images.count {
                                    Image(uiImage: images[currentImageIndex])
                                        .resizable()
                                        .scaledToFit()
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 400)
                                        .background(Color.black)
                                        .cornerRadius(12)
                                }
                                
                                // Image counter badge
                                VStack {
                                    HStack {
                                        Spacer()
                                        Text("\(currentImageIndex + 1)/\(images.count)")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(Color.black.opacity(0.7))
                                            .cornerRadius(16)
                                            .padding()
                                    }
                                    Spacer()
                                }
                                
                                // Chevron navigation
                                if images.count > 1 {
                                    HStack {
                                        // Left chevron
                                        Button(action: goToPrevImage) {
                                            Image(systemName: "chevron.left")
                                                .font(.system(size: 20, weight: .bold))
                                                .foregroundColor(.white)
                                                .frame(width: 36, height: 36)
                                                .background(currentImageIndex == 0 ?
                                                    Color.gray.opacity(0.3) :
                                                    AppTheme.Colors.primary)
                                                .cornerRadius(18)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 18)
                                                        .stroke(currentImageIndex == 0 ? Color.clear :
                                                            AppTheme.Colors.primary, lineWidth: 2)
                                                )
                                                .shadow(color: .black.opacity(0.3), radius: 8)
                                        }
                                        .disabled(currentImageIndex == 0)
                                        .opacity(currentImageIndex == 0 ? 0.5 : 1.0)
                                        .padding(.leading, 20)
                                        
                                        Spacer()
                                        
                                        // Right chevron
                                        Button(action: goToNextImage) {
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 20, weight: .bold))
                                                .foregroundColor(.white)
                                                .frame(width: 36, height: 36)
                                                .background(currentImageIndex == images.count - 1 ?
                                                    Color.gray.opacity(0.3) :
                                                    AppTheme.Colors.primary)
                                                .cornerRadius(18)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 18)
                                                        .stroke(currentImageIndex == images.count - 1 ? Color.clear :
                                                            AppTheme.Colors.primary, lineWidth: 2)
                                                )
                                                .shadow(color: .black.opacity(0.3), radius: 8)
                                        }
                                        .disabled(currentImageIndex == images.count - 1)
                                        .opacity(currentImageIndex == images.count - 1 ? 0.5 : 1.0)
                                        .padding(.trailing, 20)
                                    }
                                }
                
                // QR Scan Badge (if detected)
                if detectedQRUrl != nil {
                    VStack {
                        Spacer()
                        HStack {
                            Image(systemName: "qrcode")
                                .font(.system(size: 14))
                            Text("eTIMS QR Detected")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(AppTheme.Colors.primary.opacity(0.9))
                        .cornerRadius(16)
                        .padding(.bottom, 8)
                    }
                } else if scanningQR {
                    VStack {
                        Spacer()
                        HStack {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            Text("Scanning for QR...")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.gray.opacity(0.8))
                        .cornerRadius(16)
                        .padding(.bottom, 8)
                    }
                }
                                    Text("Workspace")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    Menu {
                                        if isLoadingWorkspaces {
                                            Text("Loading...")
                                        } else if workspaces.isEmpty {
                                            Text("No workspaces")
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
                                                .foregroundColor(.secondary)
                                        }
                                        .padding()
                                        .background(Color(uiColor: .systemBackground))
                                        .cornerRadius(10)
                                    }
                                }
                                
                                // Description
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Description")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    TextField("Add description", text: $description)
                                        .padding()
                                        .background(Color(uiColor: .systemBackground))
                                        .cornerRadius(10)
                                }
                                
                                // Category
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Category")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
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
                                                .foregroundColor(.secondary)
                                        }
                                        .padding()
                                        .background(Color(uiColor: .systemBackground))
                                        .cornerRadius(10)
                                    }
                                }
                                
                                // Location info
                                if locationPermissionGranted, let location = locationManager.location {
                                    HStack(spacing: 8) {
                                        Image(systemName: "location.fill")
                                            .font(.system(size: 14))
                                            .foregroundColor(AppTheme.Colors.primary)
                                        
                                        Text("Location: \(String(format: "%.4f, %.4f", location.coordinate.latitude, location.coordinate.longitude))")
                                            .font(.system(size: 13))
                                            .foregroundColor(.secondary)
                                        
                                        Spacer()
                                    }
                                    .padding(.vertical, 8)
                                }
                            }
                            .padding(.horizontal)
                            
                            // Submit button
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
                            .padding(.bottom, 30)
                        }
                        .padding(.top)
                    }
                }
            .onAppear {
                // Auto-scan for QR codes when view appears (like Android)
                scanForQRCodes()
                checkLocationPermission()
                loadWorkspaces()
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
    
    private func loadWorkspaces() {
        isLoadingWorkspaces = true
        Task {
            do {
                let fetched = try await API.shared.fetchWorkspaces()
                await MainActor.run {
                    workspaces = fetched
                    // Auto-select first workspace if only one
                    if workspaces.count == 1 {
                        selectedWorkspace = workspaces[0].id
                    }
                    isLoadingWorkspaces = false
                }
            } catch {
                await MainActor.run {
                    isLoadingWorkspaces = false
                    print("Error loading workspaces: \(error)")
                }
            }
        }
    }
    
    private func submitExpenses() {
        isSubmitting = true
        
        Task {
            do {
                // Convert images to Data
                let imageDataArray = images.compactMap { $0.jpegData(compressionQuality: 0.8) }
                
                // Prepare location
                let lat = locationManager.location?.coordinate.latitude
                let lon = locationManager.location?.coordinate.longitude
                
                // Upload receipts
                let response = try await API.shared.uploadReceipts(
                    images: imageDataArray,
                    workspaceId: selectedWorkspace,
                    description: description.isEmpty ? nil : description,
                    category: selectedCategory,
                    latitude: lat,
                    longitude: lon,
                    qrUrl: detectedQRUrl // NEW: Pass detected QR URL
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
                // Scan all images for QR codes
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
