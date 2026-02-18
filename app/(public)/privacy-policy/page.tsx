import Link from 'next/link'
import { Receipt, ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Receipt className="w-8 h-8 text-emerald-600" />
              <span className="text-2xl font-bold text-gray-900">Kacha</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to home</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: February 16, 2026</p>

          <div className="prose prose-emerald max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                Welcome to Kacha. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our expense management service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Account Information:</strong> Name, email address, phone number (optional)</li>
                <li><strong>Profile Information:</strong> Display name, profile picture, preferences</li>
                <li><strong>Receipt Data:</strong> Uploaded receipt images, merchant names, amounts, dates, categories</li>
                <li><strong>Expense Reports:</strong> Report titles, descriptions, workspace assignments</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Information Automatically Collected</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent in app</li>
                <li><strong>Device Information:</strong> Device type, operating system, app version</li>
                <li><strong>Log Data:</strong> IP address, browser type, timestamps</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Provide and maintain our expense management service</li>
                <li>Process and store your receipts and expense data</li>
                <li>Generate expense reports</li>
                <li>Authenticate your account and prevent fraud</li>
                <li>Send you service-related communications</li>
                <li>Improve our service through analytics</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Storage and Security</h2>
              <p className="text-gray-600 mb-4">
                <strong>Storage:</strong> Your data is stored securely using Supabase (PostgreSQL database) and Clerk (authentication). 
                Receipt images are stored in encrypted cloud storage.
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Security:</strong> We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encrypted data storage</li>
                <li>Row-level security policies</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
              <p className="text-gray-600 mb-4">
                We do not sell your personal data. We may share your information only in these circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Service Providers:</strong> Third-party services that help us operate (Supabase, Clerk, Google Cloud for AI processing)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
              <p className="text-gray-600 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data via Settings → Security → Close Account</li>
                <li><strong>Export:</strong> Download your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-600 mb-4">
                We retain your data for as long as your account is active. When you delete your account:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Your personal data is <strong>permanently deleted immediately</strong></li>
                <li>Receipt images are removed from storage</li>
                <li>Anonymized analytics data may be retained for service improvement</li>
                <li>Legal or compliance data may be retained as required by law</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-600 mb-4">
                Kacha is not intended for users under 18 years of age. We do not knowingly collect data from children.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-600 mb-4">
                Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place 
                to protect your data in accordance with this privacy policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update this privacy policy from time to time. We will notify you of significant changes via email 
                or through the app. Continued use of the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have questions about this privacy policy or our data practices, please contact us:
              </p>
              <ul className="list-none text-gray-600 space-y-2">
                <li><strong>Email:</strong> support@mafutapass.com</li>
                <li><strong>Account Deletion:</strong> <Link href="/account/delete" className="text-emerald-600 hover:text-emerald-700 underline">https://mafutapass.com/account/delete</Link></li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© 2026 Kacha. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/" className="hover:text-emerald-600">Home</Link>
            <Link href="/privacy-policy" className="hover:text-emerald-600">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-emerald-600">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
