import SwiftUI

// Placeholder pages - we'll build these next

struct CreateExpensePage: View {
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.96, green: 0.99, blue: 0.97),
                        Color(red: 0.94, green: 0.99, blue: 0.95),
                        Color(red: 0.96, green: 0.99, blue: 0.97)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                Text("Create Expense")
                    .font(.system(size: 24, weight: .bold))
            }
        }
    }
}

struct WorkspacesPage: View {
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.96, green: 0.99, blue: 0.97),
                        Color(red: 0.94, green: 0.99, blue: 0.95),
                        Color(red: 0.96, green: 0.99, blue: 0.97)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                Text("Workspaces")
                    .font(.system(size: 24, weight: .bold))
            }
        }
    }
}

struct AccountPage: View {
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.96, green: 0.99, blue: 0.97),
                        Color(red: 0.94, green: 0.99, blue: 0.95),
                        Color(red: 0.96, green: 0.99, blue: 0.97)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                Text("Account")
                    .font(.system(size: 24, weight: .bold))
            }
        }
    }
}
