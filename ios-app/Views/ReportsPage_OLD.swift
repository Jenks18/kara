import SwiftUI

struct ReportsPage: View {
    @State private var selectedTab: ReportTab = .expenses
    @State private var searchText = ""
    @State private var expenses: [ExpenseItem] = []
    @State private var reports: [ExpenseReport] = []
    @State private var isLoading = true
    
    enum ReportTab: String, CaseIterable {
        case expenses = "Expenses"
        case reports = "Reports"
    }
    
    var body: some View {
        ZStack {
            // Emerald gradient background matching HomePage
            LinearGradient(
                colors: [
                    Color(red: 0.925, green: 0.992, blue: 0.961), // emerald-50
                    Color(red: 0.937, green: 0.992, blue: 0.937), // green-50
                    Color(red: 0.820, green: 0.980, blue: 0.898)  // emerald-100
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header - white background matching HomePage
                VStack(spacing: 0) {
                    HStack {
                        Text("Reports")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(Color(red: 0.11, green: 0.11, blue: 0.11))
                        Spacer()
                        Button(action: {}) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 24))
                                .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
                        }
                        .frame(minWidth: 44, minHeight: 44)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
                .background(Color.white)
                .overlay(
                    Rectangle()
                        .fill(Color(red: 0.654, green: 0.906, blue: 0.816)) // emerald-200
                        .frame(height: 1),
                    alignment: .bottom
                )
                
                // Tab selector with emerald theme
                HStack(spacing: 0) {
                    ForEach(ReportTab.allCases, id: \.self) { tab in
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedTab = tab
                            }
                        }) {
                            VStack(spacing: 8) {
                                Text(tab.rawValue)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(selectedTab == tab ?
                                        Color(red: 0.063, green: 0.725, blue: 0.506) : // emerald-600
                                        Color(red: 0.459, green: 0.459, blue: 0.459)) // gray-600
                                
                                Rectangle()
                                    .fill(selectedTab == tab ?
                                        Color(red: 0.063, green: 0.725, blue: 0.506) : Color.clear)
                                    .frame(height: 3)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .background(Color.white)
                
                // Content
                if isLoading {
                    Spacer()
                    ProgressView()
                        .tint(Color(red: 0.063, green: 0.725, blue: 0.506))
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            if selectedTab == .expenses {
                                ExpensesListView(expenses: filteredExpenses)
                            } else {
                                ReportsListView(reports: filteredReports)
                            }
                        }
                        .padding(16)
                        .padding(.bottom, 80)
                    }
                    .refreshable {
                        await loadData()
                    }
                }
            }
        }
        .onAppear {
            Task {
                await loadData()
            }
        }
    }
    
    private var filteredExpenses: [ExpenseItem] {
        if searchText.isEmpty {
            return expenses
        }
        return expenses.filter { expense in
            expense.description?.localizedCaseInsensitiveContains(searchText) ?? false ||
            expense.merchant_name?.localizedCaseInsensitiveContains(searchText) ?? false
        }
    }
    
    private var filteredReports: [ExpenseReport] {
        if searchText.isEmpty {
            return reports
        }
        return reports.filter { report in
            report.title.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    private func loadData() async {
        isLoading = true
        
        do {
            // Fetch real data from API
            async let expenseItemsTask = API.shared.fetchExpenses()
            async let reportsTask = API.shared.fetchReports()
            
            let (expenseItems, apiReports) = try await (expenseItemsTask, reportsTask)
            
            // Use ExpenseItem directly
            expenses = expenseItems
            
            // Use ExpenseReport directly
            reports = apiReports
        } catch {
            print("Error loading data: \(error)")
            // Show error to user
        }
        
        isLoading = false
    }
}

// Expenses list view
struct ExpensesListView: View {
    let expenses: [ExpenseItem]
    
    var body: some View {
        LazyVStack(spacing: 12) {
            if expenses.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "receipt")
                        .font(.system(size: 60))
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506).opacity(0.3))
                    
                    Text("No expenses yet")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(Color(red: 0.11, green: 0.11, blue: 0.11))
                    
                    Text("Scan your first receipt to get started")
                        .font(.system(size: 15))
                        .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 60)
            } else {
                ForEach(expenses) { expense in
                    ExpenseCardView(expense: expense)
                }
            }
        }
    }
}

// Reports list view
struct ReportsListView: View {
    let reports: [ExpenseReport]
    
    var body: some View {
        LazyVStack(spacing: 12) {
            if reports.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "folder")
                        .font(.system(size: 60))
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506).opacity(0.3))
                    
                    Text("No reports yet")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(Color(red: 0.11, green: 0.11, blue: 0.11))
                    
                    Text("Create your first expense report")
                        .font(.system(size: 15))
                        .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 60)
            } else {
                ForEach(reports) { report in
                    ReportCardView(report: report)
                }
            }
        }
    }
}

// Individual expense card with emerald theme
struct ExpenseCardView: View {
    let expense: ExpenseItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(expense.merchant_name ?? "Unknown Merchant")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(Color(red: 0.11, green: 0.11, blue: 0.11))
                    
                    if let description = expense.description {
                        Text(description)
                            .font(.system(size: 14))
                            .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("KES \(String(format: "%.2f", expense.amount))")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                    
                    if expense.kra_verified == true {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 10))
                            Text("KRA")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(red: 0.063, green: 0.725, blue: 0.506).opacity(0.1))
                        .cornerRadius(8)
                    }
                }
            }
            
            Divider()
                .background(Color(red: 0.459, green: 0.459, blue: 0.459).opacity(0.2))
            
            HStack {
                Text(expense.category)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color(red: 0.820, green: 0.980, blue: 0.898))
                    .cornerRadius(12)
                
                Spacer()
                
                Text(expense.formattedDate)
                    .font(.system(size: 13))
                    .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
    }
}

// Report card with emerald theme
struct ReportCardView: View {
    let report: ExpenseReport
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(report.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(Color(red: 0.11, green: 0.11, blue: 0.11))
                    
                    Text("\(report.items?.count ?? 0) expense\((report.items?.count ?? 0) != 1 ? "s" : "")")
                        .font(.system(size: 14))
                        .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("KES \(String(format: "%.2f", report.total_amount))")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                    
                    Text(report.status.capitalized)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(statusColor(for: report.status))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(statusColor(for: report.status).opacity(0.15))
                        .cornerRadius(8)
                }
            }
            
            Divider()
                .background(Color(red: 0.459, green: 0.459, blue: 0.459).opacity(0.2))
            
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "building.2")
                        .font(.system(size: 11))
                    Text(report.workspace_name)
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color(red: 0.820, green: 0.980, blue: 0.898))
                .cornerRadius(12)
                
                Spacer()
                
                Text(report.formattedDate)
                    .font(.system(size: 13))
                    .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
    }
    
    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "draft":
            return Color(red: 0.459, green: 0.459, blue: 0.459) // gray
        case "submitted":
            return Color(red: 0.063, green: 0.725, blue: 0.506) // emerald
        case "approved":
            return Color(red: 0.063, green: 0.725, blue: 0.506) // emerald
        case "rejected":
            return Color.red
        default:
            return Color(red: 0.459, green: 0.459, blue: 0.459)
        }
    }
}

#Preview {
    ReportsPage()
}
