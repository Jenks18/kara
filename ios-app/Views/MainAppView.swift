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
            
            // Center scan button (elevated)
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
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Divider()
        }
        .overlay(alignment: .top) {
            // Elevated scan button
            Button {
                selectedTab = 2
            } label: {
                Image(systemName: "doc.viewfinder.fill")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
                    .background(
                        LinearGradient(
                            colors: [
                                Color(red: 0.0, green: 0.4, blue: 1.0),
                                Color(red: 0.0, green: 0.32, blue: 0.8)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(Circle())
                    .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
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
                    .font(.system(size: 24))
                Text(title)
                    .font(.system(size: 12, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .foregroundStyle(isSelected ? Color(red: 0.0, green: 0.4, blue: 1.0) : .gray)
        }
    }
}

#Preview {
    MainAppView()
}
