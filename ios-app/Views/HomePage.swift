import SwiftUI

// Exact match to web app home page
struct HomePage: View {
    @State private var reports: [ExpenseReport] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            // Web app gradient: emerald-50 via green-50 to emerald-100
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
                // Header (matching web app)
                VStack(spacing: 0) {
                    // Extend to status bar
                    Color.white
                        .frame(height: 0)
                        .ignoresSafeArea(edges: .top)
                    
                    HStack {
                        Text("Inbox")
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
                
                // Content
                ScrollView {
                    VStack(spacing: 24) {
                        // Stats Card - matches StatsCard.tsx exactly
                        StatsCardView(
                            title: "Total Fuel Expenses",
                            amount: 28476,
                            change: "+12% from last month",
                            period: "This Month"
                        )
                        
                        // Expense Reports Section
                        if !reports.isEmpty {
                            VStack(alignment: .leading, spacing: 16) {
                                HStack {
                                    Text("Expense Reports")
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundColor(Color(red: 0.11, green: 0.11, blue: 0.11))
                                    Spacer()
                                    Button("View All") {}
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506)) // emerald-600
                                }
                                
                                ForEach(reports) { report in
                                    ExpenseReportCardView(report: report)
                                }
                            }
                        }
                        
                        // Error State
                        if let error = errorMessage {
                            VStack(spacing: 16) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 48))
                                    .foregroundColor(.orange)
                                
                                Text(error)
                                    .font(.system(size: 14))
                                    .foregroundColor(Color(red: 0.459, green: 0.459, blue: 0.459))
                                    .multilineTextAlignment(.center)
                                
                                Button("Retry") {
                                    loadReports()
                                }
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: 200)
                                .padding(.vertical, 14)
                                .background(Color(red: 0.063, green: 0.725, blue: 0.506))
                                .cornerRadius(12)
                            }
                            .padding(.vertical, 40)
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 16)
                }
            }
        }
        .task {
            loadReports()
        }
    }
    
    private func loadReports() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let fetchedReports = try await API.shared.fetchReports()
                await MainActor.run {
                    reports = fetchedReports
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to load reports: \(error.localizedDescription)"
                    isLoading = false
                }
            }
        }
    }
}

// Matches StatsCard.tsx exactly
struct StatsCardView: View {
    let title: String
    let amount: Int
    let change: String
    let period: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(period)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
            
            Text("KES \(amount.formatted())")
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            Text(change)
                .font(.system(size: 12))
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.2))
                .cornerRadius(12)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .background(
            // Matches: bg-gradient-to-br from-emerald-500 to-green-600
            LinearGradient(
                colors: [
                    Color(red: 0.2, green: 0.7, blue: 0.4),   // emerald-500
                    Color(red: 0.15, green: 0.6, blue: 0.35)  // green-600
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 12, x: 0, y: 4)
    }
}

// Matches the expense report card in page.tsx exactly
struct ExpenseReportCardView: View {
    let report: ExpenseReport
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "doc.text")
                    .font(.system(size: 14))
                    .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                
                Text(report.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.primary)
                
                Spacer()
            }
            
            // Status and metadata
            HStack(spacing: 8) {
                // Status badge
                Text(report.status.capitalized)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor.opacity(0.2))
                    .cornerRadius(12)
                
                Text("•")
                    .foregroundColor(.secondary)
                
                Text("\(report.items?.count ?? 0) expense\((report.items?.count ?? 0) != 1 ? "s" : "")")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                
                Text("•")
                    .foregroundColor(.secondary)
                
                Text(formatDate(report.created_at))
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            
            // Receipt thumbnails
            if let items = report.items, !items.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
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
            
            // Footer
            Divider()
            
            HStack {
                Text(report.workspace_name)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("KES \(String(format: "%.2f", report.total_amount))")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var statusColor: Color {
        switch report.status {
        case "draft": return Color(red: 0.2, green: 0.7, blue: 0.4)
        case "submitted": return Color.orange
        case "approved": return Color.green
        case "rejected": return Color.red
        default: return Color.gray
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"
        return displayFormatter.string(from: date)
    }
}

// Simple camera page placeholder
struct CameraPage: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Text("Camera")
            .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    HomePage()
}
