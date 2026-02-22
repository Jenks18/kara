import SwiftUI

// MARK: - Shared category color helper
// Single source of truth used by both HomePage and SpendingByCategoryCard.
// DJB2 hash ensures deterministic colors across app launches (Swift's built-in
// hashValue is seeded per-process and must NOT be used for stable UX colors).
func categoryColorFor(_ category: String) -> Color {
    let palette: [Color] = [
        Color(hex: "#3B82F6"), // blue
        Color(hex: "#8B5CF6"), // purple
        Color(hex: "#F59E0B"), // amber
        Color(hex: "#10B981"), // green
        Color(hex: "#EC4899")  // pink
    ]
    switch category.lowercased() {
    case "fuel", "transport", "transportation", "commute": return palette[0]
    case "food", "meals", "dining", "groceries":           return palette[2]
    case "office", "supplies", "stationery", "equipment": return palette[3]
    case "travel", "accommodation", "hotel":               return palette[4]
    case "entertainment", "recreation", "subscriptions":  return palette[1]
    default:
        var h: UInt32 = 5381
        for byte in category.lowercased().utf8 { h = (h &* 33) &+ UInt32(byte) }
        return Color(hue: Double(h % 360) / 360.0, saturation: 0.65, brightness: 0.85)
    }
}

struct HomePage: View {
    @Binding var selectedTab: Int
    @ObservedObject var dataStore: AppDataStore

    @State private var isScrolled = false

    init(selectedTab: Binding<Int>, dataStore: AppDataStore) {
        _selectedTab = selectedTab
        self.dataStore = dataStore
    }

    var body: some View {
        ZStack {
            AppTheme.backgroundView()

            VStack(spacing: 0) {
                // ── Header ───────────────────────────────────────────
                VStack(spacing: 0) {
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
                .background {
                    ZStack {
                        AppTheme.Colors.cardSurface.opacity(isScrolled ? 0 : 1)
                        Rectangle().fill(.ultraThinMaterial).opacity(isScrolled ? 1 : 0)
                    }
                    .ignoresSafeArea(edges: .top)
                    .animation(.easeInOut(duration: 0.2), value: isScrolled)
                }
                .shadow(color: .black.opacity(isScrolled ? 0.12 : 0.04), radius: isScrolled ? 6 : 1, y: 1)
                .animation(.easeInOut(duration: 0.2), value: isScrolled)

                // ── Content ──────────────────────────────────────────
                if dataStore.isLoadingExpenses && dataStore.expenses.isEmpty {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Scroll offset probe (iOS 17-compatible)
                            GeometryReader { geo in
                                Color.clear.preference(
                                    key: ScrollOffsetPreferenceKey.self,
                                    value: geo.frame(in: .named("homeScroll")).minY
                                )
                            }
                            .frame(height: 0)

                            // ── Hero spending card ───────────────────
                            HeroSpendingCard(
                                totalThisMonth: dataStore.totalThisMonth,
                                trend: dataStore.monthOverMonthTrend,
                                receiptCountThisMonth: dataStore.receiptCountThisMonth,
                                totalAllTime: dataStore.totalAllTime
                            )
                        

                            // ── Stat pills row ───────────────────────
                            HStack(spacing: 12) {
                                StatPill(
                                    icon: "doc.text.fill",
                                    iconColor: AppTheme.Colors.primary,
                                    iconBg: AppTheme.Colors.blueBadgeBg,
                                    value: "\(dataStore.submittedReportsCount)",
                                    label: "Total Reports"
                                )
                                StatPill(
                                    icon: "tray.full.fill",
                                    iconColor: Color(hex: "#10B981"),
                                    iconBg: Color(hex: "#D1FAE5"),
                                    value: "\(dataStore.expenses.count)",
                                    label: "All Receipts"
                                )
                            }

                            // ── Recent Expenses ──────────────────────
                            VStack(alignment: .leading, spacing: 0) {
                                HStack {
                                    Text("Recent Expenses")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                    Spacer()
                                    Button { dataStore.reportsDeepLinkSubTab = 0; selectedTab = 1 } label: {
                                        HStack(spacing: 2) {
                                            Text("View All")
                                                .font(.system(size: 14, weight: .medium))
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 12, weight: .medium))
                                        }
                                        .foregroundColor(AppTheme.Colors.primary)
                                    }
                                }
                                .padding(.horizontal, 20)
                                .padding(.top, 20)
                                .padding(.bottom, 12)

                                if dataStore.expenses.isEmpty {
                                    VStack(spacing: 8) {
                                        Image(systemName: "doc.text")
                                            .font(.system(size: 36))
                                            .foregroundColor(AppTheme.Colors.border)
                                        Text("No expenses yet")
                                            .font(.system(size: 14, weight: .medium))
                                            .foregroundColor(AppTheme.Colors.textSecondary)
                                        Text("Scan a receipt to get started")
                                            .font(.system(size: 12))
                                            .foregroundColor(AppTheme.Colors.textSecondary.opacity(0.7))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 28)
                                } else {
                                    VStack(spacing: 0) {
                                        ForEach(Array(dataStore.expenses.prefix(5).enumerated()), id: \.element.id) { index, expense in
                                            HStack(spacing: 12) {
                                                ZStack {
                                                    RoundedRectangle(cornerRadius: 10)
                                                        .fill(categoryColor(expense.category).opacity(0.12))
                                                        .frame(width: 40, height: 40)
                                                    Image(systemName: "receipt")
                                                        .font(.system(size: 16))
                                                        .foregroundColor(categoryColor(expense.category))
                                                }
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(expense.merchant_name ?? "Unknown")
                                                        .font(.system(size: 14, weight: .semibold))
                                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                                    Text("\(expense.category.capitalized) · \(shortDate(expense.created_at))")
                                                        .font(.system(size: 12))
                                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                                }
                                                Spacer()
                                                VStack(alignment: .trailing, spacing: 4) {
                                                    Text(formatCurrency(expense.amount))
                                                        .font(.system(size: 14, weight: .semibold))
                                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                                    expenseStatusBadge(expense.processing_status)
                                                }
                                            }
                                            .padding(.horizontal, 20)
                                            .padding(.vertical, 10)

                                            if index < min(dataStore.expenses.count, 5) - 1 {
                                                Divider()
                                                    .padding(.leading, 72)
                                            }
                                        }
                                    }
                                    .padding(.bottom, 12)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(AppTheme.Colors.cardSurface)
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)

                            // ── Active Reports ───────────────────────
                            VStack(alignment: .leading, spacing: 0) {
                                HStack {
                                    Text("Active Reports")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                    Spacer()
                                    Button { dataStore.reportsDeepLinkSubTab = 1; selectedTab = 1 } label: {
                                        HStack(spacing: 2) {
                                            Text("View All")
                                                .font(.system(size: 14, weight: .medium))
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 12, weight: .medium))
                                        }
                                        .foregroundColor(AppTheme.Colors.primary)
                                    }
                                }
                                .padding(.horizontal, 20)
                                .padding(.top, 20)
                                .padding(.bottom, 12)

                                if dataStore.reports.isEmpty {
                                    VStack(spacing: 8) {
                                        Image(systemName: "folder")
                                            .font(.system(size: 36))
                                            .foregroundColor(AppTheme.Colors.border)
                                        Text("No active reports")
                                            .font(.system(size: 14, weight: .medium))
                                            .foregroundColor(AppTheme.Colors.textSecondary)
                                        Text("Reports you create will appear here")
                                            .font(.system(size: 12))
                                            .foregroundColor(AppTheme.Colors.textSecondary.opacity(0.7))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 28)
                                } else {
                                    VStack(spacing: 8) {
                                        ForEach(dataStore.reports.prefix(3)) { report in
                                            HStack {
                                                VStack(alignment: .leading, spacing: 4) {
                                                    Text(report.title)
                                                        .font(.system(size: 14, weight: .semibold))
                                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                                    Text(shortDate(report.created_at))
                                                        .font(.system(size: 11))
                                                        .foregroundColor(AppTheme.Colors.textSecondary)
                                                    if report.status != "draft" {
                                                        reportStatusBadge(report.status)
                                                    }
                                                }
                                                Spacer()
                                                Text(formatCurrency(report.total_amount))
                                                    .font(.system(size: 14, weight: .semibold))
                                                    .foregroundColor(AppTheme.Colors.textPrimary)
                                            }
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 12)
                                            .background(AppTheme.Colors.background.opacity(0.5))
                                            .cornerRadius(12)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .stroke(AppTheme.Colors.border.opacity(0.5), lineWidth: 1)
                                            )
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.bottom, 16)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(AppTheme.Colors.cardSurface)
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)

                            // ── Spending by Category ─────────────────
                            SpendingByCategoryCard(expenses: dataStore.expenses)
                        }
                        .padding(16)
                        .padding(.bottom, 100)
                    }
                    .coordinateSpace(name: "homeScroll")
                    .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
                        isScrolled = value < -8
                    }
                    .refreshable {
                        await dataStore.refreshAll(force: true)
                    }
                }
            }
        }
        .task {
            // Ensures data loads even if MainAppView's initial refreshAll() raced
            // with Clerk session init. Debounce prevents redundant calls.
            await dataStore.refreshAll()
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    func formatCurrency(_ amount: Double) -> String { CurrencyFormatter.shared.formatSimple(amount) }

    func shortDate(_ iso: String) -> String {
        guard let d = AppDataStore.parseISO(iso) else { return "" }
        let cal = Calendar.current
        let startD   = cal.startOfDay(for: d)
        let startNow = cal.startOfDay(for: Date())
        let diff = cal.dateComponents([.day], from: startD, to: startNow).day ?? 0
        if diff == 0 { return "Today" }
        if diff == 1 { return "Yesterday" }
        let df = DateFormatter()
        df.locale = .current
        let sameYear = cal.component(.year, from: d) == cal.component(.year, from: Date())
        df.dateFormat = sameYear ? "MMM d" : "MMM d, yyyy"
        return df.string(from: d)
    }

    func categoryColor(_ category: String) -> Color {
        categoryColorFor(category)
    }

    @ViewBuilder
    func expenseStatusBadge(_ status: String) -> some View {
        switch status {
        case "needs_review", "error":
            Text("Please Review")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Color(hex: "#B45309"))
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Color(hex: "#FEF3C7"))
                .cornerRadius(6)
        case "scanning":
            Text("Scanning")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Color(hex: "#6B7280"))
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Color(hex: "#F3F4F6"))
                .cornerRadius(6)
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    func reportStatusBadge(_ status: String) -> some View {
        switch status {
        case "submitted":
            Text("Submitted")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Color(hex: "#1E40AF"))
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Color(hex: "#DBEAFE"))
                .cornerRadius(6)
        case "approved":
            Text("Approved")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Color(hex: "#065F46"))
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Color(hex: "#D1FAE5"))
                .cornerRadius(6)
        default:
            EmptyView()
        }
    }
}

// MARK: - Hero Spending Card

struct HeroSpendingCard: View {
    let totalThisMonth: Double
    let trend: Double
    let receiptCountThisMonth: Int
    let totalAllTime: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("This Month")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.75))
                Text(CurrencyFormatter.shared.formatSimple(totalThisMonth))
                    .font(.system(size: 34, weight: .bold))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
            }

            if trend != 0 {
                HStack(spacing: 5) {
                    Image(systemName: trend > 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.system(size: 10, weight: .bold))
                    Text("\(trend > 0 ? "+" : "")\(String(format: "%.1f", trend))% vs last month")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundColor(.white.opacity(0.9))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    (trend > 0 ? Color.red : Color.green).opacity(0.25)
                )
                .cornerRadius(20)
            }

            HStack(spacing: 16) {
                Label("\(receiptCountThisMonth) receipt\(receiptCountThisMonth != 1 ? "s" : "")", systemImage: "doc.text")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.7))

                Text("·")
                    .foregroundColor(.white.opacity(0.3))

                Label(CurrencyFormatter.shared.formatSimple(totalAllTime) + " all time", systemImage: "archivebox")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color(hex: "#2563EB"), Color(hex: "#1E40AF")],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: Color(hex: "#2563EB").opacity(0.35), radius: 10, y: 4)
    }
}

// MARK: - Stat Pill

struct StatPill: View {
    let icon: String
    let iconColor: Color
    let iconBg: Color
    let value: String
    let label: String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(iconBg)
                    .frame(width: 42, height: 42)
                Image(systemName: icon)
                    .font(.system(size: 19))
                    .foregroundColor(iconColor)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(AppTheme.Colors.textPrimary)
                Text(label)
                    .font(.system(size: 11))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)
    }
}

// MARK: - Spending by Category Card

struct SpendingByCategoryCard: View {
    let expenses: [ExpenseItem]

    private var categoryTotals: [(String, Double)] {
        let grouped = Dictionary(grouping: expenses, by: { $0.category })
        return grouped.mapValues { $0.reduce(0) { $0 + $1.amount } }
            .sorted { $0.value > $1.value }
            .prefix(5)
            .map { ($0.key, $0.value) }
    }

    private var maxAmount: Double { categoryTotals.first?.1 ?? 1 }

    private func colorForCategory(_ cat: String) -> Color {
        categoryColorFor(cat)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 16))
                    .foregroundColor(AppTheme.Colors.textPrimary)
                Text("Spending by Category")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(AppTheme.Colors.textPrimary)
                Spacer()
                Text("This month")
                    .font(.system(size: 12))
                    .foregroundColor(AppTheme.Colors.textSecondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)

            if categoryTotals.isEmpty {
                VStack(spacing: 6) {
                    Image(systemName: "chart.bar")
                        .font(.system(size: 30))
                        .foregroundColor(AppTheme.Colors.border)
                    Text("No spending data available")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .padding(.bottom, 8)
            } else {
                VStack(spacing: 14) {
                    ForEach(categoryTotals, id: \.0) { (category, amount) in
                        VStack(spacing: 6) {
                            HStack {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(colorForCategory(category))
                                        .frame(width: 9, height: 9)
                                    Text(category.capitalized)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(AppTheme.Colors.textPrimary)
                                }
                                Spacer()
                                Text(CurrencyFormatter.shared.formatSimple(amount))
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(AppTheme.Colors.textPrimary)
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(AppTheme.Colors.border.opacity(0.3))
                                        .frame(height: 6)
                                    Capsule()
                                        .fill(colorForCategory(category))
                                        .frame(width: geo.size.width * CGFloat(amount / maxAmount), height: 6)
                                }
                            }
                            .frame(height: 6)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)
    }
}

#Preview {
    // Preview shim — uses a constant binding
    HomePage(selectedTab: .constant(0), dataStore: AppDataStore())
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
        .background(AppTheme.Colors.cardSurface)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 1, y: 1)
    }
}

// MARK: - Scroll detection (iOS 17-compatible via PreferenceKey)
private struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

#Preview {
    HomePage(selectedTab: .constant(0), dataStore: AppDataStore())
}
