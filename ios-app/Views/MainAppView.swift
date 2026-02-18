import SwiftUI

// Main app with 3-tab navigation matching Android app
// Tabs: Reports, Create, Account
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
