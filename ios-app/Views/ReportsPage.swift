import SwiftUI

// Reports Container View with Segmented Control (matching web app)
struct ReportsPage: View {
    @State private var selectedTab = 0 // 0 = Expenses, 1 = Reports
    @State private var expenses: [ExpenseItem] = []
    @State private var reports: [ExpenseReport] = []
    @State private var isLoading = true
    
    var body: some View {
        ZStack {
            // Centralized emerald background
            EmeraldTheme.background()
            
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
                
                // Summary card
                SummaryCard(
                    total: expenses.reduce(0) { $0 + $1.amount },
                    verifiedCount: expenses.filter { $0.kra_verified == true }.count
                )
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                
                // Themed switcher
                EmeraldSegmentedControl(selection: $selectedTab, titles: ["Expenses", "Reports"])
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                
                // Content based on selected tab
                if selectedTab == 0 {
                    ExpensesListView(expenses: expenses, isLoading: isLoading)
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

// Themed summary card for Reports page
struct SummaryCard: View {
    let total: Double
    let verifiedCount: Int
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Total Spent")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))
                Text("KES \(String(format: "%.2f", total))")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Text("KRA Verified")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.seal.fill")
                    Text("\(verifiedCount)")
                }
                .foregroundColor(.white)
                .font(.system(size: 16, weight: .semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.white.opacity(0.2))
                .cornerRadius(10)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [EmeraldTheme.primary, EmeraldTheme.primaryDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.08), radius: 6, y: 2)
    }
}

// MARK: - Expenses Tab (List View)
struct ExpensesListView: View {
    let expenses: [ExpenseItem]
    let isLoading: Bool
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(expenses) { expense in
                    ExpenseCardView(expense: expense)
                }
            }
            .padding(16)
            .padding(.bottom, 16)
        }
    }
}

// Individual Expense Card
struct ExpenseCardView: View {
    let expense: ExpenseItem
    @State private var isAnimating = false
    
    var statusColor: Color {
        switch expense.processing_status {
        case "processed": return .green
        case "scanning": return .gray
        case "needs_review": return .orange
        case "error": return .red
        default: return .gray
        }
    }
    
    var statusIcon: String {
        switch expense.processing_status {
        case "processed": return "checkmark.circle.fill"
        case "scanning": return "arrow.clockwise.circle.fill"
        case "needs_review": return "exclamationmark.triangle.fill"
        case "error": return "xmark.circle.fill"
        default: return "circle.fill"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Top row: Icon, Description, Amount
            HStack(alignment: .top) {
                Image(systemName: expense.processing_status == "scanning" ? "arrow.clockwise" : "doc.text")
                    .font(.system(size: 20))
                    .foregroundColor(expense.processing_status == "scanning" ? .gray : Color(red: 0.063, green: 0.725, blue: 0.506))
                    .frame(width: 40, height: 40)
                    .rotationEffect(.degrees(isAnimating && expense.processing_status == "scanning" ? 360 : 0))
                    .animation(expense.processing_status == "scanning" ? Animation.linear(duration: 1.5).repeatForever(autoreverses: false) : .default, value: isAnimating)
                    .onAppear {
                        if expense.processing_status == "scanning" {
                            isAnimating = true
                        }
                    }
                    .background(Color(red: 0.820, green: 0.980, blue: 0.898))
                    .cornerRadius(8)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(expense.merchant_name ?? expense.description ?? "Expense")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(expense.processing_status == "scanning" ? .gray.opacity(0.6) : (expense.processing_status == "needs_review" ? Color.orange : .black))
                    
                    HStack(spacing: 8) {
                        Text(expense.category.capitalized)
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                        
                        Text("•")
                            .foregroundColor(.gray)
                        
                        Text(formatDate(expense.created_at))
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    if expense.processing_status == "scanning" {
                        Text("Scanning...")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.gray.opacity(0.6))
                            .opacity(isAnimating ? 0.4 : 1.0)
                            .animation(Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
                    } else {
                        Text("KES \(String(format: "%.2f", expense.amount))")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(expense.processing_status == "needs_review" ? Color.orange : Color(red: 0.063, green: 0.725, blue: 0.506))
                    }
                    
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
            
            // Status badge (show for non-processed items)
            if expense.processing_status != "processed" {
                HStack(spacing: 4) {
                    Image(systemName: statusIcon)
                        .font(.system(size: 10))
                    Text(statusText)
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(statusColor)
                .cornerRadius(8)
            }
            
            // Review warning for needs_review status
            if expense.processing_status == "needs_review" {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.system(size: 14))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Please Review")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.orange)
                        Text("Some fields were unclear. Tap to edit if incorrect.")
                            .font(.system(size: 11))
                            .foregroundColor(.orange.opacity(0.8))
                    }
                    Spacer()
                }
                .padding(10)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                )
            }
            
            // Scanning indicator
            if expense.processing_status == "scanning" {
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                        .opacity(isAnimating ? 0.3 : 1.0)
                        .animation(Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
                    Text("Scanning receipt...")
                        .font(.system(size: 12))
                        .foregroundColor(Color.green)
                    Spacer()
                }
                .padding(10)
                .background(Color.green.opacity(0.1))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.green.opacity(0.3), lineWidth: 1)
                )
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
    }
    
    var statusText: String {
        switch expense.processing_status {
        case "processed": return "Processed"
        case "scanning": return "Scanning"
        case "needs_review": return "Review"
        case "error": return "Error"
        default: return expense.processing_status
        }
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
            .padding(.bottom, 16) // Space for tab bar
        }
    }
}

// Individual Report Card
struct ReportCardView: View {
    let report: ExpenseReport
    
    var body: some View {
        NavigationLink(destination: ReportDetailPage(reportId: report.id)) {
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

