import SwiftUI

// Reports Container View with Segmented Control (matching web app)
struct ReportsPage: View {
    @State private var selectedTab = 0 // 0 = Expenses, 1 = Reports
    @State private var searchText = ""
    @State private var expenses: [ExpenseItem] = []
    @State private var reports: [ExpenseReport] = []
    @State private var isLoading = true
    
    var body: some View {
        ZStack {
            // Light emerald gradient background
            LinearGradient(
                colors: [
                    Color(red: 0.925, green: 0.992, blue: 0.961),
                    Color(red: 0.937, green: 0.992, blue: 0.937),
                    Color(red: 0.820, green: 0.980, blue: 0.898)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header - White background
                VStack(spacing: 0) {
                    HStack {
                        Text("Reports")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.black)
                        Spacer()
                        Button(action: {}) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 20))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 16)
                }
                .background(Color.white)
                
                // Search Bar - White background
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Search receipts...", text: $searchText)
                        .foregroundColor(.black)
                }
                .padding(12)
                .background(Color.white)
                .cornerRadius(12)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                
                // Segmented Control (matching web app)
                Picker("Tab", selection: $selectedTab) {
                    Text("Expenses").tag(0)
                    Text("Reports").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
                
                // Content based on selected tab
                if selectedTab == 0 {
                    ExpensesListView(expenses: expenses, searchText: searchText, isLoading: isLoading)
                } else {
                    ReportsAnalyticsView(reports: reports, isLoading: isLoading)
                }
            }
        }
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        isLoading = true
        do {
            async let expensesTask = API.shared.fetchExpenses()
            async let reportsTask = API.shared.fetchReports()
            
            expenses = try await expensesTask
            reports = try await reportsTask
        } catch {
            print("Error loading data: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Expenses Tab (List View)
struct ExpensesListView: View {
    let expenses: [ExpenseItem]
    let searchText: String
    let isLoading: Bool
    
    var filteredExpenses: [ExpenseItem] {
        if searchText.isEmpty {
            return expenses
        }
        return expenses.filter {
            ($0.description?.lowercased().contains(searchText.lowercased()) ?? false) ||
            ($0.merchant_name?.lowercased().contains(searchText.lowercased()) ?? false)
        }
    }
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredExpenses) { expense in
                    ExpenseCardView(expense: expense)
                }
            }
            .padding(16)
            .padding(.bottom, 80) // Space for tab bar
        }
    }
}

// Individual Expense Card
struct ExpenseCardView: View {
    let expense: ExpenseItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Top row: Icon, Description, Amount
            HStack(alignment: .top) {
                Image(systemName: "doc.text")
                    .font(.system(size: 20))
                    .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                    .frame(width: 40, height: 40)
                    .background(Color(red: 0.820, green: 0.980, blue: 0.898))
                    .cornerRadius(8)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(expense.description ?? "Expense")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.black)
                    
                    HStack(spacing: 8) {
                        Text(expense.category.capitalized)
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                        
                        Text("•")
                            .foregroundColor(.gray)
                        
                        Text(formatDate(expense.transaction_date))
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("KES \(String(format: "%.2f", expense.amount))")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                    
                    // KRA Verified Pill (keep this!)
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
                        .background(Color(red: 0.820, green: 0.980, blue: 0.898))
                        .cornerRadius(8)
                    }
                }
            }
            
            // Receipt image if available
            if !expense.image_url.isEmpty {
                AsyncImage(url: URL(string: expense.image_url)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                }
                .frame(height: 120)
                .cornerRadius(8)
                .clipped()
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
    }
    
    private func formatDate(_ dateString: String?) -> String {
        guard let dateString = dateString else { return "N/A" }
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "MMM d"
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}

// MARK: - Reports Tab (Analytics View)
struct ReportsAnalyticsView: View {
    let reports: [ExpenseReport]
    let isLoading: Bool
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(reports) { report in
                    ReportCardView(report: report)
                }
            }
            .padding(16)
            .padding(.bottom, 80) // Space for tab bar
        }
    }
}

// Individual Report Card
struct ReportCardView: View {
    let report: ExpenseReport
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title row
            HStack {
                Image(systemName: "doc.text")
                    .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
                Text(report.title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.black)
                Spacer()
            }
            
            // Status and details row
            HStack(spacing: 12) {
                Text(report.status.capitalized)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(statusColor(for: report.status))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(statusColor(for: report.status).opacity(0.15))
                    .cornerRadius(8)
                
                Text("•")
                    .foregroundColor(.gray)
                
                Text("\(report.items?.count ?? 0) expenses")
                    .font(.system(size: 13))
                    .foregroundColor(.gray)
                
                Text("•")
                    .foregroundColor(.gray)
                
                Text(formatDate(report.created_at))
                    .font(.system(size: 13))
                    .foregroundColor(.gray)
            }
            
            // Receipt thumbnails if available
            if let items = report.items, !items.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(items.prefix(3).enumerated()), id: \.element.id) { index, item in
                            AsyncImage(url: URL(string: item.image_url)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                            }
                            .frame(width: 80, height: 96)
                            .cornerRadius(8)
                            .clipped()
                        }
                    }
                }
            }
            
            Divider()
            
            // Bottom row
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
                
                Text("KES \(String(format: "%.2f", report.total_amount))")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.black)
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
            return Color.gray
        case "submitted":
            return Color(red: 0.063, green: 0.725, blue: 0.506)
        case "approved":
            return Color(red: 0.063, green: 0.725, blue: 0.506)
        case "rejected":
            return Color.red
        default:
            return Color.gray
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "MMM d"
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}

