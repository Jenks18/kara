import SwiftUI
import AVFoundation
import PhotosUI
import Combine

struct ReceiptCaptureView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var cameraManager = CameraManager()
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var capturedImages: [UIImage] = []
    @State private var showPhotosPicker = false
    @State private var showConfirmExpenses = false
    @State private var cameraPermissionGranted = false
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if cameraPermissionGranted {
                // Camera preview
                CameraPreview(session: cameraManager.session)
                    .ignoresSafeArea()
                
                // UI Overlay
                VStack {
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
                        
                        Text("\(capturedImages.count) photo\(capturedImages.count == 1 ? "" : "s")")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.5))
                            .cornerRadius(20)
                    }
                    .padding()
                    
                    Spacer()
                    
                    // Bottom controls
                    VStack(spacing: 20) {
                        // Capture hint
                        if capturedImages.isEmpty {
                            Text("Position receipt in frame and tap capture")
                                .font(.system(size: 14))
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(8)
                        }
                        
                        // Controls row
                        HStack(spacing: 40) {
                            // Gallery button
                            Button(action: { showPhotosPicker = true }) {
                                VStack(spacing: 4) {
                                    Image(systemName: "photo.on.rectangle")
                                        .font(.system(size: 24))
                                    Text("Gallery")
                                        .font(.system(size: 12))
                                }
                                .foregroundColor(.white)
                            }
                            
                            // Capture button
                            Button(action: capturePhoto) {
                                ZStack {
                                    Circle()
                                        .stroke(Color.white, lineWidth: 4)
                                        .frame(width: 70, height: 70)
                                    
                                    Circle()
                                        .fill(Color.white)
                                        .frame(width: 60, height: 60)
                                }
                            }
                            .scaleEffect(cameraManager.isCapturing ? 0.9 : 1.0)
                            .animation(.spring(response: 0.3), value: cameraManager.isCapturing)
                            
                            // Done button
                            Button(action: {
                                if !capturedImages.isEmpty {
                                    showConfirmExpenses = true
                                }
                            }) {
                                VStack(spacing: 4) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(capturedImages.isEmpty ? .gray : Color(red: 0.2, green: 0.7, blue: 0.4))
                                    Text("Done")
                                        .font(.system(size: 12))
                                        .foregroundColor(capturedImages.isEmpty ? .gray : .white)
                                }
                            }
                            .disabled(capturedImages.isEmpty)
                        }
                        .padding(.bottom, 40)
                    }
                }
            } else {
                // Permission request
                VStack(spacing: 20) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.white)
                    
                    Text("Camera Access Required")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text("Please allow camera access to scan receipts")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    Button(action: requestCameraPermission) {
                        Text("Enable Camera")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 30)
                            .padding(.vertical, 12)
                            .background(Color(red: 0.2, green: 0.7, blue: 0.4))
                            .cornerRadius(12)
                    }
                    .padding(.top, 10)
                }
            }
        }
        .photosPicker(isPresented: $showPhotosPicker, selection: $selectedPhotos, maxSelectionCount: 10, matching: .images)
        .onChange(of: selectedPhotos) { _, newValue in
            Task {
                await loadPhotos(newValue)
            }
        }
        .onChange(of: cameraManager.capturedImage) { _, newImage in
            if let image = newImage {
                capturedImages.append(image)
                cameraManager.capturedImage = nil
            }
        }
        .fullScreenCover(isPresented: $showConfirmExpenses) {
            ConfirmExpensesView(images: capturedImages)
        }
        .onAppear {
            checkCameraPermission()
        }
    }
    
    private func checkCameraPermission() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraPermissionGranted = true
            cameraManager.startSession()
        case .notDetermined:
            requestCameraPermission()
        default:
            cameraPermissionGranted = false
        }
    }
    
    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                cameraPermissionGranted = granted
                if granted {
                    cameraManager.startSession()
                }
            }
        }
    }
    
    private func capturePhoto() {
        cameraManager.capturePhoto()
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

// Camera manager to handle AVFoundation
class CameraManager: NSObject, ObservableObject {
    @Published var capturedImage: UIImage?
    @Published var isCapturing = false
    
    let session = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    
    override init() {
        super.init()
        setupCamera()
    }
    
    private func setupCamera() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            
            self.session.beginConfiguration()
            self.session.sessionPreset = .photo
            
            // Add input
            guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                  let input = try? AVCaptureDeviceInput(device: camera) else {
                self.session.commitConfiguration()
                return
            }
            
            if self.session.canAddInput(input) {
                self.session.addInput(input)
            }
            
            // Add output
            if self.session.canAddOutput(self.photoOutput) {
                self.session.addOutput(self.photoOutput)
            }
            
            self.session.commitConfiguration()
        }
    }
    
    func startSession() {
        sessionQueue.async { [weak self] in
            self?.session.startRunning()
        }
    }
    
    func stopSession() {
        sessionQueue.async { [weak self] in
            self?.session.stopRunning()
        }
    }
    
    func capturePhoto() {
        DispatchQueue.main.async {
            self.isCapturing = true
        }
        
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

extension CameraManager: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else {
            DispatchQueue.main.async {
                self.isCapturing = false
            }
            return
        }
        
        DispatchQueue.main.async {
            self.capturedImage = image
            self.isCapturing = false
        }
    }
}

// Camera preview UIViewRepresentable
struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        
        DispatchQueue.main.async {
            previewLayer.frame = view.bounds
        }
        
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewLayer = uiView.layer.sublayers?.first as? AVCaptureVideoPreviewLayer {
            DispatchQueue.main.async {
                previewLayer.frame = uiView.bounds
            }
        }
    }
}

#Preview {
    ReceiptCaptureView()
}
