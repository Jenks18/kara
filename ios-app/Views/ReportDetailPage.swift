import SwiftUI

struct ReportDetailPage: View {
    let reportId: String
    @State private var report: ExpenseReport?
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            if isLoading {
                ProgressView("Loading report...")
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.red)
                    Text(error)
                        .foregroundColor(.secondary)
                }
            } else if let report = report {
                ReportDetailContent(report: report)
            }
        }
        .navigationTitle("Report Details")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadReport()
            startRealtimeUpdates()
        }
    }
    
    private func loadReport() {
        Task {
            do {
                isLoading = true
                let fetchedReport = try await API.shared.fetchReport(id: reportId)
                report = fetchedReport
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
    
    private func startRealtimeUpdates() {
        // Polling every 10 seconds for updates
        Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { _ in
            Task {
                do {
                    let fetchedReport = try await API.shared.fetchReport(id: reportId)
                    report = fetchedReport
                } catch {
                    print("Error updating report: \(error)")
                }
            }
        }
    }
}

struct ReportDetailContent: View {
    let report: ExpenseReport
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Report Summary Card
                VStack(alignment: .leading, spacing: 12) {
                    Text(report.title)
                        .font(.title2.bold())
                    
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Total Amount")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(formatCurrency(report.total_amount))
                                .font(.title3.bold())
                                .foregroundColor(.green)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing) {
                            Text("Status")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            StatusBadge(status: report.status)
                        }
                    }
                    
                    HStack {
                        Image(systemName: "calendar")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(formatDate(report.created_at))
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Text("\(report.items.count) items")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .padding(.horizontal)
                
                // Expense Items List
                VStack(alignment: .leading, spacing: 12) {
                    Text("Expenses")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    ForEach(report.items) { item in
                        NavigationLink(destination: ExpenseItemDetailView(item: item)) {
                            ExpenseItemRow(item: item)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding(.vertical)
        }
        .background(Color(UIColor.systemGroupedBackground))
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        return displayFormatter.string(from: date)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }
}

struct ExpenseItemRow: View {
    let item: ExpenseItem
    
    var body: some View {
        HStack(spacing: 12) {
            // Receipt Image Thumbnail
            if let imageUrl = item.image_url, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(
                            ProgressView()
                        )
                }
                .frame(width: 60, height: 60)
                .cornerRadius(8)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 60, height: 60)
                    .cornerRadius(8)
                    .overlay(
                        Image(systemName: "photo")
                            .foregroundColor(.gray)
                    )
            }
            
            // Item Details
            VStack(alignment: .leading, spacing: 4) {
                Text(item.merchant_name)
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)
                
                HStack(spacing: 8) {
                    CategoryPill(category: item.category)
                    ProcessingStatusPill(status: item.processing_status)
                    
                    if item.kra_verified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }
                
                Text(formatDate(item.transaction_date))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Amount
            Text(formatCurrency(item.amount))
                .font(.subheadline.bold())
                .foregroundColor(.primary)
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .short
        return displayFormatter.string(from: date)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }
}

struct ExpenseItemDetailView: View {
    let item: ExpenseItem
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Receipt Image
                if let imageUrl = item.image_url, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        ProgressView()
                    }
                    .cornerRadius(12)
                }
                
                // Details
                VStack(alignment: .leading, spacing: 16) {
                    DetailRow(label: "Merchant", value: item.merchant_name)
                    DetailRow(label: "Amount", value: formatCurrency(item.amount))
                    DetailRow(label: "Category", value: item.category)
                    DetailRow(label: "Date", value: formatDate(item.transaction_date))
                    DetailRow(label: "Status", value: item.processing_status.capitalized)
                    
                    if item.kra_verified {
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.green)
                            Text("KRA Verified")
                                .foregroundColor(.green)
                        }
                    }
                }
                .padding()
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
            }
            .padding()
        }
        .navigationTitle("Expense Details")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .long
        return displayFormatter.string(from: date)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }
}

struct DetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .bold()
        }
    }
}

struct StatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status.capitalized)
            .font(.caption.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(6)
    }
    
    private var statusColor: Color {
        switch status.lowercased() {
        case "draft": return .gray
        case "submitted": return .blue
        case "approved": return .green
        case "rejected": return .red
        default: return .gray
        }
    }
}

struct CategoryPill: View {
    let category: String
    
    var body: some View {
        Text(category.capitalized)
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.blue.opacity(0.15))
            .foregroundColor(.blue)
            .cornerRadius(4)
    }
}

struct ProcessingStatusPill: View {
    let status: String
    
    var body: some View {
        Text(statusText)
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(statusColor.opacity(0.15))
            .foregroundColor(statusColor)
            .cornerRadius(4)
    }
    
    private var statusText: String {
        switch status.lowercased() {
        case "scanning": return "Scanning"
        case "processed": return "Processed"
        case "needs_review": return "Review"
        case "error": return "Error"
        default: return status.capitalized
        }
    }
    
    private var statusColor: Color {
        switch status.lowercased() {
        case "scanning": return .orange
        case "processed": return .green
        case "needs_review": return .yellow
        case "error": return .red
        default: return .gray
        }
    }
}

#Preview {
    NavigationStack {
        ReportDetailPage(reportId: "123")
    }
}
