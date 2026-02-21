//
//  ExpenseDetailView.swift
//  MafutaPass
//
//  Receipt detail view with inline editing
//  Matches Android ExpenseDetailScreen layout & functionality
//

import SwiftUI

// MARK: - Full Screen Receipt Viewer

struct FullScreenReceiptView: View {
    let imageUrl: String?
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if let imageUrl = imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView().tint(.white)
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                    case .failure:
                        Image(systemName: "photo")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                    @unknown default:
                        EmptyView()
                    }
                }
            }
            
            VStack {
                HStack {
                    Spacer()
                    Button(action: onDismiss) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .padding()
                }
                Spacer()
            }
        }
    }
}

// MARK: - Expense Detail View

struct ExpenseDetailView: View {
    @Environment(\.dismiss) var dismiss
    @State var expense: ExpenseItem
    
    @State private var isEditing = false
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var savedSuccess = false
    @State private var showFullImage = false
    
    // Editable fields
    @State private var editMerchant: String = ""
    @State private var editAmount: String = ""
    @State private var editCategory: String = ""
    @State private var editDate: Date = Date()
    @State private var editNotes: String = ""
    
    let categories = ["Fuel", "Food", "Transport", "Accommodation", "Office Supplies", "Communication", "Maintenance", "Other"]
    
    var needsReview: Bool {
        expense.processing_status == "needs_review" || expense.processing_status == "error"
    }
    
    var hasEtimsQR: Bool {
        expense.kra_verified ?? false
    }
    
    private var statusColor: Color {
        switch expense.processing_status.lowercased() {
        case "processed": return hasEtimsQR ? AppTheme.Colors.green500 : AppTheme.Colors.primary
        case "scanning": return .orange
        case "error", "needs_review": return Color(red: 0.9, green: 0.66, blue: 0.09)
        default: return .gray
        }
    }
    
    private var statusLabel: String {
        switch expense.processing_status.lowercased() {
        case "processed": return hasEtimsQR ? "KRA Verified" : "Verified"
        case "scanning": return "Processing"
        case "error", "needs_review": return "Needs Review"
        default: return expense.processing_status.capitalized
        }
    }
    
    var body: some View {
        ZStack {
            AppTheme.backgroundView()
            
            if isEditing {
                ScrollView { editForm }
            } else {
                ScrollView { detailContent }
            }
            
            // Save Success Overlay
            if savedSuccess {
                VStack {
                    Spacer()
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(AppTheme.Colors.green500)
                        Text("Saved successfully")
                            .font(.system(size: 15))
                    }
                    .padding()
                    .background(AppTheme.Colors.cardSurface)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding()
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: savedSuccess)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle(expense.merchant_name ?? "Expense")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if isEditing {
                    Button(action: cancelEditing) {
                        Text("Cancel").foregroundColor(.gray)
                    }
                } else {
                    Button(action: startEditing) {
                        Image(systemName: "pencil")
                            .foregroundColor(AppTheme.Colors.primary)
                    }
                }
            }
        }
        .fullScreenCover(isPresented: $showFullImage) {
            FullScreenReceiptView(imageUrl: expense.image_url, onDismiss: { showFullImage = false })
        }
        .onAppear { initializeEditFields() }
    }
    
    // MARK: - Detail Content (matches Android ExpenseDetailContent)
    
    var detailContent: some View {
        VStack(spacing: 16) {
            // Needs Review banner
            if needsReview {
                Button(action: startEditing) {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Needs Review")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.orange)
                            Text("Tap to edit and correct the details below.")
                                .font(.system(size: 13))
                                .foregroundColor(AppTheme.Colors.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "pencil")
                            .foregroundColor(.orange)
                    }
                    .padding(16)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(16)
                }
                .padding(.horizontal)
            }
            
            // Receipt Image (tappable for fullscreen)
            if let imageUrl = expense.image_url, let url = URL(string: imageUrl) {
                Button(action: { showFullImage = true }) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            ProgressView().frame(height: 300)
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(maxWidth: .infinity)
                                .frame(height: 300)
                                .clipped()
                                .cornerRadius(16)
                        case .failure:
                            Image(systemName: "photo")
                                .font(.system(size: 50))
                                .foregroundColor(.gray)
                                .frame(height: 300)
                        @unknown default:
                            EmptyView()
                        }
                    }
                }
                .padding(.horizontal)
            }
            
            // Amount Card
            VStack(spacing: 4) {
                Text("Amount")
                    .font(.system(size: 14))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                Text(formatAmount(expense.amount))
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(AppTheme.Colors.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(20)
            .background(AppTheme.Colors.primary.opacity(0.08))
            .cornerRadius(16)
            .padding(.horizontal)
            
            // Details Card
            VStack(spacing: 0) {
                iconRow(icon: "storefront", label: "Merchant", value: expense.merchant_name ?? "Unknown")
                Divider().padding(.leading, 48)
                
                iconRow(icon: "tag", label: "Category", value: expense.category.capitalized)
                Divider().padding(.leading, 48)
                
                iconRow(icon: "calendar", label: "Date", value: formattedDisplayDate)
                Divider().padding(.leading, 48)
                
                // Status row
                HStack(spacing: 12) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 18))
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .frame(width: 20)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Status")
                            .font(.system(size: 13))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                        Text(statusLabel)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(statusColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(statusColor.opacity(0.12))
                            .cornerRadius(8)
                    }
                    Spacer()
                }
                .padding(16)
                
                // KRA Badge
                if hasEtimsQR {
                    Divider().padding(.leading, 48)
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundColor(AppTheme.Colors.primary)
                        Text("KRA Verified")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(AppTheme.Colors.primary)
                        Spacer()
                    }
                    .padding(16)
                } else if expense.processing_status == "processed" {
                    Divider().padding(.leading, 48)
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(AppTheme.Colors.primary)
                        Text("Verified")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(AppTheme.Colors.primary)
                        Spacer()
                    }
                    .padding(16)
                }
                
                // Notes
                if let notes = expense.description, !notes.isEmpty, !notes.hasPrefix("AI confidence") {
                    Divider().padding(.leading, 48)
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "note.text")
                            .font(.system(size: 18))
                            .foregroundColor(AppTheme.Colors.textSecondary)
                            .frame(width: 20)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Notes")
                                .font(.system(size: 13))
                                .foregroundColor(AppTheme.Colors.textSecondary)
                            Text(notes)
                                .font(.system(size: 15))
                        }
                        Spacer()
                    }
                    .padding(16)
                }
            }
            .background(AppTheme.Colors.cardSurface)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 8)
            .padding(.horizontal)
            
            // Edit Details Button
            Button(action: startEditing) {
                HStack {
                    Image(systemName: "pencil")
                        .font(.system(size: 15))
                    Text("Edit Details")
                        .font(.system(size: 16, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(AppTheme.Colors.primary, lineWidth: 1.5)
                )
            }
            .foregroundColor(AppTheme.Colors.primary)
            .padding(.horizontal)
            .padding(.bottom, 20)
        }
        .padding(.top, 8)
    }
    
    // MARK: - Edit Form
    
    var editForm: some View {
        VStack(spacing: 16) {
            // Receipt image (smaller in edit mode)
            if let imageUrl = expense.image_url, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                            .frame(maxWidth: .infinity).frame(height: 180)
                            .clipped().cornerRadius(12)
                    default:
                        EmptyView()
                    }
                }
                .padding(.horizontal)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Merchant")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                TextField("Merchant name", text: $editMerchant)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal)
            .padding(.top)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Amount")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                TextField("0.00", text: $editAmount)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Category")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                Picker("Category", selection: $editCategory) {
                    ForEach(categories, id: \.self) { cat in
                        Text(cat).tag(cat)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Date")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                DatePicker("", selection: $editDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
            }
            .padding(.horizontal)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Notes")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                TextEditor(text: $editNotes)
                    .frame(height: 80)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            }
            .padding(.horizontal)
            
            Button(action: saveChanges) {
                HStack {
                    if isSaving {
                        ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Save Changes").font(.system(size: 17, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(AppTheme.Colors.primary)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isSaving)
            .padding(.horizontal)
            .padding(.bottom)
            
            if let error = saveError {
                Text(error)
                    .font(.system(size: 14))
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }
        }
    }
    
    // MARK: - Helpers
    
    func iconRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(AppTheme.Colors.textSecondary)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundColor(AppTheme.Colors.textSecondary)
                Text(value)
                    .font(.system(size: 16))
            }
            Spacer()
        }
        .padding(16)
    }
    
    private var formattedDisplayDate: String {
        let dateStr = expense.transaction_date ?? expense.created_at
        let iso = ISO8601DateFormatter()
        guard let date = iso.date(from: dateStr) else { return dateStr.prefix(10).description }
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        fmt.timeStyle = .none
        return fmt.string(from: date)
    }
    
    func initializeEditFields() {
        editMerchant = expense.merchant_name ?? ""
        editAmount = String(format: "%.2f", expense.amount)
        editCategory = expense.category.capitalized
        if let dateStr = expense.transaction_date {
            let formatter = ISO8601DateFormatter()
            editDate = formatter.date(from: dateStr) ?? Date()
        }
        let raw = expense.description ?? ""
        editNotes = raw.hasPrefix("AI confidence") ? "" : raw
    }
    
    func startEditing() {
        initializeEditFields()
        withAnimation { isEditing = true }
    }
    
    func cancelEditing() {
        withAnimation {
            isEditing = false
            saveError = nil
        }
    }
    
    func saveChanges() {
        guard let amount = Double(editAmount), amount > 0 else {
            saveError = "Please enter a valid amount"
            return
        }
        
        isSaving = true
        saveError = nil
        
        Task {
            do {
                var updates: [String: Any] = [
                    "merchant_name": editMerchant,
                    "amount": amount,
                    "category": editCategory.lowercased(),
                    "transaction_date": ISO8601DateFormatter().string(from: editDate),
                    "processing_status": "processed"
                ]
                if !editNotes.isEmpty {
                    updates["description"] = editNotes
                }
                
                let updated = try await API.shared.updateExpense(id: expense.id, updates: updates)
                
                await MainActor.run {
                    expense = updated
                    isSaving = false
                    isEditing = false
                    savedSuccess = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        savedSuccess = false
                    }
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    saveError = "Failed to save: \(error.localizedDescription)"
                }
            }
        }
    }
    
    func formatAmount(_ amount: Double) -> String {
        return CurrencyFormatter.shared.formatSimple(amount)
    }
}
