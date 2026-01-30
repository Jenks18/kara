import SwiftUI

struct WorkspacesPage: View {
    @State private var workspaces: [Workspace] = []
    @State private var isLoading = true
    @State private var showCreateSheet = false
    
    var body: some View {
        ZStack {
            // Light emerald/mint background
            Color(red: 0.925, green: 0.992, blue: 0.961)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header - white background with title and search icon
                HStack {
                    Text("Workspaces")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.black)
                    
                    Spacer()
                    
                    Button(action: {
                        // TODO: Implement search
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
                        .fill(Color(red: 0.820, green: 0.980, blue: 0.898).opacity(0.3))
                        .frame(height: 1),
                    alignment: .bottom
                )
                
                // Content
                ScrollView {
                    VStack(spacing: 16) {
                        if isLoading {
                            ProgressView()
                                .tint(Color(red: 0.063, green: 0.725, blue: 0.506))
                                .padding(.top, 60)
                        } else if workspaces.isEmpty {
                            // Empty state
                            VStack(spacing: 16) {
                                Image(systemName: "briefcase")
                                    .font(.system(size: 60))
                                    .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506).opacity(0.3))
                                
                                Text("No workspaces yet")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(.black)
                                
                                Text("Create your first workspace to organize expenses")
                                    .font(.system(size: 15))
                                    .foregroundColor(.gray)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.top, 60)
                        } else {
                            // Workspace cards
                            ForEach(workspaces) { workspace in
                                WorkspaceCardView(workspace: workspace)
                            }
                            
                            // Add workspace button
                            Button(action: { showCreateSheet = true }) {
                                HStack {
                                    Image(systemName: "plus")
                                        .font(.system(size: 20, weight: .semibold))
                                    Text("Add workspace")
                                        .font(.system(size: 17, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color(red: 0.063, green: 0.725, blue: 0.506))
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 100)
                }
                .refreshable {
                    await loadWorkspaces()
                }
            }
            .sheet(isPresented: $showCreateSheet) {
                CreateWorkspaceSheet(onCreate: { workspace in
                    workspaces.append(workspace)
                })
            }
            .onAppear {
                Task {
                    await loadWorkspaces()
                }
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
}

// Workspace card view matching screenshot
struct WorkspaceCardView: View {
    let workspace: Workspace
    @State private var showMenu = false
    
    var body: some View {
        HStack(spacing: 12) {
            // Green circular avatar with initials
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(red: 0.063, green: 0.725, blue: 0.506))
                    .frame(width: 56, height: 56)
                
                Text(workspace.initials)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
            }
            
            // Workspace info
            VStack(alignment: .leading, spacing: 2) {
                Text(workspace.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.black)
                
                Text("\(workspace.currency) - \(currencySymbol)")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            // Three dots menu button
            Button(action: { showMenu = true }) {
                Image(systemName: "ellipsis")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.gray)
                    .rotationEffect(.degrees(90))
                    .frame(width: 44, height: 44)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
        .confirmationDialog("Workspace Options", isPresented: $showMenu) {
            Button("Edit") {
                // TODO: Show edit sheet
            }
            Button("Delete", role: .destructive) {
                // TODO: Show delete confirmation
            }
            Button("Cancel", role: .cancel) {}
        }
    }
    
    private var currencySymbol: String {
        switch workspace.currency {
        case "KES": return "KSh"
        case "USD": return "$"
        case "EUR": return "€"
        case "GBP": return "£"
        case "TZS": return "TSh"
        case "UGX": return "USh"
        default: return workspace.currency
        }
    }
}

// Create workspace sheet
struct CreateWorkspaceSheet: View {
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var description = ""
    @State private var currency = "KES"
    @State private var isCreating = false
    @State private var errorMessage: String?
    
    let onCreate: (Workspace) -> Void
    
    let currencies = ["KES", "USD", "EUR", "GBP", "TZS", "UGX"]
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Workspace Name", text: $name)
                        .autocorrectionDisabled()
                    
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                        .autocorrectionDisabled()
                    
                    Picker("Currency", selection: $currency) {
                        ForEach(currencies, id: \.self) { curr in
                            Text(curr).tag(curr)
                        }
                    }
                } header: {
                    Text("Workspace Details")
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.system(size: 14))
                    }
                }
            }
            .navigationTitle("New Workspace")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button(action: createWorkspace) {
                        if isCreating {
                            ProgressView()
                        } else {
                            Text("Create")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(name.isEmpty || isCreating)
                }
            }
        }
    }
    
    private func createWorkspace() {
        isCreating = true
        errorMessage = nil
        
        Task {
            do {
                let workspace = try await API.shared.createWorkspace(
                    name: name,
                    description: description.isEmpty ? nil : description,
                    currency: currency
                )
                
                await MainActor.run {
                    onCreate(workspace)
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isCreating = false
                    errorMessage = "Failed to create workspace. Please try again."
                    print("Create workspace error: \(error)")
                }
            }
        }
    }
}

#Preview {
    WorkspacesPage()
}
