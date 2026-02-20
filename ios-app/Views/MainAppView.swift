import SwiftUI

// Main app with 5-tab navigation with elevated center scan button
// Tabs: Home, Reports, [Scan], Workspaces, Account
struct MainAppView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Content
            Group {
                switch selectedTab {
                case 0:
                    HomePage()
                case 1:
                    ReportsPage()
                case 2:
                    CreateExpensePage()
                case 3:
                    WorkspacesPage()
                case 4:
                    AccountPage()
                default:
                    HomePage()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Custom Tab Bar
            CustomTabBar(selectedTab: $selectedTab)
        }
        .ignoresSafeArea(.keyboard)
    }
}

struct CustomTabBar: View {
    @Binding var selectedTab: Int
    
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
            
            TabBarButton(icon: "person.fill", title: "Account", isSelected: selectedTab == 4) {
                selectedTab = 4
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(
            Color.white
                .shadow(color: Color.black.opacity(0.08), radius: 8, y: -2)
        )
        .overlay(alignment: .top) {
            // Elevated scan button (matches Android raised center FAB)
            Button {
                selectedTab = 2
            } label: {
                Image(systemName: "doc.viewfinder.fill")
                    .font(.system(size: 28, weight: .semibold))
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
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 22))
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
