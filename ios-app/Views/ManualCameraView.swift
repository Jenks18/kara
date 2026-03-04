import SwiftUI
import AVFoundation
import Vision

// MARK: - ManualCameraView
// Custom camera with optional QR scanning toggle.
// Mirrors Android's MultiCaptureCamera behaviour: tap the QR icon to switch
// between document-photo mode and QR-code-detection mode.

struct ManualCameraView: View {
    let onImagesReady: ([UIImage]) -> Void
    @Environment(\.dismiss) var dismiss

    @StateObject private var cameraController = ManualCameraController()
    @State private var qrMode = false
    @State private var capturedImages: [UIImage] = []
    @State private var detectedQRCode: String? = nil
    @State private var showQRBanner = false
    @State private var flashEnabled = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Live preview
            CameraPreviewView(session: cameraController.session)
                .ignoresSafeArea()

            // QR crosshair overlay
            if qrMode {
                QRCrosshairOverlay()
            }

            // QR detected banner
            if showQRBanner, let url = detectedQRCode {
                VStack {
                    HStack(spacing: 8) {
                        Image(systemName: "qrcode")
                        Text(url.count > 40 ? String(url.prefix(40)) + "…" : url)
                            .font(.system(size: 13))
                            .lineLimit(1)
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.green.opacity(0.85))
                    .cornerRadius(10)
                    .padding(.horizontal, 24)
                    Spacer()
                }
                .padding(.top, 100)
                .animation(.easeInOut, value: showQRBanner)
            }

            VStack {
                // ── Top bar ──────────────────────────────────────────────
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    Spacer()

                    // Flash toggle
                    Button(action: toggleFlash) {
                        Image(systemName: flashEnabled ? "bolt.fill" : "bolt.slash.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(flashEnabled ? .yellow : .white)
                            .frame(width: 44, height: 44)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)

                Spacer()

                // ── Thumbnail strip ──────────────────────────────────────
                if !capturedImages.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(Array(capturedImages.enumerated()), id: \.offset) { idx, img in
                                ZStack(alignment: .topTrailing) {
                                    Image(uiImage: img)
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: 64, height: 64)
                                        .clipped()
                                        .cornerRadius(8)

                                    Button(action: { capturedImages.remove(at: idx) }) {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 16))
                                            .foregroundColor(.white)
                                            .background(Color.black.opacity(0.6))
                                            .clipShape(Circle())
                                    }
                                    .offset(x: 4, y: -4)
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .frame(height: 82)
                }

                // ── Bottom controls ──────────────────────────────────────
                HStack(alignment: .center, spacing: 0) {
                    // QR toggle (left)
                    Button(action: { withAnimation { qrMode.toggle() } }) {
                        Image(systemName: qrMode ? "qrcode.viewfinder" : "camera.viewfinder")
                            .font(.system(size: 26))
                            .foregroundColor(qrMode ? .green : .white)
                            .frame(width: 56, height: 56)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    Spacer()

                    // Shutter (center) — only in photo mode
                    if !qrMode {
                        Button(action: capturePhoto) {
                            ZStack {
                                Circle()
                                    .strokeBorder(Color.white, lineWidth: 3)
                                    .frame(width: 78, height: 78)
                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 62, height: 62)
                            }
                        }
                        .disabled(!cameraController.isReady)
                    } else {
                        // In QR mode, just a placeholder to keep layout stable
                        Circle()
                            .fill(Color.clear)
                            .frame(width: 78, height: 78)
                    }

                    Spacer()

                    // Done button (right) — always shown
                    Button(action: {
                        if !capturedImages.isEmpty {
                            onImagesReady(capturedImages)
                        } else {
                            dismiss()
                        }
                    }) {
                        Text(capturedImages.isEmpty ? "Cancel" : "Done (\(capturedImages.count))")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 80, height: 44)
                            .background(capturedImages.isEmpty ? Color.clear : AppTheme.Colors.primary)
                            .overlay(
                                RoundedRectangle(cornerRadius: 22)
                                    .stroke(Color.white.opacity(capturedImages.isEmpty ? 0.4 : 0), lineWidth: 1.5)
                            )
                            .cornerRadius(22)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .onAppear {
            cameraController.startSession(qrHandler: handleQRCode)
        }
        .onDisappear {
            cameraController.stopSession()
        }
        .onChange(of: qrMode) { _, newVal in
            cameraController.setQRMode(newVal)
            if !newVal {
                detectedQRCode = nil
                showQRBanner = false
            }
        }
    }

    private func capturePhoto() {
        cameraController.capturePhoto { image in
            if let img = image {
                capturedImages.append(img)
            }
        }
    }

    private func toggleFlash() {
        flashEnabled.toggle()
        cameraController.setTorch(flashEnabled)
    }

    private func handleQRCode(_ code: String) {
        // Apply two-tier URL filtering (matches Android behavior)
        guard let filteredUrl = QRScannerService.shared.filterLiveQR(code) else { return }
        guard detectedQRCode != filteredUrl else { return }
        detectedQRCode = filteredUrl
        showQRBanner = true
        // Auto-dismiss banner after 1.5s
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showQRBanner = false
        }
    }
}

// MARK: - QR Crosshair Overlay

private struct QRCrosshairOverlay: View {
    var body: some View {
        GeometryReader { geo in
            let side: CGFloat = min(geo.size.width, geo.size.height) * 0.6
            let x = (geo.size.width - side) / 2
            let y = (geo.size.height - side) / 2

            ZStack {
                // Dimmed background outside box
                Color.black.opacity(0.45)
                    .ignoresSafeArea()
                    .mask(
                        Rectangle()
                            .ignoresSafeArea()
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .frame(width: side, height: side)
                                    .blendMode(.destinationOut)
                            )
                            .compositingGroup()
                    )

                // Corner brackets
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color.green, lineWidth: 3)
                    .frame(width: side, height: side)
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)

                Text("Align QR code within the frame")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.9))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(8)
                    .position(x: geo.size.width / 2, y: y + side + 24)
            }
        }
    }
}

// MARK: - Camera Preview (UIKit bridge)

private struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewUIView {
        let view = PreviewUIView()
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewUIView, context: Context) {}

    class PreviewUIView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var videoPreviewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}

// MARK: - Camera Controller (ObservableObject)

@MainActor
final class ManualCameraController: NSObject, ObservableObject {
    @Published var isReady = false

    let session = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private let metadataOutput = AVCaptureMetadataOutput()
    private var photoCaptureCallback: ((UIImage?) -> Void)?
    private var qrHandler: ((String) -> Void)?
    private var qrModeActive = false
    private var device: AVCaptureDevice?
    private let sessionQueue = DispatchQueue(label: "com.kara.camera.session")

    func startSession(qrHandler: @escaping (String) -> Void) {
        self.qrHandler = qrHandler
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.configureSession()
        }
    }

    private func configureSession() {
        session.beginConfiguration()
        session.sessionPreset = .photo

        guard let cam = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: cam) else {
            session.commitConfiguration()
            return
        }
        device = cam

        if session.canAddInput(input) { session.addInput(input) }
        if session.canAddOutput(photoOutput) { session.addOutput(photoOutput) }

        session.commitConfiguration()
        session.startRunning()

        DispatchQueue.main.async { self.isReady = true }
    }

    func stopSession() {
        sessionQueue.async { [weak self] in
            self?.session.stopRunning()
        }
    }

    func setQRMode(_ on: Bool) {
        qrModeActive = on
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.session.beginConfiguration()
            // Add/remove metadata output for QR
            if on {
                if self.session.canAddOutput(self.metadataOutput) {
                    self.session.addOutput(self.metadataOutput)
                    self.metadataOutput.setMetadataObjectsDelegate(self, queue: .main)
                    if self.metadataOutput.availableMetadataObjectTypes.contains(.qr) {
                        self.metadataOutput.metadataObjectTypes = [.qr]
                    }
                }
            } else {
                self.session.removeOutput(self.metadataOutput)
            }
            self.session.commitConfiguration()
        }
    }

    func setTorch(_ on: Bool) {
        guard let device, device.hasTorch else { return }
        try? device.lockForConfiguration()
        device.torchMode = on ? .on : .off
        device.unlockForConfiguration()
    }

    func capturePhoto(completion: @escaping (UIImage?) -> Void) {
        photoCaptureCallback = completion
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension ManualCameraController: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else {
            Task { @MainActor in self.photoCaptureCallback?(nil) }
            return
        }
        Task { @MainActor in self.photoCaptureCallback?(image) }
    }
}

// MARK: - AVCaptureMetadataOutputObjectsDelegate (QR mode)

extension ManualCameraController: AVCaptureMetadataOutputObjectsDelegate {
    nonisolated func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        for obj in metadataObjects {
            if let readable = obj as? AVMetadataMachineReadableCodeObject,
               readable.type == .qr,
               let str = readable.stringValue {
                Task { @MainActor in self.qrHandler?(str) }
                return
            }
        }
    }
}
