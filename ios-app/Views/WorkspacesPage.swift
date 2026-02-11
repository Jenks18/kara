import SwiftUI

struct WorkspacesPage: View {
    @State private var workspaces: [Workspace] = []
    @State private var isLoading = true
    @State private var activeMenuId: String? = nil
    @State private var showCreateSheet = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient matching webapp
                Color(red: 0.93, green: 0.98, blue: 0.95)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Text("Workspaces")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Button(action: {
                            // Search functionality
                        }) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 24))
                                .foregroundColor(.gray)
                        }
                        .frame(minWidth: 44, minHeight: 44)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.white)
                    .overlay(
                        Rectangle()
                            .fill(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.1))
                            .frame(height: 1),
                        alignment: .bottom
                    )
                    
                    if isLoading {
                        Spacer()
                        ProgressView("Loading...")
                        Spacer()
                    } else if workspaces.isEmpty {
                        // Empty State
                        ScrollView {
                            VStack(spacing: 16) {
                                Spacer()
                                    .frame(height: 80)
                                
                                Text("You have no workspaces")
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(.primary)
                                
                                Text("Track receipts, reimburse expenses, manage travel, send invoices, and more.")
                                    .font(.system(size: 16))
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 40)
                                
                                Spacer()
                                    .frame(height: 32)
                                
                                Button(action: {
                                    showCreateSheet = true
                                }) {
                                    Text("New workspace")
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 16)
                                        .background(
                                            LinearGradient(
                                                colors: [
                                                    Color(red: 0.05, green: 0.51, blue: 0.31),
                                                    Color(red: 0.05, green: 0.51, blue: 0.31)
                                                ],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .cornerRadius(16)
                                        .shadow(color: Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), radius: 8, y: 4)
                                }
                                .padding(.horizontal, 16)
                            }
                        }
                    } else {
                        // Workspaces List
                        ScrollView {
                            VStack(spacing: 12) {
                                ForEach(workspaces) { workspace in
                                    WorkspaceRow(
                                        workspace: workspace,
                                        isMenuActive: activeMenuId == workspace.id,
                                        onMenuToggle: {
                                            activeMenuId = activeMenuId == workspace.id ? nil : workspace.id
                                        },
                                        onGoToWorkspace: {
                                            // Navigate to workspace
                                            activeMenuId = nil
                                        },
                                        onDuplicate: {
                                            Task {
                                                await duplicateWorkspace(workspace)
                                            }
                                        },
                                        onDelete: {
                                            Task {
                                                await deleteWorkspace(workspace.id)
                                            }
                                        }
                                    )
                                }
                                
                                // Add New Workspace Button
                                Button(action: {
                                    showCreateSheet = true
                                }) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "plus")
                                            .font(.system(size: 20, weight: .bold))
                                        Text("Add workspace")
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                                    .cornerRadius(12)
                                }
                                .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                            }
                            .padding(16)
                            .padding(.bottom, 100)
                        }
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreateSheet) {
                NewWorkspaceView(onComplete: {
                    Task {
                        await loadWorkspaces()
                    }
                })
            }
            .task {
                await loadWorkspaces()
            }
        }
    }
    
    private func loadWorkspaces() async {
        isLoading = true
        
        do {
            workspaces = try await API.shared.fetchWorkspaces()
        } catch {
            print("Error loading workspaces: \(error)")
        }
        
        isLoading = false
    }
    
    private func duplicateWorkspace(_ workspace: Workspace) async {
        do {
            let newWorkspace = try await API.shared.createWorkspace(
                name: "\(workspace.name) (Copy)",
                avatar: workspace.avatar,
                currency: workspace.currency
            )
            await MainActor.run {
                workspaces.append(newWorkspace)
                activeMenuId = nil
            }
        } catch {
            print("Error duplicating workspace: \(error)")
        }
    }
    
    private func deleteWorkspace(_ id: String) async {
        // Show confirmation first
        guard await showDeleteConfirmation() else { return }
        
        do {
            try await API.shared.deleteWorkspace(id: id)
            await MainActor.run {
                workspaces.removeAll { $0.id == id }
                activeMenuId = nil
            }
        } catch {
            print("Error deleting workspace: \(error)")
        }
    }
    
    private func showDeleteConfirmation() async -> Bool {
        // In a real app, show an alert
        return true
    }
}

struct WorkspaceRow: View {
    let workspace: Workspace
    let isMenuActive: Bool
    let onMenuToggle: () -> Void
    let onGoToWorkspace: () -> Void
    let onDuplicate: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        ZStack {
            NavigationLink(destination: WorkspaceDetailView(workspaceId: workspace.id)) {
                HStack(spacing: 12) {
                    // Avatar
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(red: 0.05, green: 0.51, blue: 0.31))
                            .frame(width: 56, height: 56)
                        
                        if let url = workspace.avatarURL {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Text(workspace.initials)
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            Text(workspace.initials)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    
                    // Info
                    VStack(alignment: .leading, spacing: 2) {
                        Text(workspace.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        Text("\(workspace.currency) - \(workspace.displayCurrencySymbol)")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                .padding(16)
                .background(Color.white)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.gray.opacity(0.1), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
            }
            
            // Three-dot menu button
            VStack {
                HStack {
                    Spacer()
                    Button(action: onMenuToggle) {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 20))
                            .foregroundColor(.gray)
                            .rotationEffect(.degrees(90))
                            .frame(width: 44, height: 44)
                    }
                }
                Spacer()
            }
            .padding(.trailing, 8)
            
            // Dropdown menu
            if isMenuActive {
                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: 60)
                    
                    VStack(spacing: 0) {
                        Button(action: onGoToWorkspace) {
                            HStack(spacing: 12) {
                                Image(systemName: "briefcase")
                                    .font(.system(size: 20))
                                    .foregroundColor(.gray)
                                    .frame(width: 20)
                                Text("Go to workspace")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.primary)
                                Spacer()
                            }
                            .padding(16)
                            .background(Color.white)
                        }
                        
                        Divider()
                        
                        Button(action: onDuplicate) {
                            HStack(spacing: 12) {
                                Image(systemName: "doc.on.doc")
                                    .font(.system(size: 20))
                                    .foregroundColor(.gray)
                                    .frame(width: 20)
                                Text("Duplicate Workspace")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.primary)
                                Spacer()
                            }
                            .padding(16)
                            .background(Color.white)
                        }
                        
                        Divider()
                        
                        Button(action: onDelete) {
                            HStack(spacing: 12) {
                                Image(systemName: "trash")
                                    .font(.system(size: 20))
                                    .foregroundColor(.red)
                                    .frame(width: 20)
                                Text("Delete workspace")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.red)
                                Spacer()
                            }
                            .padding(16)
                            .background(Color.white)
                        }
                    }
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
                    .frame(width: 256)
                    .offset(x: -20, y: 8)
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
    }
}

// MARK: - New Workspace View

struct NewWorkspaceView: View {
    @Environment(\.dismiss) var dismiss
    @State private var workspaceName = ""
    @State private var currency = "KSH - KSh"
    @State private var avatar = ""
    @State private var isCreating = false
    @State private var showCurrencyPicker = false
    
    let onComplete: () -> Void
    
    private var displayAvatar: String {
        avatar.isEmpty ? (workspaceName.isEmpty ? "W" : String(workspaceName.prefix(1)).uppercased()) : avatar
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(red: 0.93, green: 0.98, blue: 0.95),
                        Color(red: 0.88, green: 0.98, blue: 0.88),
                        Color(red: 0.93, green: 0.98, blue: 0.95)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Content
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            // Description
                            Text("Track receipts, reimburse expenses, manage travel, send invoices, and more.")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                                .padding(.top, 8)
                            
                            // Avatar
                            HStack {
                                Spacer()
                                ZStack(alignment: .bottomTrailing) {
                                    RoundedRectangle(cornerRadius: 24)
                                        .fill(
                                            LinearGradient(
                                                colors: [
                                                    Color(red: 0.05, green: 0.51, blue: 0.31),
                                                    Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.8)
                                                ],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 128, height: 128)
                                        .overlay(
                                            Text(displayAvatar)
                                                .font(.system(size: 52, weight: .bold))
                                                .foregroundColor(.white)
                                        )
                                    
                                    Button(action: {
                                        // Photo picker
                                    }) {
                                        Circle()
                                            .fill(Color.white)
                                            .frame(width: 48, height: 48)
                                            .overlay(
                                                Circle()
                                                    .stroke(Color(red: 0.93, green: 0.98, blue: 0.95), lineWidth: 4)
                                            )
                                            .overlay(
                                                Image(systemName: "camera.fill")
                                                    .font(.system(size: 20))
                                                    .foregroundColor(.gray)
                                            )
                                    }
                                }
                                Spacer()
                            }
                            .padding(.vertical, 16)
                            
                            // Workspace Name
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Workspace name")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.secondary)
                                
                                TextField("Terpmail's Workspace", text: $workspaceName)
                                    .font(.system(size: 16))
                                    .padding(16)
                                    .background(Color.white)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color(red: 0.05, green: 0.51, blue: 0.31), lineWidth: 2)
                                    )
                                    .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                            }
                            
                            // Currency Selector
                            Button(action: {
                                showCurrencyPicker = true
                            }) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Default currency")
                                        .font(.system(size: 14))
                                        .foregroundColor(.secondary)
                                    
                                    HStack {
                                        Text(currency)
                                            .font(.system(size: 16, weight: .medium))
                                            .foregroundColor(.primary)
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 16))
                                            .foregroundColor(.gray)
                                    }
                                }
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
                                )
                                .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        .padding(16)
                    }
                    
                    // Confirm Button
                    VStack {
                        Button(action: handleConfirm) {
                            Group {
                                if isCreating {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Confirm")
                                        .font(.system(size: 18, weight: .semibold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.05, green: 0.51, blue: 0.31),
                                        Color(red: 0.05, green: 0.51, blue: 0.31)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                        }
                        .disabled(workspaceName.isEmpty || isCreating)
                        .opacity((workspaceName.isEmpty || isCreating) ? 0.5 : 1.0)
                        .padding(16)
                    }
                    .background(Color.white)
                    .overlay(
                        Rectangle()
                            .fill(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2))
                            .frame(height: 1),
                        alignment: .top
                    )
                }
            }
            .navigationTitle("Confirm Workspace")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.primary)
                    }
                }
            }
            .sheet(isPresented: $showCurrencyPicker) {
                CurrencyPickerView(selectedCurrency: $currency)
            }
        }
    }
    
    private func handleConfirm() {
        guard !workspaceName.isEmpty else { return }
        
        isCreating = true
        
        Task {
            do {
                let parts = currency.split(separator: " - ")
                let currencyCode = String(parts[0])
                let currencySymbol = String(parts[1])
                
                _ = try await API.shared.createWorkspace(
                    name: workspaceName.trimmingCharacters(in: .whitespacesAndNewlines),
                    avatar: displayAvatar,
                    currency: currencyCode,
                    currencySymbol: currencySymbol
                )
                
                await MainActor.run {
                    onComplete()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isCreating = false
                    print("Failed to create workspace: \(error)")
                }
            }
        }
    }
}

struct CurrencyPickerView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedCurrency: String
    @State private var searchText = ""
    
    let currencies = [
        ("KSH", "KSh", "Kenyan Shilling"),
        ("USD", "$", "US Dollar"),
        ("EUR", "€", "Euro"),
        ("GBP", "£", "British Pound"),
        ("JPY", "¥", "Japanese Yen"),
        ("AUD", "A$", "Australian Dollar"),
        ("CAD", "C$", "Canadian Dollar"),
        ("CHF", "CHF", "Swiss Franc"),
        ("CNY", "¥", "Chinese Yuan"),
        ("INR", "₹", "Indian Rupee"),
        ("ZAR", "R", "South African Rand"),
        ("NGN", "₦", "Nigerian Naira"),
        ("GHS", "₵", "Ghanaian Cedi"),
        ("TZS", "TSh", "Tanzanian Shilling"),
        ("UGX", "USh", "Ugandan Shilling"),
    ]
    
    private var filteredCurrencies: [(String, String, String)] {
        if searchText.isEmpty {
            return currencies
        }
        return currencies.filter { code, _, name in
            code.lowercased().contains(searchText.lowercased()) ||
            name.lowercased().contains(searchText.lowercased())
        }
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Search currency...", text: $searchText)
                        .font(.system(size: 16))
                }
                .padding(12)
                .background(Color(red: 0.93, green: 0.98, blue: 0.95))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
                )
                .padding(16)
                
                // Currency List
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(filteredCurrencies, id: \.0) { code, symbol, name in
                            let displayString = "\(code) - \(symbol)"
                            let isSelected = selectedCurrency.starts(with: code)
                            
                            Button(action: {
                                selectedCurrency = displayString
                                dismiss()
                            }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(displayString)
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(.primary)
                                        Text(name)
                                            .font(.system(size: 14))
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    if isSelected {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 18, weight: .semibold))
                                            .foregroundColor(Color(red: 0.05, green: 0.51, blue: 0.31))
                                    }
                                }
                                .padding(16)
                                .background(isSelected ? Color(red: 0.93, green: 0.98, blue: 0.95) : Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            isSelected ? Color(red: 0.05, green: 0.51, blue: 0.31) : Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2),
                                            lineWidth: isSelected ? 2 : 1
                                        )
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Select Currency")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                }
            }
        }
    }
}

#Preview {
    WorkspacesPage()
}
