import Link from 'next/link'
import { Receipt, ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Receipt className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Kacha</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: February 16, 2026</p>

          <div className="prose prose-emerald max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing or using Kacha ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-600 mb-4">
                Kacha provides an expense management platform that allows you to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Capture and store receipt images</li>
                <li>Extract data from receipts using AI/OCR technology</li>
                <li>Organize expenses into reports and workspaces</li>
                <li>Generate expense reports for accounting purposes</li>
                <li>Sync data across multiple devices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Registration</h3>
              <p className="text-gray-600 mb-4">
                You must create an account to use the Service. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Age Requirement</h3>
              <p className="text-gray-600 mb-4">
                You must be at least 18 years old to use the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Account Termination</h3>
              <p className="text-gray-600 mb-4">
                You may delete your account at any time via Settings → Security → Close Account. 
                We may suspend or terminate your account if you violate these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Content</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Your Data</h3>
              <p className="text-gray-600 mb-4">
                You retain all rights to the content you upload (receipts, expense data, etc.). 
                By uploading content, you grant us a license to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Store and process your data to provide the Service</li>
                <li>Use AI/ML services to extract information from receipts</li>
                <li>Back up your data for disaster recovery</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Content Restrictions</h3>
              <p className="text-gray-600 mb-4">
                You agree not to upload content that:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Violates any laws or regulations</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains malicious code or viruses</li>
                <li>Is fraudulent or misleading</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
              <p className="text-gray-600 mb-4">
                You agree to use the Service only for lawful purposes. You must not:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use automated tools to access the Service without permission</li>
                <li>Reverse engineer or decompile the Service</li>
                <li>Use the Service to violate any laws</li>
                <li>Impersonate others or misrepresent your affiliation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Billing and Payments</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Free Service</h3>
              <p className="text-gray-600 mb-4">
                Kacha currently offers its core features free of charge. We reserve the right to introduce 
                paid features or subscription plans in the future with advance notice.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Future Pricing</h3>
              <p className="text-gray-600 mb-4">
                If we introduce paid features, we will:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>Provide 30 days advance notice</li>
                <li>Allow existing users to continue with current features</li>
                <li>Offer clear pricing and terms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
              <p className="text-gray-600 mb-4">
                The Service, including all content, features, and functionality, is owned by Kacha and protected by 
                international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-gray-600 mb-4">
                You may not copy, modify, distribute, sell, or lease any part of our Service without express written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Third-Party Services</h2>
              <p className="text-gray-600 mb-4">
                The Service integrates with third-party services including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>Clerk:</strong> Authentication and user management</li>
                <li><strong>Supabase:</strong> Database and storage</li>
                <li><strong>Google Cloud:</strong> AI/ML processing for receipt extraction</li>
              </ul>
              <p className="text-gray-600 mb-4">
                Your use of these services is subject to their respective terms of service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers and Limitations</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.1 Service Availability</h3>
              <p className="text-gray-600 mb-4">
                The Service is provided "as is" and "as available." We do not guarantee uninterrupted or error-free service.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.2 Data Accuracy</h3>
              <p className="text-gray-600 mb-4">
                While we strive for accuracy in receipt data extraction, AI/OCR technology may produce errors. 
                You are responsible for verifying all extracted data before use.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.3 Limitation of Liability</h3>
              <p className="text-gray-600 mb-4">
                To the maximum extent permitted by law, Kacha shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages arising from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
              <p className="text-gray-600 mb-4">
                You agree to indemnify and hold harmless Kacha from any claims, damages, or expenses arising from 
                your use of the Service or violation of these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Data Backup</h2>
              <p className="text-gray-600 mb-4">
                While we maintain regular backups, you are responsible for maintaining your own backups of important data. 
                We are not liable for data loss.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Modifications to Terms</h2>
              <p className="text-gray-600 mb-4">
                We may modify these terms at any time. Significant changes will be communicated via email or in-app notification. 
                Continued use of the Service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-600 mb-4">
                These terms are governed by and construed in accordance with applicable international laws. 
                Any disputes shall be resolved through binding arbitration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                For questions about these Terms of Service, contact us:
              </p>
              <ul className="list-none text-gray-600 space-y-2">
                <li><strong>Email:</strong> support@mafutapass.com</li>
                <li><strong>Website:</strong> <Link href="/" className="text-blue-600 hover:text-blue-700 underline">https://mafutapass.com</Link></li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Severability</h2>
              <p className="text-gray-600 mb-4">
                If any provision of these terms is found to be unenforceable, the remaining provisions will remain in full effect.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© 2026 Kacha. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <Link href="/privacy-policy" className="hover:text-blue-600">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-blue-600">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
