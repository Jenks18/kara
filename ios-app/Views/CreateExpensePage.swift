import SwiftUI

struct CreateExpensePage: View {
    @State private var showReceiptCapture = false
    
    var body: some View {
        ZStack {
            // Light emerald gradient matching web app
            LinearGradient(
                colors: [
                    Color(red: 0.925, green: 0.992, blue: 0.961),
                    Color(red: 0.937, green: 0.992, blue: 0.937),
                    Color(red: 0.820, green: 0.980, blue: 0.898)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            // Content - No header, start directly with cards
            ScrollView {
                VStack(spacing: 16) {
                    // Scan Receipt Card
                    CreateOptionCard(
                        icon: "doc.text.fill",
                        title: "Scan Receipt",
                        description: "Capture fuel receipt with camera",
                        iconColor: Color(red: 0.063, green: 0.725, blue: 0.506)
                    ) {
                        showReceiptCapture = true
                    }
                    
                    // Start Chat Card
                    CreateOptionCard(
                        icon: "bubble.left.fill",
                        title: "Start chat",
                        description: "Message your manager or team",
                        iconColor: Color(red: 0.063, green: 0.725, blue: 0.506)
                    ) {
                        // TODO: Open chat
                    }
                    
                    // Create Report Card
                    CreateOptionCard(
                        icon: "doc.text.fill",
                        title: "Create report",
                        description: "Create a new expense report",
                        iconColor: Color(red: 0.063, green: 0.725, blue: 0.506)
                    ) {
                        // TODO: Open create report
                    }
                }
                .padding(16)
                .padding(.top, 60) // Space from top
                .padding(.bottom, 16)
            }
        }
        .fullScreenCover(isPresented: $showReceiptCapture) {
            ReceiptCapture()
        }
    }
}

// Create Option Card Component (matching web app)
struct CreateOptionCard: View {
    let icon: String
    let title: String
    let description: String
    let iconColor: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // Icon circle
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.15))
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: icon)
                        .font(.system(size: 24))
                        .foregroundColor(iconColor)
                }
                
                // Text content
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.black)
                    
                    Text(description)
                        .font(.system(size: 15))
                        .foregroundColor(.gray)
                }
                
                Spacer()
            }
            .padding(20)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
    }
}
