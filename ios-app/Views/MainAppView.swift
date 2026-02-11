import SwiftUI

// Main app with tab navigation matching web app
// Default to Reports (Inbox hidden as chat not implemented)
struct MainAppView: View {
    var body: some View {
        TabView {
            ReportsPage()
                .tabItem {
                    Label("Reports", systemImage: "doc.text.fill")
                }
            
            CreateExpensePage()
                .tabItem {
                    Label("Create", systemImage: "plus.circle.fill")
                }
            
            WorkspacesPage()
                .tabItem {
                    Label("Workspaces", systemImage: "briefcase.fill")
                }
            
            AccountPage()
                .tabItem {
                    Label("Account", systemImage: "person.fill")
                }
        }
        .tint(Color(red: 0.063, green: 0.725, blue: 0.506))
    }
}

#Preview {
    MainAppView()
}
