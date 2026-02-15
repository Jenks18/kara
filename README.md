# MafutaPass — AI-Powered Fuel Expense Tracker 🚗⛽

A multi-platform expense tracking app for businesses in Kenya. Photograph fuel receipts, auto-extract data via AI + eTIMS QR scanning, group expenses into reports, and manage multi-tenant workspaces.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)
![Kotlin](https://img.shields.io/badge/Kotlin-2.2-purple?style=flat&logo=kotlin)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat&logo=tailwind-css)

## Platforms

| Platform | Stack | Status |
|----------|-------|--------|
| Web | Next.js 15 + Tailwind + Clerk | Production (mafutapass.com) |
| Android | Kotlin + Jetpack Compose + Material3 + Hilt | In Development |
| iOS | SwiftUI + Clerk SDK | In Development |

## ✨ Features

- 📱 **Mobile-First Design** — Optimized for smartphones, emerald brand palette, Light/Dark/System theme
- 📸 **Smart Receipt Capture** — 3 methods: Smart Scan (ML Kit boundary detection), Quick Camera (multi-capture + real-time QR), Gallery
- 🔍 **eTIMS QR Scanning** — Real-time ML Kit Barcode Scanner detects KRA/eTIMS QR codes on camera frames
- 🤖 **AI Extraction** — Gemini 2.5 Flash with Kenyan receipt patterns, auto-detects merchant, amount, date, fuel type, litres, category
- 📊 **Confidence Scoring** — Field-level confidence (0.0–1.0), low-confidence receipts auto-tagged "Needs Review"
- ✏️ **Editable Receipts** — Inline edit mode to correct AI-extracted data, with category dropdown and save
- 💰 **Expense Reports** — Group receipts, draft/submit/approve workflow
- 🏢 **Workspaces** — Multi-tenant isolation (personal + business)
- 👤 **User Profiles** — Emoji avatar system with customizable backgrounds
- 🔒 **Backend-Only Auth** — JWT minted server-side only, no Clerk/Supabase SDK in mobile apps

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

### Web / Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.3 | Framework (App Router) |
| TypeScript | 5 | Language |
| Clerk | 6.36.6 | Web authentication |
| Supabase | 2.89.0 | Database (Postgres + RLS) + Storage |
| Tailwind CSS | 3.3.0 | Styling |
| Gemini AI | 2.5 Flash | Receipt vision + extraction |
| Sharp | 0.33.5 | Image processing |

### Android
| Technology | Version | Purpose |
|------------|---------|---------|
| Kotlin | 2.2.0 | Language |
| Jetpack Compose | BOM 2024.12.01 | UI framework |
| Hilt | 2.56.2 | Dependency injection |
| CameraX | 1.4.1 | Camera capture |
| ML Kit Barcode | 17.3.0 | Real-time QR detection |
| ML Kit Doc Scanner | 16.0.0 | Smart Scan boundary detection |
| Retrofit | 2.11.0 | Networking |

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
├── app/                       Next.js App Router
│   ├── page.tsx               Landing → redirects to /reports
│   ├── reports/               Expense reports list + [id] detail
│   ├── create/                Create new expense
│   ├── workspaces/            Workspaces list + [id] + new
│   ├── account/               Profile, preferences, security, wallet, about
│   ├── api/
│   │   ├── auth/              Mobile auth endpoints (JWT minting)
│   │   ├── mobile/            Mobile data endpoints (Bearer JWT)
│   │   └── receipts/          Web receipt upload + processing
│   └── sign-in/, sign-up/     Clerk auth pages
├── android-app/               Kotlin + Compose + Hilt
│   └── app/src/main/java/com/mafutapass/app/
│       ├── ui/screens/        AddReceiptScreen, ExpenseDetailScreen, etc.
│       ├── viewmodel/         ScanReceiptVM, ExpenseDetailVM, etc.
│       └── data/              ApiService, Models, network modules
├── ios-app/                   SwiftUI (in development)
├── lib/
│   ├── receipt-processing/
│   │   ├── orchestrator.ts    7-stage receipt pipeline
│   │   └── ocr-ai.ts         Gemini 2.5 Flash extraction + confidence
│   ├── auth/                  JWT minting + verification
│   └── supabase/              DB clients (browser, server, mobile)
├── components/                React UI components
└── migrations/                Supabase SQL migrations
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

See `ARCHITECTURE.md` section 10.2 for the full list. Key variables: `CLERK_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`.

## 🗺️ Roadmap

- [x] AI receipt scanning with Gemini 2.5 Flash
- [x] eTIMS QR code scanning (ML Kit Barcode)
- [x] Smart Scan with boundary detection (ML Kit Document Scanner)
- [x] Multi-capture camera for long receipts
- [x] Field-level confidence scoring
- [x] Editable receipt details
- [x] Backend-only JWT authentication
- [x] Kenyan date format (dd/MM/yyyy)
- [ ] Multi-currency support
- [ ] Export to PDF/CSV
- [ ] Team collaboration features (workspaces v2)
- [ ] Offline support with background sync
- [ ] Push notifications
- [ ] Play Store / App Store release

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Single source of truth: system design, API reference, database schema
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) — ADR log: every engineering decision with rationale
- [android-app/README.md](android-app/README.md) — Android build, setup, project structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

**Built with ❤️ for fuel expense tracking in Kenya 🇰🇪**
