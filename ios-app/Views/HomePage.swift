import SwiftUI

struct HomePage: View {
    @State private var expenses: [ExpenseItem] = []
    @State private var reports: [ExpenseReport] = []
    @State private var isLoading = false
    @State private var totalExpenses: Double = 0
    @State private var pendingCount: Int = 0
    @State private var submittedReportsCount: Int = 0
    
    var body: some View {
        ZStack {
            // Centralized blue gradient background
            AppTheme.backgroundView()
            
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 0) {
                    Color.white
                        .frame(height: 0)
                        .ignoresSafeArea(edges: .top)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Dashboard")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(AppTheme.Colors.textPrimary)
                        Text("Welcome back. Here's your expense overview.")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
                .background(Color.white)
                .overlay(
                    Rectangle()
                        .fill(Color(red: 0.9, green: 0.9, blue: 0.9))
                        .frame(height: 1),
                    alignment: .bottom
                )
                
                // Content
                if isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Total Expenses Card
                            StatCardView(
                                icon: "dollarsign.circle.fill",
                                iconColor: AppTheme.Colors.primary,
                                iconBackground: AppTheme.Colors.blue50,
                                value: formatCurrency(totalExpenses),
                                label: "Total Expenses",
                                sublabel: "This month",
                                trend: "+12.5%",
                                trendUp: true
                            )
                            
                            // Pending Approval Card
                            StatCardView(
                                icon: "clock.fill",
                                iconColor: AppTheme.Colors.yellow500,
                                iconBackground: AppTheme.Colors.yellowBadgeBg,
                                value: "\(pendingCount)",
                                label: "Pending Approval",
                                sublabel: "Awaiting review",
                                trend: pendingCount > 0 ? "-2" : nil,
                                trendUp: false
                            )
                            
                            // Reports Submitted Card
                            StatCardView(
                                icon: "doc.text.fill",
                                iconColor: AppTheme.Colors.primary,
                                iconBackground: AppTheme.Colors.blueBadgeBg,
                                value: "\(submittedReportsCount)",
                                label: "Reports Submitted",
                                sublabel: "This month",
                                trend: "+1",
                                trendUp: true
                            )
                            
                            // Recent Expenses
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Recent Expenses")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                    Spacer()
                                    Text("View All")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(AppTheme.Colors.primary)
                                }
                                .padding(.horizontal, 20)
                                .padding(.top, 20)
                                
                                if expenses.isEmpty {
                                    Text("No expenses yet. Start by scanning a receipt!")
                                        .font(.system(size: 14))
                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                        .padding(.horizontal, 20)
                                        .padding(.bottom, 20)
                                } else {
                                    ForEach(expenses.prefix(5)) { expense in
                                        HStack {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(expense.merchant_name ?? "Receipt")
                                                    .font(.system(size: 15, weight: .medium))
                                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                                Text(expense.category.capitalized)
                                                    .font(.system(size: 12))
                                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                            }
                                            Spacer()
                                            Text(formatCurrency(expense.amount))
                                                .font(.system(size: 15, weight: .semibold))
                                                .foregroundColor(AppTheme.Colors.textPrimary)
                                        }
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 4)
                                    }
                                    .padding(.bottom, 12)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white)
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)
                            
                            // Active Reports
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Active Reports")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                    Spacer()
                                    Text("View All")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(AppTheme.Colors.primary)
                                }
                                .padding(.horizontal, 20)
                                .padding(.top, 20)
                                
                                if reports.isEmpty {
                                    Text("No active reports")
                                        .font(.system(size: 14))
                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                        .padding(.horizontal, 20)
                                        .padding(.bottom, 20)
                                } else {
                                    ForEach(reports.prefix(3)) { report in
                                        HStack {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(report.title)
                                                    .font(.system(size: 15, weight: .medium))
                                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                                Text(report.status.capitalized)
                                                    .font(.system(size: 12))
                                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                            }
                                            Spacer()
                                            Text(formatCurrency(report.total_amount))
                                                .font(.system(size: 15, weight: .semibold))
                                                .foregroundColor(AppTheme.Colors.textPrimary)
                                        }
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 4)
                                    }
                                    .padding(.bottom, 12)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white)
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)
                            
                            // Spending by Category
                            VStack(alignment: .leading, spacing: 12) {
                                HStack(spacing: 8) {
                                    Image(systemName: "chart.line.uptrend.xyaxis")
                                        .font(.system(size: 18))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                    Text("Spending by Category")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                }
                                .padding(.horizontal, 20)
                                .padding(.top, 20)
                                
                                Text("No spending data available")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppTheme.Colors.textSecondary)
                                    .padding(.horizontal, 20)
                                    .padding(.bottom, 20)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white)
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)
                        }
                        .padding(16)
                        .padding(.bottom, 100) // Space for tab bar
                    }
                }
            }
        }
        .onAppear {
            loadData()
        }
    }
    
    func loadData() {
        isLoading = true
        Task {
            do {
                async let expensesTask = API.shared.fetchExpenses()
                async let reportsTask = API.shared.fetchReports()
                
                let (fetchedExpenses, fetchedReports) = try await (expensesTask, reportsTask)
                
                await MainActor.run {
                    self.expenses = fetchedExpenses
                    self.reports = fetchedReports
                    
                    // Calculate stats from real data
                    self.totalExpenses = fetchedExpenses.reduce(0) { $0 + $1.amount }
                    self.pendingCount = fetchedExpenses.filter { $0.processing_status == "needs_review" || $0.processing_status == "scanning" }.count
                    self.submittedReportsCount = fetchedReports.filter { $0.status == "submitted" }.count
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    print("Error loading dashboard: \(error)")
                    self.isLoading = false
                }
            }
        }
    }
    
    func formatCurrency(_ amount: Double) -> String {
        return CurrencyFormatter.shared.formatSimple(amount)
    }
}

struct StatCardView: View {
    let icon: String
    let iconColor: Color
    let iconBackground: Color
    let value: String
    let label: String
    let sublabel: String
    let trend: String?
    let trendUp: Bool
    
    var body: some View {
        HStack(alignment: .top) {
            HStack(alignment: .top, spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(iconBackground)
                        .frame(width: 56, height: 56)
                    Image(systemName: icon)
                        .font(.system(size: 28))
                        .foregroundColor(iconColor)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(value)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(AppTheme.Colors.textPrimary)
                    Text(sublabel)
                        .font(.system(size: 12))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                    Text(label)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(AppTheme.Colors.textPrimary)
                }
            }
            
            Spacer()
            
            if let trend = trend {
                HStack(spacing: 4) {
                    Image(systemName: trendUp ? "arrow.up.right" : "arrow.down.right")
                        .font(.system(size: 12))
                        .foregroundColor(trendUp ? AppTheme.Colors.primary : AppTheme.Colors.red500)
                    Text(trend)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(trendUp ? AppTheme.Colors.primary : AppTheme.Colors.red500)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)
    }
}

#Preview {
    HomePage()
}
