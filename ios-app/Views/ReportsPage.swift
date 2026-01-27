import SwiftUI

// Matches /app/reports/page.tsx
struct ReportsPage: View {
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
        
        // Filter by processing status
        switch selectedFilter {
        case .all:
            break
        case .scanning:
            filtered = filtered.filter { $0.processing_status == "scanning" }
        case .processed:
            filtered = filtered.filter { $0.processing_status == "processed" }
        case .needsReview:
            filtered = filtered.filter { $0.processing_status == "needs_review" }
        case .error:
            filtered = filtered.filter { $0.processing_status == "error" }
        }
        
        // Filter by search text
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
                // Background gradient
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
                
                VStack(spacing: 0) {
                    // Search bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        
                        TextField("Search expenses...", text: $searchText)
                            .font(.system(size: 16))
                    }
                    .padding(12)
                    .background(Color.white)
                    .cornerRadius(12)
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    
                    // Filter chips
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
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
                    .padding(.vertical, 12)
                    
                    // Expenses list
                    if isLoading {
                        Spacer()
                        ProgressView()
                        Spacer()
                    } else if let error = errorMessage {
                        Spacer()
                        VStack(spacing: 16) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 48))
                                .foregroundColor(.orange)
                            
                            Text(error)
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                        Spacer()
                    } else if filteredExpenses.isEmpty {
                        Spacer()
                        VStack(spacing: 16) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 48))
                                .foregroundColor(.gray.opacity(0.5))
                            
                            Text("No expenses found")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(filteredExpenses) { expense in
                                    ExpenseItemCardView(expense: expense)
                                }
                            }
                            .padding(16)
                            .padding(.bottom, 80) // Space for bottom nav
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Reports")
                        .font(.system(size: 24, weight: .bold))
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
                let fetchedExpenses = try await API.shared.fetchExpenses()
                await MainActor.run {
                    expenses = fetchedExpenses
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

// Filter chip component
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? .white : Color(red: 0.2, green: 0.7, blue: 0.4))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isSelected ? 
                        Color(red: 0.2, green: 0.7, blue: 0.4) : 
                        Color.white
                )
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color(red: 0.2, green: 0.7, blue: 0.4), lineWidth: isSelected ? 0 : 1)
                )
        }
    }
}

// Expense item card matching ExpenseCard.tsx
struct ExpenseItemCardView: View {
    let expense: ExpenseItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Receipt thumbnail
                AsyncImage(url: URL(string: expense.image_url)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                }
                .frame(width: 60, height: 72)
                .cornerRadius(8)
                .clipped()
                
                // Expense details
                VStack(alignment: .leading, spacing: 6) {
                    Text(expense.merchant_name ?? "Unknown Merchant")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                    
                    HStack(spacing: 8) {
                        Text(expense.category)
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                        
                        Text("•")
                            .foregroundColor(.secondary)
                        
                        Text(formatDate(expense.transaction_date))
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                    
                    // Status badge
                    Text(expense.processing_status.capitalized)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(statusColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(statusColor.opacity(0.2))
                        .cornerRadius(12)
                }
                
                Spacer()
                
                // Amount
                Text("$\(String(format: "%.2f", expense.amount))")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var statusColor: Color {
        switch expense.processing_status {
        case "scanning": return .orange
        case "processed": return .green
        case "needs_review": return .blue
        case "error": return .red
        default: return .gray
        }
    }
    
    private func formatDate(_ dateString: String?) -> String {
        guard let dateString = dateString else { return "No date" }
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"
        return displayFormatter.string(from: date)
    }
}

#Preview {
    ReportsPage()
}
