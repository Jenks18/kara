import SwiftUI

// Native iOS design with proper contrast and readability
struct ImprovedHomePage: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var reports: [ExpenseReport] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationStack {
            ZStack {
                // iOS native background - light gray instead of white
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()
                
                if isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(Color(red: 0.2, green: 0.7, blue: 0.4))
                        
                        Text("Loading...")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                } else if let error = errorMessage {
                    // Error state
                    VStack(spacing: 24) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 56))
                            .foregroundColor(.orange)
                        
                        Text(error)
                            .font(.system(size: 16))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                        
                        Button("Try Again") {
                            loadReports()
                        }
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(height: 50)
                        .frame(maxWidth: 200)
                        .background(Color(red: 0.2, green: 0.7, blue: 0.4))
                        .cornerRadius(12)
                    }
                } else {
                    // Content
                    ScrollView {
                        VStack(spacing: 20) {
                            // Stats Card
                            NativeStatsCard(
                                title: "Total Fuel Expenses",
                                amount: 28476,
                                change: "+12% from last month",
                                period: "This Month"
                            )
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                            
                            // Expense Reports Section
                            if !reports.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    HStack {
                                        Text("Expense Reports")
                                            .font(.system(size: 20, weight: .bold))
                                            .foregroundColor(.primary)
                                        
                                        Spacer()
                                        
                                        Button("View All") {}
                                            .font(.system(size: 15, weight: .semibold))
                                            .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                                    }
                                    .padding(.horizontal, 16)
                                    
                                    ForEach(reports) { report in
                                        NativeExpenseCard(report: report)
                                            .padding(.horizontal, 16)
                                    }
                                }
                            } else {
                                // Empty state
                                VStack(spacing: 16) {
                                    Image(systemName: "doc.text")
                                        .font(.system(size: 56))
                                        .foregroundColor(.gray.opacity(0.5))
                                    
                                    Text("No expense reports yet")
                                        .font(.system(size: 17, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    Text("Scan your first receipt to get started")
                                        .font(.system(size: 15))
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 60)
                            }
                        }
                        .padding(.bottom, 100) // Space for bottom nav + FAB
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Inbox")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.primary)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {}) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.primary)
                    }
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            // FAB Button
            NavigationLink(destination: CameraView()) {
                ZStack {
                    Circle()
                        .fill(Color(red: 0.2, green: 0.7, blue: 0.4))
                        .frame(width: 64, height: 64)
                        .shadow(color: .black.opacity(0.25), radius: 12, x: 0, y: 4)
                    
                    Image(systemName: "camera.fill")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .padding(24)
            .padding(.bottom, 60) // Above bottom nav
        }
        .onAppear {
            loadReports()
        }
    }
    
    private func loadReports() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let fetchedReports = try await APIClient.shared.fetchReports()
                await MainActor.run {
                    reports = fetchedReports
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
                    errorMessage = "Failed to load reports. Please check your connection."
                    isLoading = false
                }
            }
        }
    }
}

// Native iOS Stats Card
struct NativeStatsCard: View {
    let title: String
    let amount: Int
    let change: String
    let period: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(period)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white.opacity(0.85))
                .textCase(.uppercase)
                .tracking(0.5)
            
            Text("KES \(amount.formatted())")
                .font(.system(size: 38, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            HStack(spacing: 4) {
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 11, weight: .bold))
                
                Text(change)
                    .font(.system(size: 13, weight: .semibold))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.2))
            .cornerRadius(8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.2, green: 0.7, blue: 0.4),
                    Color(red: 0.15, green: 0.6, blue: 0.35)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.3), radius: 12, x: 0, y: 6)
    }
}

// Native iOS Expense Card
struct NativeExpenseCard: View {
    let report: ExpenseReport
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack(spacing: 10) {
                Image(systemName: "doc.text.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                
                Text(report.title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.primary)
                
                Spacer()
            }
            
            // Metadata
            HStack(spacing: 8) {
                StatusBadge(status: report.status)
                
                Text("•")
                    .foregroundColor(.secondary)
                    .font(.system(size: 12))
                
                Text("\(report.items.count) expense\(report.items.count != 1 ? "s" : "")")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                
                Text("•")
                    .foregroundColor(.secondary)
                    .font(.system(size: 12))
                
                Text(formatDate(report.created_at))
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
            }
            
            // Thumbnails
            if !report.items.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(report.items.prefix(5)) { item in
                            AsyncImage(url: URL(string: item.image_url)) { image in
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
                            .frame(width: 90, height: 110)
                            .cornerRadius(10)
                            .clipped()
                        }
                    }
                }
            }
            
            // Footer
            Divider()
                .padding(.vertical, 4)
            
            HStack {
                Text(report.workspace_name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("KES \(Int(report.total_amount).formatted())")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
            }
        }
        .padding(18)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return "Recent" }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"
        return displayFormatter.string(from: date)
    }
}

// Status Badge Component
struct StatusBadge: View {
    let status: String
    
    var statusColor: Color {
        switch status.lowercased() {
        case "draft": return .blue
        case "submitted": return .orange
        case "approved": return .green
        case "rejected": return .red
        default: return .gray
        }
    }
    
    var body: some View {
        Text(status.capitalized)
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(statusColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(statusColor.opacity(0.15))
            .cornerRadius(6)
    }
}

#Preview {
    ImprovedHomePage()
        .environmentObject(AuthManager.shared)
}
