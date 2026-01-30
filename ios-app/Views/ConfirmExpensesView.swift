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
    @StateObject private var locationManager = LocationManager()
    
    let categories = ["fuel", "parking", "maintenance", "tolls", "other"]
    
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
                            .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
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
                                                    Color(red: 0.2, green: 0.7, blue: 0.4))
                                                .cornerRadius(18)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 18)
                                                        .stroke(currentImageIndex == 0 ? Color.clear :
                                                            Color(red: 0.3, green: 0.8, blue: 0.5), lineWidth: 2)
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
                                                    Color(red: 0.2, green: 0.7, blue: 0.4))
                                                .cornerRadius(18)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 18)
                                                        .stroke(currentImageIndex == images.count - 1 ? Color.clear :
                                                            Color(red: 0.3, green: 0.8, blue: 0.5), lineWidth: 2)
                                                )
                                                .shadow(color: .black.opacity(0.3), radius: 8)
                                        }
                                        .disabled(currentImageIndex == images.count - 1)
                                        .opacity(currentImageIndex == images.count - 1 ? 0.5 : 1.0)
                                        .padding(.trailing, 20)
                                    }
                                }
                            }
                            .padding(.horizontal)
                            
                            // Form section
                            VStack(spacing: 16) {
                                // Workspace selector
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Workspace")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    Menu {
                                        Button("Personal") {
                                            selectedWorkspace = "personal"
                                        }
                                        Button("Work") {
                                            selectedWorkspace = "work"
                                        }
                                    } label: {
                                        HStack {
                                            Text(selectedWorkspace.isEmpty ? "Select workspace" : selectedWorkspace.capitalized)
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
                                            .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                                        
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
                                        Color(red: 0.2, green: 0.7, blue: 0.4)
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
            }
            .onAppear {
                checkLocationPermission()
            }
            .alert("Success", isPresented: $showSuccess) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Receipts submitted successfully!")
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
                    longitude: lon
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
                    print("Upload error: \(error)")
                    // TODO: Show error alert
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
