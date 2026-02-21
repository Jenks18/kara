import SwiftUI

// Reports Container View with Segmented Control (matching web app)
struct ReportsPage: View {
    @ObservedObject var dataStore: AppDataStore
    @State private var selectedTab = 0 // 0 = Expenses, 1 = Reports
    @State private var isScrolled = false

    init(dataStore: AppDataStore) {
        self.dataStore = dataStore
    }
    
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
                        Button(action: {
                            Task {
                                await dataStore.refreshExpenses(force: true)
                                await dataStore.refreshReports(force: true)
                            }
                        }) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 20))
                                .foregroundColor(AppTheme.Colors.primary)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 16)
                }
                .background {
                    ZStack {
                        AppTheme.Colors.cardSurface
                            .opacity(isScrolled ? 0 : 1)
                        Rectangle()
                            .fill(.ultraThinMaterial)
                            .opacity(isScrolled ? 1 : 0)
                    }
                    .ignoresSafeArea(edges: .top)
                    .animation(.easeInOut(duration: 0.2), value: isScrolled)
                }
                .shadow(color: .black.opacity(isScrolled ? 0.12 : 0.04), radius: isScrolled ? 6 : 1, y: 1)
                .animation(.easeInOut(duration: 0.2), value: isScrolled)
                
                // Summary card
                SummaryCard(
                    total: dataStore.expenses.reduce(0) { $0 + $1.amount },
                    verifiedCount: dataStore.expenses.filter { $0.kra_verified == true }.count
                )
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                
                // Themed switcher
                EmeraldSegmentedControl(selection: $selectedTab, titles: ["Expenses", "Reports"])
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                
                // Content based on selected tab
                if selectedTab == 0 {
                    ExpensesListView(expenses: dataStore.expenses, isLoading: dataStore.isLoadingExpenses, isScrolled: $isScrolled)
                } else {
                    ReportsAnalyticsView(reports: dataStore.reports, isLoading: dataStore.isLoadingReports, isScrolled: $isScrolled)
                }
            }
        }
        .onChange(of: selectedTab) { _, _ in
            isScrolled = false
        }
        .onAppear {
            // Apply deep-link subtab set by HomePage "View All Reports" button.
            if let tab = dataStore.reportsDeepLinkSubTab {
                selectedTab = tab
                dataStore.reportsDeepLinkSubTab = nil
            }
        }
        .task {
            // Per-screen data load — matches Android ReportsViewModel.init pattern.
            // Debounce in AppDataStore prevents redundant calls.
            await dataStore.refreshExpenses()
            await dataStore.refreshReports()
        }
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
                Text(CurrencyFormatter.shared.formatSimple(total))
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
    @Binding var isScrolled: Bool
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(expenses) { expense in
                    NavigationLink(destination: ExpenseDetailView(expense: expense)) {
                        ExpenseCardView(expense: expense)
                    }
                    .buttonStyle(.plain) // Prevents default link styling
                }
            }
            .padding(16)
            .padding(.bottom, 16)
        }
        .onScrollGeometryChange(for: Bool.self) { geo in
            geo.contentOffset.y > 8
        } action: { _, scrolled in
            isScrolled = scrolled
        }
    }
}

// Individual Expense Card
struct ExpenseCardView: View {
    let expense: ExpenseItem
    @State private var isAnimating = false
    
    /// Whether this item needs user attention
    private var needsReview: Bool {
        expense.processing_status == "needs_review" || expense.processing_status == "error"
    }
    
    private var isScanning: Bool {
        expense.processing_status == "scanning"
    }
    
    /// Merchant/amount colour: blue normally, orange when review needed, gray when scanning
    private var accentColor: Color {
        if isScanning { return .gray.opacity(0.6) }
        if needsReview { return .orange }
        return AppTheme.Colors.primary
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // ── Main row: icon · merchant+meta · amount+KRA ──────────
            HStack(alignment: .top, spacing: 12) {
                // Receipt thumbnail or category icon
                if let imageUrl = expense.image_url, let url = URL(string: imageUrl), !imageUrl.isEmpty {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .overlay(
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            )
                    }
                    .frame(width: 36, height: 36)
                    .cornerRadius(8)
                    .clipped()
                } else {
                    Image(systemName: isScanning ? "arrow.clockwise" : "doc.text")
                        .font(.system(size: 18))
                        .foregroundColor(isScanning ? .gray : AppTheme.Colors.primary)
                        .frame(width: 36, height: 36)
                        .background(AppTheme.Colors.blueBadgeBg)
                        .cornerRadius(8)
                        .rotationEffect(.degrees(isAnimating && isScanning ? 360 : 0))
                        .animation(isScanning ? Animation.linear(duration: 1.5).repeatForever(autoreverses: false) : .default, value: isAnimating)
                        .onAppear { if isScanning { isAnimating = true } }
                }
                
                // Merchant + category/date
                VStack(alignment: .leading, spacing: 3) {
                    Text(expense.merchant_name ?? expense.description ?? "Expense")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(accentColor)
                        .lineLimit(1)
                    
                    HStack(spacing: 6) {
                        Text(expense.category.capitalized)
                            .font(.system(size: 12))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                        
                        Text("·")
                            .font(.system(size: 12))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                        
                        Text(formatDate(expense.transaction_date ?? expense.created_at))
                            .font(.system(size: 12))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                }
                
                Spacer()
                
                // Amount + KRA pill
                VStack(alignment: .trailing, spacing: 4) {
                    if isScanning {
                        Text("Scanning...")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.gray.opacity(0.5))
                            .opacity(isAnimating ? 0.4 : 1.0)
                            .animation(Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
                    } else {
                        Text(CurrencyFormatter.shared.formatSimple(expense.amount))
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(accentColor)
                    }
                    
                    if expense.kra_verified == true {
                        HStack(spacing: 3) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 9))
                            Text("KRA")
                                .font(.system(size: 10, weight: .semibold))
                        }
                        .foregroundColor(AppTheme.Colors.primary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(AppTheme.Colors.blueBadgeBg)
                        .cornerRadius(6)
                    }
                }
            }
            
            // ── Review warning banner ────────────────────────────────
            if needsReview {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.system(size: 13))
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Please Review")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.orange)
                        Text("Some fields may need correction.")
                            .font(.system(size: 11))
                            .foregroundColor(.orange.opacity(0.8))
                    }
                    Spacer()
                }
                .padding(8)
                .background(Color.orange.opacity(0.08))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.orange.opacity(0.25), lineWidth: 1)
                )
            }
            
            // ── Scanning indicator ───────────────────────────────────
            if isScanning {
                HStack(spacing: 6) {
                    Circle()
                        .fill(AppTheme.Colors.green500)
                        .frame(width: 6, height: 6)
                        .opacity(isAnimating ? 0.3 : 1.0)
                        .animation(Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
                    Text("Scanning receipt...")
                        .font(.system(size: 11))
                        .foregroundColor(AppTheme.Colors.green500)
                }
                .padding(8)
                .background(AppTheme.Colors.green500.opacity(0.08))
                .cornerRadius(8)
            }
        }
        .padding(14)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.06), radius: 3, y: 1)
    }
    
    private func formatDate(_ dateString: String?) -> String {
        guard let dateString = dateString else { return "" }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = iso.date(from: dateString) ?? {
            let basic = ISO8601DateFormatter()
            return basic.date(from: dateString)
        }()
        guard let parsed = date else { return dateString.prefix(10).description }
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        fmt.timeStyle = .none
        return fmt.string(from: parsed)
    }
}

// MARK: - Reports Tab (Analytics View)
struct ReportsAnalyticsView: View {
    let reports: [ExpenseReport]
    let isLoading: Bool
    @Binding var isScrolled: Bool
    
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
        .onScrollGeometryChange(for: Bool.self) { geo in
            geo.contentOffset.y > 8
        } action: { _, scrolled in
            isScrolled = scrolled
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
                        .foregroundColor(AppTheme.Colors.primary)
                    Text(report.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.black)
                    Spacer()
                }
                
                // Status and details row
                HStack(spacing: 12) {
                    if report.status.lowercased() != "draft" {
                        Text(report.status.capitalized)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(statusColor(for: report.status))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(statusColor(for: report.status).opacity(0.15))
                            .cornerRadius(8)
                        
                        Text("•")
                            .foregroundColor(.gray)
                    }
                    
                    Text("\(report.displayItemsCount) expenses")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                
                Text("•")
                    .foregroundColor(.gray)
                
                Text(formatDate(report.created_at))
                    .font(.system(size: 13))
                    .foregroundColor(.gray)
            }
            
            // Receipt thumbnails — prefer thumbnails from mobile endpoint,
            // fall back to items array from detail/web endpoint
            let thumbUrls: [String] = {
                if let t = report.thumbnails, !t.isEmpty { return Array(t.prefix(3)) }
                if let items = report.items {
                    return items.prefix(3).compactMap { $0.image_url }.filter { !$0.isEmpty }
                }
                return []
            }()
            
            if !thumbUrls.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(thumbUrls.enumerated()), id: \.offset) { _, urlStr in
                            AsyncImage(url: URL(string: urlStr)) { image in
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
                .foregroundColor(AppTheme.Colors.primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(AppTheme.Colors.blueBadgeBg)
                .cornerRadius(12)
                
                Spacer()
                
                Text(CurrencyFormatter.shared.formatSimple(report.total_amount))
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.black)
            }
        }
        .padding(16)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
        }
    }
    
    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "draft":
            return Color.gray
        case "submitted":
            return AppTheme.Colors.primary
        case "approved":
            return AppTheme.Colors.primary
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
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .none
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}

