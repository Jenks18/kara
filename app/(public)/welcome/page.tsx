import Link from 'next/link'
import { Receipt, Smartphone, Cloud, Shield, Zap, TrendingUp } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Receipt className="w-8 h-8 text-emerald-600" />
              <span className="text-2xl font-bold text-gray-900">Kacha</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-600 hover:text-emerald-600 transition-colors">
                Features
              </Link>
              <Link href="/privacy-policy" className="text-gray-600 hover:text-emerald-600 transition-colors">
                Privacy
              </Link>
              <Link href="/terms-of-service" className="text-gray-600 hover:text-emerald-600 transition-colors">
                Terms
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Get started
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Expense Management
            <span className="text-emerald-600"> Simplified</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Scan receipts, track expenses, and generate reports in seconds. 
            Built for individuals and teams who value their time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-emerald-600 text-white px-8 py-4 rounded-lg hover:bg-emerald-700 transition-colors text-lg font-medium"
            >
              Start for free
            </Link>
            <Link
              href="#features"
              className="bg-white text-emerald-600 border-2 border-emerald-600 px-8 py-4 rounded-lg hover:bg-emerald-50 transition-colors text-lg font-medium"
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* App Preview */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-3xl blur-3xl opacity-20"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 text-center">
                <Receipt className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Scan Receipts</h3>
                <p className="text-gray-600 text-sm">AI-powered receipt scanning with QR code support</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 text-center">
                <TrendingUp className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Track Expenses</h3>
                <p className="text-gray-600 text-sm">Organize expenses by category and workspace</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 text-center">
                <Zap className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Generate Reports</h3>
                <p className="text-gray-600 text-sm">Instant expense reports for accounting</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to manage expenses
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features that save you time and keep your finances organized
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="bg-emerald-100 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mobile First</h3>
              <p className="text-gray-600">
                Native Android app with offline support. Capture receipts on the go.
              </p>
            </div>

            <div className="p-6">
              <div className="bg-emerald-100 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Scanning</h3>
              <p className="text-gray-600">
                AI-powered OCR extracts amounts, dates, and merchant names automatically.
              </p>
            </div>

            <div className="p-6">
              <div className="bg-emerald-100 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cloud Sync</h3>
              <p className="text-gray-600">
                Your data syncs across all devices instantly and securely.
              </p>
            </div>

            <div className="p-6">
              <div className="bg-emerald-100 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                End-to-end encryption and complete data control. Your receipts are yours alone.
              </p>
            </div>

            <div className="p-6">
              <div className="bg-emerald-100 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Workspace Management</h3>
              <p className="text-gray-600">
                Organize expenses by project, department, or client with ease.
              </p>
            </div>

            <div className="p-6">
              <div className="bg-emerald-100 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Reports</h3>
              <p className="text-gray-600">
                Generate professional expense reports in seconds, not hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to simplify your expenses?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who save hours every month with Kacha
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-emerald-600 text-white px-8 py-4 rounded-lg hover:bg-emerald-700 transition-colors text-lg font-medium"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-6 h-6 text-emerald-600" />
                <span className="text-xl font-bold text-gray-900">Kacha</span>
              </div>
              <p className="text-gray-600 mb-4">
                Modern expense management for individuals and teams.
              </p>
              <p className="text-sm text-gray-500">
                © 2026 Kacha. All rights reserved.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#features" className="text-gray-600 hover:text-emerald-600">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/sign-up" className="text-gray-600 hover:text-emerald-600">
                    Get started
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy-policy" className="text-gray-600 hover:text-emerald-600">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="text-gray-600 hover:text-emerald-600">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
