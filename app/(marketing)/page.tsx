import Link from 'next/link'
import { Smartphone, Cloud, Shield, Zap, TrendingUp, ArrowRight, CheckCircle, Receipt } from 'lucide-react'
import { KachaLogo } from '@/components/KachaLogo'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-18">
            {/* Logo */}
            <KachaLogo variant="inline" className="h-14 w-auto" />

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="#features" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium">
                Features
              </Link>
              <Link href="#how-it-works" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium">
                How it works
              </Link>
              <Link href="/privacy-policy" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium">
                Privacy
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="https://web.kachalabs.com/sign-in"
                className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="https://web.kachalabs.com/sign-up"
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-semibold shadow-sm"
              >
                Get started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 to-white pt-16 pb-20 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-36">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/60 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">

            {/* Left: Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Now available on iOS & Android
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
                Expense tracking
                <span className="block text-blue-600">made effortless</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-500 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Snap a receipt, Kacha does the rest. AI extracts the data, sorts it by category, and builds your expense reports automatically.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                <Link
                  href="https://web.kachalabs.com/sign-up"
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-7 py-3.5 rounded-xl hover:bg-blue-700 transition-colors text-base font-semibold shadow-lg shadow-blue-600/20"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-7 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-base font-medium"
                >
                  See how it works
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-gray-500">
                {['Free to start', 'No credit card required', 'iOS & Android'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Dashboard mockup */}
            <div className="hidden lg:block relative mt-12 lg:mt-0">
              <div className="relative">
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-3xl blur-2xl scale-110" />
                {/* Mock window */}
                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                  {/* Window chrome */}
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-3.5 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">
                      web.kachalabs.com/home
                    </div>
                  </div>
                  {/* Mock dashboard content */}
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">This month</p>
                        <p className="text-2xl font-bold text-gray-900">KES 84,230</p>
                      </div>
                      <div className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        ↓ 12% vs last month
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { name: 'Java House', cat: 'Meals', amount: 'KES 1,450', color: 'bg-orange-100 text-orange-600' },
                        { name: 'Uber Ride', cat: 'Transport', amount: 'KES 680', color: 'bg-blue-100 text-blue-600' },
                        { name: 'Naivas Supermarket', cat: 'Groceries', amount: 'KES 3,200', color: 'bg-green-100 text-green-600' },
                        { name: 'Safaricom Data', cat: 'Utilities', amount: 'KES 500', color: 'bg-purple-100 text-purple-600' },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                          <div className={`w-2 h-2 rounded-full ${item.color.split(' ')[0]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            <p className={`text-xs font-medium ${item.color} inline-block px-1.5 py-0.5 rounded-full mt-0.5`}>{item.cat}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{item.amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────── */}
      <section className="bg-blue-600 py-12 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: '10k+', label: 'Receipts scanned' },
              { value: '98%', label: 'OCR accuracy' },
              { value: '3 sec', label: 'Avg scan time' },
              { value: 'iOS & Android', label: 'Available on' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-bold mb-1">{stat.value}</p>
                <p className="text-blue-200 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Three steps to zero paperwork
            </h2>
            <p className="text-lg text-gray-500">
              From receipt to report in under a minute.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200" />

            {[
              {
                step: '01',
                icon: <Smartphone className="w-6 h-6 text-blue-600" />,
                title: 'Snap your receipt',
                desc: 'Open Kacha on your phone and take a photo. Works with paper receipts, digital screens, and QR codes.',
              },
              {
                step: '02',
                icon: <Zap className="w-6 h-6 text-blue-600" />,
                title: 'AI extracts the data',
                desc: 'Our OCR engine reads the merchant, amount, date, and category — no manual entry needed.',
              },
              {
                step: '03',
                icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
                title: 'Reports build themselves',
                desc: 'Expenses are automatically organized into reports by workspace, ready to export at any time.',
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <div className="flex flex-col items-center md:items-start gap-4">
                  <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 relative">
                    {item.icon}
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.step.replace('0', '')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything in one place
            </h2>
            <p className="text-lg text-gray-500">
              Built for people who'd rather spend time on their work than their admin.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Receipt className="w-6 h-6 text-blue-600" />,
                title: 'Smart Scanning',
                desc: 'AI-powered OCR extracts amounts, dates, merchant names, and categories automatically from any receipt.',
                badge: 'AI-powered',
              },
              {
                icon: <Smartphone className="w-6 h-6 text-blue-600" />,
                title: 'Native Mobile Apps',
                desc: 'Full-featured iOS and Android apps with offline capture. Your receipts sync the moment you\'re back online.',
                badge: 'iOS + Android',
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
                title: 'Workspace Management',
                desc: 'Separate expenses by project, team, or client. Invite members and manage permissions per workspace.',
                badge: 'Team-ready',
              },
              {
                icon: <Zap className="w-6 h-6 text-blue-600" />,
                title: 'Instant Reports',
                desc: 'Generate professional expense reports in seconds. Export to PDF or share a link with your accountant.',
                badge: 'One click',
              },
              {
                icon: <Cloud className="w-6 h-6 text-blue-600" />,
                title: 'Real-time Sync',
                desc: 'Everything syncs instantly across your phone, tablet, and the web. Always up to date, on every device.',
                badge: 'Always synced',
              },
              {
                icon: <Shield className="w-6 h-6 text-blue-600" />,
                title: 'Secure by Default',
                desc: 'Row-level encryption, secure auth via Clerk, and complete data ownership. You can delete everything, anytime.',
                badge: 'Private',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    {feature.icon}
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl overflow-hidden px-8 py-16 sm:px-16 text-center lg:text-left lg:flex lg:items-center lg:justify-between lg:gap-12">
            {/* Background blur circles */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

            <div className="relative lg:max-w-2xl">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Stop losing receipts.<br className="hidden sm:block" /> Start using Kacha.
              </h2>
              <p className="text-blue-200 text-lg mb-0 lg:mb-0">
                Free to start. No credit card. Available on web, iOS, and Android.
              </p>
            </div>

            <div className="relative mt-8 lg:mt-0 flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
              <Link
                href="https://web.kachalabs.com/sign-up"
                className="flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-base font-semibold shadow-lg"
              >
                Get started for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://web.kachalabs.com/sign-in"
                className="flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors text-base font-medium"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Brand col */}
            <div className="col-span-2 lg:col-span-2">
              <div className="mb-4">
                <span className="text-xl font-bold text-white tracking-tight">Kacha</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                Modern expense management for individuals and teams. Scan receipts, track spending, generate reports.
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  href="https://web.kachalabs.com/sign-up"
                  className="text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get started free
                </Link>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
                <li><Link href="https://web.kachalabs.com" className="hover:text-white transition-colors">Web app</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            {/* Download */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Download</h4>
              <ul className="space-y-3 text-sm">
                <li><span className="text-gray-600">iOS — coming soon</span></li>
                <li><span className="text-gray-600">Android — coming soon</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>© 2026 Kachalabs, Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy</Link>
              <Link href="/terms-of-service" className="hover:text-gray-400 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
