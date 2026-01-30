import SwiftUI

// EXACT match to web app's bottom navigation
// Note: Inbox hidden - chat feature not implemented yet
struct BottomNavView: View {
    @Binding var selectedTab: Tab
    
    enum Tab: String, CaseIterable {
        // case inbox = "Inbox" // Hidden - chat not set up yet
        case reports = "Reports"
        case create = "Create"
        case workspaces = "Workspaces"
        case account = "Account"
        
        var icon: String {
            switch self {
            // case .inbox: return "house.fill"
            case .reports: return "doc.text.fill"
            case .create: return "plus.circle.fill"
            case .workspaces: return "briefcase.fill"
            case .account: return "person.fill"
            }
        }
        
        var color: Color {
            Color(red: 0.2, green: 0.7, blue: 0.4) // Emerald-600
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Top border - emerald-200
            Rectangle()
                .fill(Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.2))
                .frame(height: 1)
            
            // White background with blur effect
            ZStack {
                Color.white.opacity(0.8)
                
                HStack(spacing: 0) {
                    ForEach(Tab.allCases, id: \.self) { tab in
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedTab = tab
                            }
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: tab.icon)
                                    .font(.system(size: 24, weight: selectedTab == tab ? .semibold : .regular))
                                    .foregroundColor(selectedTab == tab ? tab.color : .gray)
                                
                                Text(tab.rawValue)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(selectedTab == tab ? tab.color : .gray)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(height: 56)
        }
        .background(.ultraThinMaterial)
        .shadow(color: .black.opacity(0.1), radius: 8, y: -2)
    }
}

// Scale button style for tap animation
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

#Preview {
    VStack {
        Spacer()
        BottomNavView(selectedTab: .constant(.reports))
    }
}
