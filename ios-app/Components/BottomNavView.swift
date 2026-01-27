import SwiftUI

// EXACT match to web app's bottom navigation
struct BottomNavView: View {
    @Binding var selectedTab: Tab
    
    enum Tab: String, CaseIterable {
        case inbox = "Inbox"
        case reports = "Reports"
        case create = "Create"
        case workspaces = "Workspaces"
        case account = "Account"
        
        var icon: String {
            switch self {
            case .inbox: return "house.fill"
            case .reports: return "doc.text.fill"
            case .create: return "plus.circle.fill"
            case .workspaces: return "briefcase.fill"
            case .account: return "person.fill"
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Top border
            Rectangle()
                .fill(Color(red: 0.2, green: 0.7, blue: 0.4).opacity(0.2))
                .frame(height: 1)
            
            HStack(spacing: 0) {
                ForEach(Tab.allCases, id: \.self) { tab in
                    Button(action: {
                        selectedTab = tab
                    }) {
                        VStack(spacing: 4) {
                            Image(systemName: tab.icon)
                                .font(.system(size: 24))
                                .foregroundColor(selectedTab == tab ? 
                                    Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                    Color.gray)
                            
                            Text(tab.rawValue)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(selectedTab == tab ? 
                                    Color(red: 0.2, green: 0.7, blue: 0.4) : 
                                    Color.gray)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
            }
            .padding(.horizontal, 8)
            .padding(.top, 8)
            .padding(.bottom, 12)
        }
        .background(
            Color.white.opacity(0.8)
                .background(.ultraThinMaterial)
        )
        .safeAreaInset(edge: .bottom) { Color.clear.frame(height: 0) }
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: -2)
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
        BottomNavView(selectedTab: .constant(.inbox))
    }
}
