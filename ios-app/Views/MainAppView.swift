import SwiftUI
import PhotosUI

// Main app with 5-tab navigation with elevated center scan button
// Tabs: Home, Reports, [Scan], Workspaces, Account
struct MainAppView: View {
    @EnvironmentObject var authManager: ClerkAuthManager
    @StateObject private var dataStore = AppDataStore()
    @State private var selectedTab = 0
    // Scan cover state lives HERE — reliable iOS 26 presentation context
    @State private var showCamera = false
    @State private var showPhotosPicker = false
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var galleryImages: [UIImage] = []
    @State private var showConfirmGallery = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Content — all tab views stay alive via ZStack + opacity.
            // This prevents view recreation (and redundant API calls) on every tab switch.
            ZStack {
                NavigationStack { HomePage(selectedTab: $selectedTab, dataStore: dataStore) }
                    .opacity(selectedTab == 0 ? 1 : 0)
                    .allowsHitTesting(selectedTab == 0)

                NavigationStack { ReportsPage(dataStore: dataStore) }
                    .opacity(selectedTab == 1 ? 1 : 0)
                    .allowsHitTesting(selectedTab == 1)

                CreateExpensePage(
                    onScanTapped: { showCamera = true },
                    onGalleryTapped: { showPhotosPicker = true }
                )
                .opacity(selectedTab == 2 ? 1 : 0)
                .allowsHitTesting(selectedTab == 2)

                WorkspacesPage(dataStore: dataStore)
                    .opacity(selectedTab == 3 ? 1 : 0)
                    .allowsHitTesting(selectedTab == 3)

                AccountPage()
                    .opacity(selectedTab == 4 ? 1 : 0)
                    .allowsHitTesting(selectedTab == 4)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Custom Tab Bar
            CustomTabBar(selectedTab: $selectedTab)
        }
        .ignoresSafeArea(.keyboard)
        .onAppear {
            // Seed data store from cache, then kick off parallel network refresh
            dataStore.seed()
            Task { await dataStore.refreshAll() }
        }
        // Presentations at root level — guaranteed UIViewController context
        .fullScreenCover(isPresented: $showCamera) {
            ReceiptCaptureView()
        }
        .fullScreenCover(isPresented: $showConfirmGallery) {
            ConfirmExpensesView(images: galleryImages)
        }
        .photosPicker(isPresented: $showPhotosPicker, selection: $selectedPhotos, maxSelectionCount: 10, matching: .images)
        .onChange(of: selectedPhotos) { _, newValue in
            guard !newValue.isEmpty else { return }
            Task {
                var loaded: [UIImage] = []
                for item in newValue {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        loaded.append(image)
                    }
                }
                await MainActor.run {
                    selectedPhotos = []
                    if !loaded.isEmpty {
                        galleryImages = loaded
                        showConfirmGallery = true
                    }
                }
            }
        }
    }
}

struct CustomTabBar: View {
    @Binding var selectedTab: Int
    @EnvironmentObject var profileManager: ProfileManager
    
    var body: some View {
        HStack(spacing: 0) {
            // Left tabs
            TabBarButton(icon: "house.fill", title: "Home", isSelected: selectedTab == 0) {
                selectedTab = 0
            }
            
            TabBarButton(icon: "doc.text.fill", title: "Reports", isSelected: selectedTab == 1) {
                selectedTab = 1
            }
            
            // Center scan button spacer
            Spacer()
            
            TabBarButton(icon: "building.2.fill", title: "Workspaces", isSelected: selectedTab == 3) {
                selectedTab = 3
            }
            
            TabBarButton(icon: nil, title: "Account", isSelected: selectedTab == 4, avatarEmoji: profileManager.avatarEmoji) {
                selectedTab = 4
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 8)
        // No explicit bottom padding — SwiftUI places content at the safe-area
        // boundary naturally; the background fill handles the home indicator area.
        .background(
            // .ultraThinMaterial = system frosted glass, same material Apple uses
            // for UITabBar/UINavigationBar. ignoresSafeArea fills the home indicator
            // region so the bar sits flush against the physical screen edge.
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom)
                .shadow(color: Color.black.opacity(0.08), radius: 8, y: -2)
        )
        .overlay(alignment: .top) {
            // Elevated scan button (matches Android raised center FAB)
            Button {
                selectedTab = 2
            } label: {
                Image(systemName: "camera.viewfinder")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: AppTheme.Dimensions.fabSize, height: AppTheme.Dimensions.fabSize)
                    .background(AppTheme.Gradients.primary)
                    .clipShape(Circle())
                    .shadow(color: AppTheme.Colors.primary.opacity(0.35), radius: 10, y: 4)
            }
            .offset(y: -32)
        }
    }
}

struct TabBarButton: View {
    let icon: String?
    let title: String
    let isSelected: Bool
    var avatarEmoji: String? = nil
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                if let emoji = avatarEmoji {
                    // Avatar circle for Account tab
                    Circle()
                        .fill(Color.white)
                        .frame(width: 26, height: 26)
                        .overlay(
                            Text(emoji)
                                .font(.system(size: 14))
                        )
                        .overlay(
                            isSelected ?
                                Circle()
                                    .stroke(AppTheme.Colors.primary, lineWidth: 2)
                                : nil
                        )
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 22))
                }
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .foregroundStyle(isSelected ? AppTheme.Colors.primary : AppTheme.Colors.gray600)
        }
    }
}

#Preview {
    MainAppView()
}
