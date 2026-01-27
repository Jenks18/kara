import SwiftUI

// Main app with tab navigation matching web app
struct MainAppView: View {
    @State private var selectedTab: BottomNavView.Tab = .inbox
    
    var body: some View {
        ZStack {
            // Content area
            Group {
                switch selectedTab {
                case .inbox:
                    HomePage()
                case .reports:
                    ReportsPage()
                case .create:
                    CreateExpensePage()
                case .workspaces:
                    WorkspacesPage()
                case .account:
                    AccountPage()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Bottom navigation
            VStack {
                Spacer()
                BottomNavView(selectedTab: $selectedTab)
            }
            .ignoresSafeArea(.keyboard)
        }
    }
}

#Preview {
    MainAppView()
}
