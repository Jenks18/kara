import SwiftUI

// Updated main app with authentication
struct ImprovedMainApp: View {
    @StateObject private var authManager = AuthManager.shared
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                AuthenticatedApp()
            } else {
                SignInView()
            }
        }
        .environmentObject(authManager)
    }
}

// Authenticated app with tab navigation
struct AuthenticatedApp: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedTab: BottomNavView.Tab = .inbox
    
    var body: some View {
        ZStack {
            // Content area
            Group {
                switch selectedTab {
                case .inbox:
                    ImprovedHomePage()
                case .reports:
                    ImprovedReportsPage()
                case .create:
                    CreateExpensePage()
                case .workspaces:
                    WorkspacesPage()
                case .account:
                    ImprovedAccountPage()
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

// Improved Reports Page with native design
struct ImprovedReportsPage: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var expenses: [ExpenseItem] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var selectedFilter: FilterOption = .all
    
    enum FilterOption: String, CaseIterable {
        case all = "All"
        case scanning = "Scanning"
        case processed = "Processed"
        case needsReview = "Needs Review"
        case error = "Error"
    }
    
    var filteredExpenses: [ExpenseItem] {
        var filtered = expenses
        
        switch selectedFilter {
        case .all: break
        case .scanning:
            filtered = filtered.filter { $0.processing_status == "scanning" }
        case .processed:
            filtered = filtered.filter { $0.processing_status == "processed" }
        case .needsReview:
            filtered = filtered.filter { $0.processing_status == "needs_review" }
        case .error:
            filtered = filtered.filter { $0.processing_status == "error" }
        }
        
        if !searchText.isEmpty {
            filtered = filtered.filter { expense in
                (expense.merchant_name?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                expense.category.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return filtered
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Search bar
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                            .font(.system(size: 16))
                        
                        TextField("Search expenses...", text: $searchText)
                            .font(.system(size: 17))
                    }
                    .padding(14)
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 8)
                    
                    // Filter chips
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(FilterOption.allCases, id: \.self) { filter in
                                FilterChip(
                                    title: filter.rawValue,
                                    isSelected: selectedFilter == filter,
                                    action: { selectedFilter = filter }
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 12)
                    
                    // Content
                    if isLoading {
                        Spacer()
                        ProgressView()
                            .scaleEffect(1.2)
                            .tint(Color(red: 0.2, green: 0.7, blue: 0.4))
                        Spacer()
                    } else if let error = errorMessage {
                        Spacer()
                        VStack(spacing: 16) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 48))
                                .foregroundColor(.orange)
                            
                            Text(error)
                                .font(.system(size: 15))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                        Spacer()
                    } else if filteredExpenses.isEmpty {
                        Spacer()
                        VStack(spacing: 16) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 56))
                                .foregroundColor(.gray.opacity(0.5))
                            
                            Text("No expenses found")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.primary)
                            
                            Text("Try adjusting your filters")
                                .font(.system(size: 15))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(filteredExpenses) { expense in
                                    NativeExpenseItemCard(expense: expense)
                                }
                            }
                            .padding(16)
                            .padding(.bottom, 80)
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Reports")
                        .font(.system(size: 28, weight: .bold))
                }
            }
        }
        .onAppear {
            loadExpenses()
        }
    }
    
    private func loadExpenses() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let fetchedExpenses = try await APIClient.shared.fetchExpenses()
                await MainActor.run {
                    expenses = fetchedExpenses
                    isLoading = false
                }
            } catch let error as APIError {
                await MainActor.run {
                    if case .unauthorized = error {
                        authManager.signOut()
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to load expenses"
                    isLoading = false
                }
            }
        }
    }
}

// Native expense item card
struct NativeExpenseItemCard: View {
    let expense: ExpenseItem
    
    var body: some View {
        HStack(spacing: 14) {
            // Receipt thumbnail
            AsyncImage(url: URL(string: expense.image_url)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.15))
                    .overlay(
                        ProgressView()
                            .tint(.gray)
                    )
            }
            .frame(width: 70, height: 85)
            .cornerRadius(10)
            .clipped()
            
            // Expense details
            VStack(alignment: .leading, spacing: 7) {
                Text(expense.merchant_name ?? "Unknown Merchant")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                
                Text(expense.category)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                
                StatusBadge(status: expense.processing_status)
            }
            
            Spacer()
            
            // Amount
            Text("KES \(Int(expense.amount).formatted())")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundColor(.primary)
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}

#Preview {
    ImprovedMainApp()
}
