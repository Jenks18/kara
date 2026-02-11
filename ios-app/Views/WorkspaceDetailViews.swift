import SwiftUI
import PhotosUI

// MARK: - Workspace Detail View

struct WorkspaceDetailView: View {
    let workspaceId: String
    @State private var workspace: Workspace?
    @State private var isLoading = true
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
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
            
            if isLoading {
                ProgressView("Loading...")
            } else if let workspace = workspace {
                ScrollView {
                    VStack(spacing: 12) {
                        // Overview
                        NavigationLink(destination: WorkspaceOverviewView(workspaceId: workspaceId)) {
                            WorkspaceMenuRow(icon: "doc.text", label: "Overview")
                        }
                        
                        // Members
                        NavigationLink(destination: WorkspaceMembersView(workspaceId: workspaceId)) {
                            WorkspaceMenuRow(icon: "person.2", label: "Members")
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 100)
                }
            } else {
                Text("Workspace not found")
                    .foregroundColor(.secondary)
            }
        }
        .navigationTitle(workspace?.name ?? "Workspace")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadWorkspace()
        }
    }
    
    private func loadWorkspace() async {
        isLoading = true
        do {
            workspace = try await API.shared.getWorkspace(id: workspaceId)
        } catch {
            print("Error loading workspace: \(error)")
        }
        isLoading = false
    }
}

struct WorkspaceMenuRow: View {
    let icon: String
    let label: String
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(Color(red: 0.05, green: 0.51, blue: 0.31))
                .frame(width: 24)
            
            Text(label)
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(.primary)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
    }
}

// MARK: - Workspace Overview View

struct WorkspaceOverviewView: View {
    let workspaceId: String
    @State private var workspace: Workspace?
    @State private var isLoading = true
    @State private var showMoreMenu = false
    @State private var showInviteModal = false
    @State private var showShareModal = false
    @State private var showDeleteConfirm = false
    @State private var showAvatarMenu = false
    @State private var showImagePicker = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploadingAvatar = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
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
            
            if isLoading {
                ProgressView("Loading...")
            } else if let workspace = workspace {
                ScrollView {
                    VStack(spacing: 24) {
                        // Top Actions
                        HStack(spacing: 12) {
                            Button(action: {
                                showInviteModal = true
                            }) {
                                HStack {
                                    Image(systemName: "person.badge.plus")
                                        .font(.system(size: 20))
                                    Text("Invite")
                                        .font(.system(size: 16, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                                .cornerRadius(12)
                            }
                            
                            Menu {
                                Button(action: {
                                    showShareModal = true
                                }) {
                                    Label("Share", systemImage: "square.and.arrow.up")
                                }
                                
                                Button(role: .destructive, action: {
                                    showDeleteConfirm = true
                                }) {
                                    Label("Delete", systemImage: "trash")
                                }
                            } label: {
                                HStack {
                                    Text("More")
                                        .font(.system(size: 16, weight: .semibold))
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 14))
                                }
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
                                )
                                .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                            }
                        }
                        .padding(.horizontal, 16)
                        
                        // Workspace Avatar
                        HStack {
                            Spacer()
                            ZStack(alignment: .bottomTrailing) {
                                RoundedRectangle(cornerRadius: 16)
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
                                    .frame(width: 96, height: 96)
                                    .overlay(
                                        Group {
                                            if isUploadingAvatar {
                                                ProgressView()
                                                    .tint(.white)
                                            } else if let url = workspace.avatarURL {
                                                AsyncImage(url: url) { image in
                                                    image.resizable().aspectRatio(contentMode: .fill)
                                                } placeholder: {
                                                    Text(workspace.initials)
                                                        .font(.system(size: 36, weight: .bold))
                                                        .foregroundColor(.white)
                                                }
                                                .frame(width: 96, height: 96)
                                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                            } else {
                                                Text(workspace.initials)
                                                    .font(.system(size: 36, weight: .bold))
                                                    .foregroundColor(.white)
                                            }
                                        }
                                    )
                                
                                Button(action: {
                                    showAvatarMenu = true
                                }) {
                                    Circle()
                                        .fill(Color.white)
                                        .frame(width: 32, height: 32)
                                        .overlay(
                                            Circle()
                                                .stroke(Color(red: 0.93, green: 0.98, blue: 0.95), lineWidth: 2)
                                        )
                                        .overlay(
                                            Image(systemName: "pencil")
                                                .font(.system(size: 14, weight: .medium))
                                                .foregroundColor(.gray)
                                        )
                                }
                                .disabled(isUploadingAvatar)
                            }
                            Spacer()
                        }
                        
                        // Settings Sections
                        VStack(spacing: 16) {
                            // Workspace name
                            NavigationLink(destination: EditWorkspaceNameView(workspaceId: workspaceId, currentName: workspace.name)) {
                                OverviewFieldRow(label: "Workspace name", value: workspace.name)
                            }
                            
                            // Description
                            NavigationLink(destination: EditWorkspaceDescriptionView(workspaceId: workspaceId, currentDescription: workspace.description ?? "")) {
                                OverviewFieldRow(
                                    label: "Description",
                                    value: workspace.description ?? "One place for all your receipts and expenses."
                                )
                            }
                            
                            // Default currency
                            NavigationLink(destination: EditWorkspaceCurrencyView(workspaceId: workspaceId, currentCurrency: workspace.currency)) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Default currency")
                                        .font(.system(size: 12))
                                        .foregroundColor(.secondary)
                                    Text("\(workspace.currency) - \(workspace.displayCurrencySymbol)")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.primary)
                                    Text("All expenses on this workspace will be converted to this currency.")
                                        .font(.system(size: 12))
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
                                )
                                .overlay(
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 20))
                                        .foregroundColor(.secondary)
                                        .padding(.trailing, 16),
                                    alignment: .trailing
                                )
                                .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                                .padding(.horizontal, 16)
                            }
                            
                            // Company address
                            NavigationLink(destination: EditWorkspaceAddressView(workspaceId: workspaceId, currentAddress: workspace.address ?? "")) {
                                OverviewFieldRow(
                                    label: "Company address",
                                    value: workspace.address ?? "Add company address"
                                )
                            }
                        }
                    }
                    .padding(.bottom, 100)
                }
            }
        }
        .navigationTitle("Overview")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showInviteModal) {
            InviteModal(workspaceName: workspace?.name ?? "")
        }
        .sheet(isPresented: $showShareModal) {
            ShareWorkspaceModal(workspaceId: workspaceId, workspaceName: workspace?.name ?? "")
        }
        .confirmationDialog("Delete workspace?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task {
                    await deleteWorkspace()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete \"\(workspace?.name ?? "this workspace")\"? This action cannot be undone and all data will be permanently lost.")
        }
        .confirmationDialog("Change workspace image", isPresented: $showAvatarMenu, titleVisibility: .visible) {
            Button("Choose from gallery") {
                showImagePicker = true
            }
            if workspace?.avatarURL != nil {
                Button("Remove image", role: .destructive) {
                    Task {
                        await removeAvatar()
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        }
        .photosPicker(isPresented: $showImagePicker, selection: $selectedPhotoItem, matching: .images)
        .onChange(of: selectedPhotoItem) { newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self) {
                    await uploadAvatar(imageData: data)
                }
            }
        }
        .task {
            await loadWorkspace()
        }
    }
    
    private func loadWorkspace() async {
        isLoading = true
        do {
            workspace = try await API.shared.getWorkspace(id: workspaceId)
        } catch {
            print("Error loading workspace: \(error)")
        }
        isLoading = false
    }
    
    private func deleteWorkspace() async {
        do {
            try await API.shared.deleteWorkspace(id: workspaceId)
            await MainActor.run {
                dismiss()
            }
        } catch {
            print("Error deleting workspace: \(error)")
        }
    }
    
    private func uploadAvatar(imageData: Data) async {
        isUploadingAvatar = true
        do {
            let result = try await API.shared.uploadWorkspaceAvatar(
                workspaceId: workspaceId,
                imageData: imageData,
                fileName: "avatar.jpg"
            )
            
            await MainActor.run {
                workspace?.avatarURL = result.url
                isUploadingAvatar = false
                selectedPhotoItem = nil
                print("Avatar uploaded successfully: \(result.url?.absoluteString ?? "")")
            }
        } catch {
            await MainActor.run {
                isUploadingAvatar = false
                selectedPhotoItem = nil
                print("Error uploading avatar: \(error)")
                // TODO: Show error alert
            }
        }
    }
    
    private func removeAvatar() async {
        do {
            let updatedWorkspace = try await API.shared.updateWorkspace(
                id: workspaceId,
                name: nil,
                description: nil,
                currency: nil,
                avatar: "" // Empty string removes avatar
            )
            
            await MainActor.run {
                workspace = updatedWorkspace
                print("Avatar removed successfully")
            }
        } catch {
            print("Error removing avatar: \(error)")
            // TODO: Show error alert
        }
    }
}

struct OverviewFieldRow: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
        )
        .overlay(
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(.secondary)
                .padding(.trailing, 16),
            alignment: .trailing
        )
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
        .padding(.horizontal, 16)
    }
}

// MARK: - Workspace Members View

struct WorkspaceMembersView: View {
    let workspaceId: String
    @State private var workspace: Workspace?
    @State private var members: [WorkspaceMember] = []
    @State private var isLoading = true
    @State private var showInviteModal = false
    @State private var showShareModal = false
    @State private var showDeleteConfirm = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
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
            
            if isLoading {
                ProgressView("Loading...")
            } else {
                ScrollView {
                    VStack(spacing: 24) {
                        // Top Actions
                        HStack(spacing: 12) {
                            Button(action: {
                                showInviteModal = true
                            }) {
                                HStack {
                                    Image(systemName: "person.badge.plus")
                                        .font(.system(size: 20))
                                    Text("Invite")
                                        .font(.system(size: 16, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                                .cornerRadius(12)
                            }
                            
                            Menu {
                                Button(action: {
                                    showShareModal = true
                                }) {
                                    Label("Share", systemImage: "square.and.arrow.up")
                                }
                                
                                Button(role: .destructive, action: {
                                    showDeleteConfirm = true
                                }) {
                                    Label("Delete", systemImage: "trash")
                                }
                            } label: {
                                HStack {
                                    Text("More")
                                        .font(.system(size: 16, weight: .semibold))
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 14))
                                }
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
                                )
                                .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
                            }
                        }
                        .padding(.horizontal, 16)
                        
                        // Total members count
                        Text("Total workspace members: \(members.count)")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16)
                        
                        // Members table header
                        HStack {
                            Text("Member")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("Role")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 32)
                        
                        // Members List
                        VStack(spacing: 8) {
                            ForEach(members) { member in
                                MemberRow(member: member)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.vertical, 16)
                    .padding(.bottom, 100)
                }
            }
        }
        .navigationTitle("Members")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showInviteModal) {
            InviteModal(workspaceName: workspace?.name ?? "")
        }
        .sheet(isPresented: $showShareModal) {
            ShareWorkspaceModal(workspaceId: workspaceId, workspaceName: workspace?.name ?? "")
        }
        .confirmationDialog("Delete workspace?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task {
                    await deleteWorkspace()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete \"\(workspace?.name ?? "this workspace")\"? This action cannot be undone and all data will be permanently lost.")
        }
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        isLoading = true
        do {
            workspace = try await API.shared.getWorkspace(id: workspaceId)
            members = try await API.shared.getWorkspaceMembers(workspaceId: workspaceId)
        } catch {
            print("Error loading data: \(error)")
        }
        isLoading = false
    }
    
    private func deleteWorkspace() async {
        do {
            try await API.shared.deleteWorkspace(id: workspaceId)
            await MainActor.run {
                dismiss()
            }
        } catch {
            print("Error deleting workspace: \(error)")
        }
    }
}

struct MemberRow: View {
    let member: WorkspaceMember
    
    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
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
                .frame(width: 48, height: 48)
                .overlay(
                    Group {
                        if let imageUrl = member.avatarImageUrl, let url = URL(string: imageUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Text(member.email.prefix(1).uppercased())
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .frame(width: 48, height: 48)
                            .clipShape(Circle())
                        } else {
                            Text(member.avatarEmoji ?? member.email.prefix(1).uppercased())
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                )
            
            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(member.displayName ?? member.email)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.primary)
                
                if let displayName = member.displayName {
                    Text(member.email)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Role badge
            Text(member.role.capitalized)
                .font(.system(size: 14, weight: .medium))
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(
                    member.role == "admin" ?
                    Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.1) :
                    Color.gray.opacity(0.1)
                )
                .foregroundColor(
                    member.role == "admin" ?
                    Color(red: 0.05, green: 0.51, blue: 0.31) :
                    Color.gray
                )
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            member.role == "admin" ?
                            Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2) :
                            Color.gray.opacity(0.2),
                            lineWidth: 1
                        )
                )
            
            Image(systemName: "chevron.right")
                .font(.system(size: 20))
                .foregroundColor(.secondary)
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
}

// MARK: - Shared Modals

struct InviteModal: View {
    let workspaceName: String
    @State private var inviteInput = ""
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text(workspaceName)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                
                TextField("Name, email, or phone number", text: $inviteInput)
                    .font(.system(size: 16))
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(red: 0.05, green: 0.51, blue: 0.31), lineWidth: 2)
                    )
                
                Button(action: {
                    // Send invite
                    dismiss()
                }) {
                    Text("Next")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                        .cornerRadius(16)
                }
                .disabled(inviteInput.isEmpty)
                .opacity(inviteInput.isEmpty ? 0.5 : 1.0)
                
                Spacer()
            }
            .padding(24)
            .navigationTitle("Invite new members")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                    }
                }
            }
        }
    }
}

struct ShareWorkspaceModal: View {
    let workspaceId: String
    let workspaceName: String
    @Environment(\.dismiss) var dismiss
    
    private var shareUrl: String {
        // In production, use actual URL
        "https://mafutapass.com/workspaces/\(workspaceId)/join"
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // QR Code placeholder
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white)
                    .frame(width: 200, height: 200)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color(red: 0.05, green: 0.51, blue: 0.31), lineWidth: 4)
                    )
                    .overlay(
                        Text("QR Code")
                            .foregroundColor(.secondary)
                    )
                    .padding(.vertical, 32)
                
                // Share URL
                VStack(alignment: .leading, spacing: 8) {
                    Text("Share link")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    Text(shareUrl)
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundColor(.primary)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(red: 0.93, green: 0.98, blue: 0.95))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(red: 0.05, green: 0.51, blue: 0.31).opacity(0.2), lineWidth: 1)
                )
                
                // Action Buttons
                HStack(spacing: 12) {
                    Button(action: {
                        UIPasteboard.general.string = shareUrl
                    }) {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                            Text("Copy Link")
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(red: 0.05, green: 0.51, blue: 0.31))
                        .cornerRadius(12)
                    }
                    
                    Button(action: {
                        // Download QR
                    }) {
                        HStack {
                            Image(systemName: "arrow.down")
                            Text("Download QR")
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color(red: 0.05, green: 0.51, blue: 0.31))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(red: 0.05, green: 0.51, blue: 0.31), lineWidth: 2)
                        )
                    }
                }
                
                Spacer()
            }
            .padding(24)
            .navigationTitle("Share workspace")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                    }
                }
            }
        }
    }
}

// MARK: - Edit Views (Placeholders)

struct EditWorkspaceNameView: View {
    let workspaceId: String
    let currentName: String
    @State private var name: String
    @State private var isSaving = false
    @Environment(\.dismiss) var dismiss
    
    init(workspaceId: String, currentName: String) {
        self.workspaceId = workspaceId
        self.currentName = currentName
        _name = State(initialValue: currentName)
    }
    
    var body: some View {
        Form {
            Section {
                TextField("Workspace name", text: $name)
            }
            
            Section {
                Button(action: {
                    Task {
                        await saveChanges()
                    }
                }) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                    }
                }
                .disabled(name.isEmpty || isSaving)
            }
        }
        .navigationTitle("Workspace Name")
    }
    
    private func saveChanges() async {
        isSaving = true
        do {
            _ = try await API.shared.updateWorkspace(id: workspaceId, updates: ["name": name])
            await MainActor.run {
                dismiss()
            }
        } catch {
            print("Error saving workspace name: \(error)")
        }
        isSaving = false
    }
}

struct EditWorkspaceDescriptionView: View {
    let workspaceId: String
    let currentDescription: String
    @State private var description: String
    @State private var isSaving = false
    @Environment(\.dismiss) var dismiss
    
    init(workspaceId: String, currentDescription: String) {
        self.workspaceId = workspaceId
        self.currentDescription = currentDescription
        _description = State(initialValue: currentDescription)
    }
    
    var body: some View {
        Form {
            Section {
                TextEditor(text: $description)
                    .frame(minHeight: 100)
            }
            
            Section {
                Button(action: {
                    Task {
                        await saveChanges()
                    }
                }) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                    }
                }
                .disabled(isSaving)
            }
        }
        .navigationTitle("Description")
    }
    
    private func saveChanges() async {
        isSaving = true
        do {
            _ = try await API.shared.updateWorkspace(id: workspaceId, updates: ["description": description])
            await MainActor.run {
                dismiss()
            }
        } catch {
            print("Error saving workspace description: \(error)")
        }
        isSaving = false
    }
}

struct EditWorkspaceCurrencyView: View {
    let workspaceId: String
    let currentCurrency: String
    @State private var selectedCurrency: String
    @State private var isSaving = false
    @Environment(\.dismiss) var dismiss
    
    let currencies = [("KSH", "KSh"), ("USD", "$"), ("EUR", "€"), ("GBP", "£"), ("JPY", "¥"), ("AUD", "A$"), ("CAD", "C$"), ("CHF", "CHF"), ("CNY", "¥"), ("INR", "₹"), ("ZAR", "R"), ("NGN", "₦"), ("GHS", "₵"), ("TZS", "TSh"), ("UGX", "USh")]
    
    init(workspaceId: String, currentCurrency: String) {
        self.workspaceId = workspaceId
        self.currentCurrency = currentCurrency
        _selectedCurrency = State(initialValue: currentCurrency)
    }
    
    var body: some View {
        ZStack {
            List(currencies, id: \.0) { code, symbol in
                Button(action: {
                    selectedCurrency = code
                    Task {
                        await saveChanges(currency: code, symbol: symbol)
                    }
                }) {
                    HStack {
                        Text(code)
                        Spacer()
                        if code == selectedCurrency {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                }
                .disabled(isSaving)
            }
            
            if isSaving {
                ProgressView()
                    .scaleEffect(1.5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black.opacity(0.1))
            }
        }
        .navigationTitle("Default Currency")
    }
    
    private func saveChanges(currency: String, symbol: String) async {
        isSaving = true
        do {
            _ = try await API.shared.updateWorkspace(id: workspaceId, updates: ["currency": currency, "currencySymbol": symbol])
            await MainActor.run {
                dismiss()
            }
        } catch {
            print("Error saving workspace currency: \(error)")
            isSaving = false
        }
    }
}

struct EditWorkspaceAddressView: View {
    let workspaceId: String
    let currentAddress: String
    @State private var address: String
    @State private var isSaving = false
    @Environment(\.dismiss) var dismiss
    
    init(workspaceId: String, currentAddress: String) {
        self.workspaceId = workspaceId
        self.currentAddress = currentAddress
        _address = State(initialValue: currentAddress)
    }
    
    var body: some View {
        Form {
            Section {
                TextEditor(text: $address)
                    .frame(minHeight: 100)
            }
            
            Section {
                Button(action: {
                    Task {
                        await saveChanges()
                    }
                }) {
                    if isSaving {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("Save")
                    }
                }
                .disabled(isSaving)
            }
        }
        .navigationTitle("Company Address")
    }
    
    private func saveChanges() async {
        isSaving = true
        do {
            _ = try await API.shared.updateWorkspace(id: workspaceId, updates: ["address": address])
            await MainActor.run {
                dismiss()
            }
        } catch {
            print("Error saving workspace address: \(error)")
        }
        isSaving = false
    }
}

#Preview {
    NavigationStack {
        WorkspaceDetailView(workspaceId: "test-id")
    }
}
