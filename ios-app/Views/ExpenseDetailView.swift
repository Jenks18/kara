//
//  ExpenseDetailView.swift
//  MafutaPass
//
//  Receipt detail view with inline editing
//  Matches Android ExpenseDetailScreen functionality
//

import SwiftUI

struct ExpenseDetailView: View {
    @Environment(\.dismiss) var dismiss
    @State var expense: ExpenseItem
    
    @State private var isEditing = false
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var savedSuccess = false
    
    // Editable fields
    @State private var editMerchant: String = ""
    @State private var editAmount: String = ""
    @State private var editCategory: String = ""
    @State private var editDate: Date = Date()
    @State private var editNotes: String = ""
    
    let categories = ["Fuel", "Food", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Other"]
    
    var needsReview: Bool {
        expense.processing_status == "needs_review"
    }
    
    var hasEtimsQR: Bool {
        expense.kra_verified ?? false
    }
    
    var body: some View {
        ZStack {
            Color(uiColor: .systemGroupedBackground)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 16) {
                    // Receipt Image
                    AsyncImage(url: URL(string: expense.image_url)) { phase in
                        switch phase {
                        case .empty:
                            ProgressView()
                                .frame(height: 400)
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                                .frame(maxWidth: .infinity)
                                .frame(height: 400)
                                .cornerRadius(12)
                        case .failure:
                            Image(systemName: "photo")
                                .font(.system(size: 50))
                                .foregroundColor(.gray)
                                .frame(height: 400)
                        @unknown default:
                            EmptyView()
                        }
                    }
                    .padding(.horizontal)
                    
                    // Needs Review Banner
                    if needsReview && !isEditing {
                        Button(action: { startEditing() }) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                Text("Needs Review - Tap to Edit")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.orange)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.orange)
                            }
                            .padding()
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(8)
                        }
                        .padding(.horizontal)
                    }
                    
                    // Details Card
                    VStack(spacing: 0) {
                        if isEditing {
                            // Edit Mode Form
                            editForm
                        } else {
                            // View Mode
                            viewMode
                        }
                    }
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 8)
                    .padding(.horizontal)
                    
                    // KRA Verified Badge
                    if hasEtimsQR {
                        HStack {
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundColor(.green)
                            Text("KRA Verified")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.green)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(20)
                    }
                }
                .padding(.vertical)
            }
            
            // Save Success Overlay
            if savedSuccess {
                VStack {
                    Spacer()
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Saved successfully")
                            .font(.system(size: 15))
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding()
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: savedSuccess)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle(expense.merchant_name ?? "Receipt")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if isEditing {
                    Button(action: cancelEditing) {
                        Text("Cancel")
                            .foregroundColor(.gray)
                    }
                } else if !needsReview {
                    Button(action: startEditing) {
                        Text("Edit")
                            .foregroundColor(Color(red: 0.0, green: 0.4, blue: 1.0))
                    }
                }
            }
        }
        .onAppear {
            initializeEditFields()
            // Auto-enter edit mode if needs review
            if needsReview {
                startEditing()
            }
        }
    }
    
    // MARK: - View Mode
    
    var viewMode: some View {
        VStack(spacing: 0) {
            detailRow(label: "Merchant", value: expense.merchant_name ?? "Unknown")
            Divider().padding(.leading, 16)
            
            detailRow(label: "Amount", value: formatAmount(expense.amount))
            Divider().padding(.leading, 16)
            
            detailRow(label: "Category", value: expense.category.capitalized)
            Divider().padding(.leading, 16)
            
            detailRow(label: "Date", value: expense.formattedDate)
            
            if let notes = expense.description, !notes.isEmpty {
                Divider().padding(.leading, 16)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Notes")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                    Text(notes)
                        .font(.system(size: 16))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
            }
        }
    }
    
    func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 16, weight: .medium))
        }
        .padding()
    }
    
    // MARK: - Edit Mode
    
    var editForm: some View {
        VStack(spacing: 16) {
            // Merchant
            VStack(alignment: .leading, spacing: 8) {
                Text("Merchant")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                TextField("Merchant name", text: $editMerchant)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal)
            .padding(.top)
            
            // Amount
            VStack(alignment: .leading, spacing: 8) {
                Text("Amount")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                TextField("0.00", text: $editAmount)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal)
            
            // Category
            VStack(alignment: .leading, spacing: 8) {
                Text("Category")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                Picker("Category", selection: $editCategory) {
                    ForEach(categories, id: \.self) { category in
                        Text(category).tag(category)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal)
            
            // Date
            VStack(alignment: .leading, spacing: 8) {
                Text("Date")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                DatePicker("", selection: $editDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
            }
            .padding(.horizontal)
            
            // Notes
            VStack(alignment: .leading, spacing: 8) {
                Text("Notes")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
                TextEditor(text: $editNotes)
                    .frame(height: 80)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            }
            .padding(.horizontal)
            
            // Save Button
            Button(action: saveChanges) {
                HStack {
                    if isSaving {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Save Changes")
                            .font(.system(size: 17, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(red: 0.0, green: 0.4, blue: 1.0))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isSaving)
            .padding(.horizontal)
            .padding(.bottom)
            
            // Error Message
            if let error = saveError {
                Text(error)
                    .font(.system(size: 14))
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    func initializeEditFields() {
        editMerchant = expense.merchant_name ?? ""
        editAmount = String(format: "%.2f", expense.amount)
        editCategory = expense.category.capitalized
        if let dateStr = expense.transaction_date {
            let formatter = ISO8601DateFormatter()
            editDate = formatter.date(from: dateStr) ?? Date()
        }
        editNotes = expense.description ?? ""
    }
    
    func startEditing() {
        initializeEditFields()
        withAnimation {
            isEditing = true
        }
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
                // Call API to update expense
                let updates: [String: Any] = [
                    "merchant_name": editMerchant,
                    "amount": amount,
                    "category": editCategory.lowercased(),
                    "transaction_date": ISO8601DateFormatter().string(from: editDate),
                    "description": editNotes.isEmpty ? nil : editNotes,
                    "processing_status": "processed" // Mark as processed after edit
                ]
                
                let updated = try await API.shared.updateExpense(id: expense.id, updates: updates)
                
                await MainActor.run {
                    expense = updated
                    isSaving = false
                    isEditing = false
                    savedSuccess = true
                    
                    // Hide success message after 2 seconds
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
        let symbol = expense.workspace_name == "Personal" ? "KSh" : "$"
        return "\(symbol) \(String(format: "%.2f", amount))"
    }
}
