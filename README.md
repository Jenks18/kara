# Kara - Fuel Expense Tracker 🚗⛽

A mobile-first web application for tracking fuel expenses in Kenya, inspired by Expensify with a focus on fuel receipts and mileage tracking.

![Kara App](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat&logo=tailwind-css)

## ✨ Features

- 📱 **Mobile-First Design** - Optimized for smartphones with thumb-friendly navigation
- 📸 **Quick Receipt Capture** - Floating action button for instant photo capture
- 💰 **Expense Tracking** - Track fuel expenses with amounts, dates, and locations
- 📊 **Reports Dashboard** - View and filter your expense reports
- 🎨 **Beautiful Dark Theme** - Modern dark green aesthetic with smooth animations
- 🚀 **PWA Ready** - Install as a mobile app for native-like experience

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kara.git
cd kara
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Screens

### Inbox (Home)
- Dashboard with monthly stats
- Recent expense cards
- Message notifications
- Quick access to all features

### Reports
- Searchable expense list
- Filter by category (All, Fuel, Paid, Pending)
- Detailed expense information

### Create
- Multiple creation options:
  - Create expense
  - Track distance
  - Start chat
  - New workspace
  - Test drive tutorial

### Workspaces
- Empty state with call-to-action
- Enhanced security features
- Domain management

### Account
- User profile settings
- Subscription management (Trial badge)
- Wallet and payment settings
- Preferences and security
- Help and support resources

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com)

## 🎨 Design System

The app follows a comprehensive design system with:

- **Color Palette**: Dark green theme with primary, success, warning, and danger colors
- **Typography**: System fonts optimized for readability
- **Components**: Reusable Button, Card, Badge, and navigation components
- **Spacing**: Consistent 4px grid system
- **Animations**: Smooth transitions and micro-interactions

See the full design system in the project documentation.

## 📦 Project Structure

```
kara/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home/Inbox page
│   ├── reports/           # Reports page
│   ├── create/            # Create page
│   ├── workspaces/        # Workspaces page
│   ├── account/           # Account settings page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── CategoryPill.tsx
│   │   ├── FAB.tsx
│   │   └── EmptyState.tsx
│   ├── expense/           # Expense-specific components
│   │   ├── ExpenseCard.tsx
│   │   └── StatsCard.tsx
│   └── navigation/        # Navigation components
│       ├── BottomNav.tsx
│       └── Header.tsx
├── public/                # Static assets
└── tailwind.config.ts     # Tailwind configuration
```

## 🚀 Deployment to Vercel

### Deploy Now

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/kara)

### Manual Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Follow the prompts to complete deployment

### Environment Variables

No environment variables are required for the initial deployment. The app works out of the box!

## 🗺️ Roadmap

- [ ] OCR receipt scanning with AI
- [ ] Real-time expense sync
- [ ] Multi-currency support
- [ ] Export to PDF/CSV
- [ ] Team collaboration features
- [ ] Integration with accounting software
- [ ] Offline support with service workers
- [ ] Push notifications
- [ ] Biometric authentication

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- Design inspired by [Expensify](https://www.expensify.com/)
- UI patterns from modern fintech apps
- Built with love for Kenya 🇰🇪

---

**Built with ❤️ for fuel expense tracking in Kenya**
