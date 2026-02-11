import SwiftUI
import AVFoundation
import PhotosUI

// MARK: - Receipt Capture Main View

struct ReceiptCapture: View {
    @Environment(\.dismiss) var dismiss
    @State private var showCamera = false
    @State private var showImagePicker = false
    @State private var capturedImages: [UIImage] = []
    @State private var continuousMode = false
    @State private var showConfirmExpenses = false
    @State private var cameraPermissionGranted = false
    @State private var showPermissionPrompt = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(red: 0.93, green: 0.98, blue: 0.95),
                        Color(red: 0.88, green: 0.98, blue: 0.88),
                        Color(red: 0.93, green: 0.98, blue: 0.95)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                if showConfirmExpenses {
                    ConfirmExpensesView(
                        images: capturedImages,
                        onConfirm: { expenses in
                            Task {
                                await submitExpenses(expenses)
                            }
                        },
                        onCancel: {
                            showConfirmExpenses = false
                            capturedImages = []
                            continuousMode = false
                        }
                    )
                } else {
                    // Camera or empty state
                    VStack(spacing: 0) {
                        // Camera view area
                        if showCamera {
                            CameraView(
                                capturedImages: $capturedImages,
                                continuousMode: $continuousMode,
                                onCapture: { image in
                                    if continuousMode {
                                        capturedImages.append(image)
                                    } else {
                                        capturedImages = [image]
                                        showCamera = false
                                        showConfirmExpenses = true
                                    }
                                },
                                onGalleryTap: {
                                    showImagePicker = true
                                },
                                onMultipleTap: {
                                    continuousMode.toggle()
                                    if !continuousMode {
                                        capturedImages = []
                                    }
                                },
                                onProcessMultiple: {
                                    if !capturedImages.isEmpty {
                                        showCamera = false
                                        showConfirmExpenses = true
                                    }
                                }
                            )
                        } else if showPermissionPrompt {
                            // Permission prompt
                            VStack(spacing: 24) {
                                Spacer()
                                
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 64))
                                    .foregroundColor(.gray)
                                
                                Text("Camera Access Required")
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(.primary)
                                
                                Text("We need camera access to scan receipts.")
                                    .font(.system(size: 16))
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 32)
                                
                                Spacer()
                                
                                VStack(spacing: 12) {
                                    Button(action: requestCameraPermission) {
                                        Text("Allow Camera Access")
                                            .font(.system(size: 18, weight: .semibold))
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 16)
                                            .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                                            .cornerRadius(16)
                                    }
                                    
                                    Button(action: { dismiss() }) {
                                        Text("Cancel")
                                            .font(.system(size: 16, weight: .medium))
                                            .foregroundColor(.gray)
                                    }
                                }
                                .padding(.horizontal, 24)
                                .padding(.bottom, 32)
                            }
                        } else {
                            // Empty state
                            VStack(spacing: 24) {
                                Spacer()
                                
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 64))
                                    .foregroundColor(.gray)
                                
                                Text("Allow camera access to start scanning")
                                    .font(.system(size: 16))
                                    .foregroundColor(.secondary)
                                
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle("Create expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.primary)
                    }
                }
            }
            .sheet(isPresented: $showImagePicker) {
                PhotosPicker(
                    selection: Binding(
                        get: { [] },
                        set: { _ in }
                    ),
                    matching: .images
                ) {
                    Text("Select Photos")
                }
            }
        }
        .onAppear {
            checkCameraPermission()
        }
    }
    
    private func checkCameraPermission() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraPermissionGranted = true
            showCamera = true
        case .notDetermined:
            showPermissionPrompt = true
        case .denied, .restricted:
            showPermissionPrompt = true
        @unknown default:
            showPermissionPrompt = true
        }
    }
    
    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                cameraPermissionGranted = granted
                showPermissionPrompt = false
                if granted {
                    showCamera = true
                }
            }
        }
    }
    
    private func submitExpenses(_ expenses: [ExpenseData]) async {
        do {
            // Get location if available
            var latitude: Double?
            var longitude: Double?
            
            // TODO: Add CoreLocation to get actual GPS coordinates
            // For now, submit without location
            
            // Convert images to Data array
            let imageDatas = expenses.compactMap { $0.imageData }
            
            // Get first workspace (or default)
            // TODO: Let user select workspace
            let workspaces = try await API.shared.fetchWorkspaces()
            let workspaceId = workspaces.first?.id ?? ""
            
            // Upload receipts
            let result = try await API.shared.uploadReceipts(
                images: imageDatas,
                workspaceId: workspaceId,
                description: nil,
                category: nil,
                latitude: latitude,
                longitude: longitude
            )
            
            await MainActor.run {
                print("Successfully uploaded \(expenses.count) receipt(s)")
                if let reportId = result.reportId {
                    print("Created report: \(reportId)")
                    // TODO: Navigate to report detail page
                }
                dismiss()
            }
        } catch {
            await MainActor.run {
                print("Failed to upload receipts: \(error)")
                // TODO: Show error alert to user
                dismiss()
            }
        }
    }
}

// MARK: - Camera View

struct CameraView: View {
    @Binding var capturedImages: [UIImage]
    @Binding var continuousMode: Bool
    let onCapture: (UIImage) -> Void
    let onGalleryTap: () -> Void
    let onMultipleTap: () -> Void
    let onProcessMultiple: () -> Void
    
    @StateObject private var cameraManager = CameraManager()
    
    var body: some View {
        ZStack {
            // Camera preview
            CameraPreview(session: cameraManager.session)
                .ignoresSafeArea()
            
            // Continuous mode counter
            if continuousMode && !capturedImages.isEmpty {
                VStack {
                    HStack {
                        Spacer()
                        Text("\(capturedImages.count) photo\(capturedImages.count > 1 ? "s" : "")")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.9))
                            .cornerRadius(20)
                            .padding()
                    }
                    Spacer()
                }
            }
            
            // Bottom controls
            VStack {
                Spacer()
                
                // Thumbnail strip in continuous mode
                if continuousMode && !capturedImages.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(capturedImages.indices, id: \.self) { index in
                                ZStack(alignment: .topTrailing) {
                                    Image(uiImage: capturedImages[index])
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 64, height: 80)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(Color(red: 0.05, green: 0.51, blue: 0.31), lineWidth: 2)
                                        )
                                    
                                    Button(action: {
                                        capturedImages.remove(at: index)
                                    }) {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 20))
                                            .foregroundColor(.red)
                                            .background(Circle().fill(Color.white))
                                    }
                                    .offset(x: 8, y: -8)
                                }
                            }
                            
                            // Empty placeholders
                            ForEach(0..<max(0, 5 - capturedImages.count), id: \.self) { _ in
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), style: StrokeStyle(lineWidth: 2, dash: [5]))
                                    .frame(width: 64, height: 80)
                                    .overlay(
                                        Image(systemName: "camera.fill")
                                            .foregroundColor(.gray.opacity(0.4))
                                    )
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .frame(height: 96)
                    .padding(.bottom, 8)
                }
                
                // Camera controls
                HStack(spacing: 16) {
                    if !continuousMode {
                        // Gallery button
                        Button(action: onGalleryTap) {
                            Image(systemName: "photo.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.gray)
                                .frame(width: 56, height: 56)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .shadow(color: .black.opacity(0.1), radius: 4)
                        }
                    } else {
                        Spacer().frame(width: 56)
                    }
                    
                    Spacer()
                    
                    // Capture button
                    Button(action: {
                        cameraManager.capturePhoto { image in
                            if let image = image {
                                onCapture(image)
                            }
                        }
                    }) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [
                                            Color(red: 0.05, green: 0.51, blue: 0.31),
                                            Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.8)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 96, height: 96)
                                .shadow(color: Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.3), radius: 8)
                            
                            Circle()
                                .strokeBorder(Color.white, lineWidth: 6)
                                .frame(width: 72, height: 72)
                        }
                    }
                    
                    Spacer()
                    
                    // Multi-receipt mode toggle
                    HStack(spacing: 8) {
                        Button(action: onMultipleTap) {
                            Image(systemName: "doc.text.fill")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(continuousMode ? .white : .gray)
                                .frame(width: 64, height: 64)
                                .background(
                                    continuousMode ?
                                    LinearGradient(
                                        colors: [
                                            Color(red: 0.05, green: 0.51, blue: 0.31),
                                            Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.8)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ) :
                                    LinearGradient(colors: [Color.white], startPoint: .top, endPoint: .bottom)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .shadow(color: .black.opacity(0.1), radius: 4)
                        }
                        
                        if continuousMode && !capturedImages.isEmpty {
                            Button(action: onProcessMultiple) {
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 36, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 64, height: 64)
                                    .background(
                                        LinearGradient(
                                            colors: [
                                                Color(red: 0.05, green: 0.51, blue: 0.31),
                                                Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.8)
                                            ],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .clipShape(Circle())
                                    .shadow(color: Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.4), radius: 8)
                            }
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
                .padding(.top, 16)
                .background(Color.white.opacity(0.8))
                .background(.ultraThinMaterial)
            }
        }
        .onAppear {
            cameraManager.startSession()
        }
        .onDisappear {
            cameraManager.stopSession()
        }
    }
}

// MARK: - Camera Preview

struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        context.coordinator.previewLayer = previewLayer
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            context.coordinator.previewLayer?.frame = uiView.bounds
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator {
        var previewLayer: AVCaptureVideoPreviewLayer?
    }
}

// MARK: - Camera Manager

class CameraManager: NSObject, ObservableObject {
    let session = AVCaptureSession()
    private var photoOutput = AVCapturePhotoOutput()
    private var captureCompletion: ((UIImage?) -> Void)?
    
    func startSession() {
        guard !session.isRunning else { return }
        
        session.sessionPreset = .photo
        
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            return
        }
        
        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if session.canAddInput(input) {
                session.addInput(input)
            }
            
            if session.canAddOutput(photoOutput) {
                session.addOutput(photoOutput)
            }
            
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.session.startRunning()
            }
        } catch {
            print("Error setting up camera: \(error)")
        }
    }
    
    func stopSession() {
        guard session.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.stopRunning()
        }
    }
    
    func capturePhoto(completion: @escaping (UIImage?) -> Void) {
        captureCompletion = completion
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

extension CameraManager: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard error == nil,
              let imageData = photo.fileDataRepresentation(),
              let image = UIImage(data: imageData) else {
            captureCompletion?(nil)
            return
        }
        captureCompletion?(image)
    }
}

// MARK: - Confirm Expenses View

struct ExpenseData: Identifiable {
    let id = UUID()
    var merchant: String = ""
    var amount: String = ""
    var date: Date = Date()
    var imageData: Data
}

struct ConfirmExpensesView: View {
    let images: [UIImage]
    let onConfirm: ([ExpenseData]) -> Void
    let onCancel: () -> Void
    
    @State private var expenses: [ExpenseData] = []
    @State private var currentIndex = 0
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.93, green: 0.98, blue: 0.95),
                        Color(red: 0.88, green: 0.98, blue: 0.88),
                        Color(red: 0.93, green: 0.98, blue: 0.95)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Image preview
                    if currentIndex < images.count {
                        Image(uiImage: images[currentIndex])
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxHeight: 300)
                            .cornerRadius(12)
                            .padding()
                    }
                    
                    // Page indicator
                    if images.count > 1 {
                        HStack(spacing: 8) {
                            ForEach(images.indices, id: \.self) { index in
                                Circle()
                                    .fill(index == currentIndex ? Color(red: 0.05, green: 0.51, blue: 0.31) : Color.gray.opacity(0.3))
                                    .frame(width: 8, height: 8)
                            }
                        }
                        .padding(.bottom, 16)
                    }
                    
                    // Form
                    Form {
                        Section(header: Text("Expense Details")) {
                            TextField("Merchant", text: $expenses[currentIndex].merchant)
                            TextField("Amount", text: $expenses[currentIndex].amount)
                                .keyboardType(.decimalPad)
                            DatePicker("Date", selection: $expenses[currentIndex].date, displayedComponents: .date)
                        }
                    }
                    
                    // Navigation buttons
                    HStack(spacing: 12) {
                        if currentIndex > 0 {
                            Button(action: { currentIndex -= 1 }) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                                    .clipShape(Circle())
                            }
                        }
                        
                        Spacer()
                        
                        if currentIndex < images.count - 1 {
                            Button(action: { currentIndex += 1 }) {
                                HStack {
                                    Text("Next")
                                    Image(systemName: "chevron.right")
                                }
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                                .cornerRadius(24)
                            }
                        } else {
                            Button(action: { onConfirm(expenses) }) {
                                Text("Confirm All")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 12)
                                    .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                                    .cornerRadius(24)
                            }
                        }
                    }
                    .padding()
                    .background(Color.white)
                }
            }
            .navigationTitle("Confirm Expenses")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: onCancel) {
                        Text("Cancel")
                    }
                }
            }
        }
        .onAppear {
            expenses = images.map { image in
                ExpenseData(imageData: image.jpegData(compressionQuality: 0.8) ?? Data())
            }
        }
    }
}

#Preview {
    ReceiptCapture()
}
