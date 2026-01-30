import SwiftUI

// Main app with tab navigation matching web app
// Default to Reports (Inbox hidden as chat not implemented)
struct MainAppView: View {
    @State private var selectedTab: BottomNavView.Tab = .reports
    
    var body: some View {
        ZStack {
            // Content area
            Group {
                switch selectedTab {
                // case .inbox:  // Hidden - chat not implemented
                //     HomePage()
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
