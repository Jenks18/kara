export default function DeleteAccountHelpPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="white" fillOpacity="0.15"/>
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20">K</text>
            </svg>
            <span className="text-2xl font-bold">Kacha</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">Delete Your Account</h1>
          <p className="text-blue-100 text-lg">
            How to permanently delete your Kacha account and all associated data.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* Overview */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Overview</h2>
          <p className="text-gray-700 leading-relaxed">
            You can delete your Kacha account at any time through the app or website. 
            When you delete your account, all your personal data — including receipts, 
            expense reports, workspaces, and profile information — will be permanently 
            removed from our servers.
          </p>
        </section>

        {/* What gets deleted */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">What gets deleted</h2>
          <ul className="space-y-2">
            {[
              'Your profile information (name, email, avatar)',
              'All scanned receipts and receipt images',
              'All expense reports and expense items',
              'Workspace memberships and workspace data you own',
              'Preferences and settings',
              'Support tickets and bug reports',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Steps */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">How to delete your account</h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Sign in to Kacha</h3>
                <p className="text-gray-600 text-sm">
                  Open the Kacha app or go to{' '}
                  <a href="https://kachalabs.com/sign-in" className="text-blue-600 underline">
                    kachalabs.com/sign-in
                  </a>{' '}
                  and sign in with your account.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Go to Account</h3>
                <p className="text-gray-600 text-sm">
                  Tap the <strong>Account</strong> tab in the bottom navigation bar.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Open Security</h3>
                <p className="text-gray-600 text-sm">
                  Tap <strong>Security</strong> in the account menu.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Close account</h3>
                <p className="text-gray-600 text-sm">
                  Tap <strong>Close account</strong> and follow the on-screen prompts to confirm deletion. 
                  Your account and all data will be permanently deleted.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Timeframe */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Data deletion timeframe</h3>
          <p className="text-amber-800 text-sm leading-relaxed">
            Account deletion is processed immediately. Your data will be removed from our 
            active systems right away. Residual copies in encrypted backups may take up to 
            30 days to be fully purged.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Need help?</h2>
          <p className="text-gray-700 mb-4">
            If you are unable to access your account or need assistance with account deletion, 
            contact our support team:
          </p>
          <a 
            href="mailto:support@kachalabs.com" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@kachalabs.com
          </a>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Kacha Labs. All rights reserved.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            This page is provided in compliance with Google Play and Apple App Store 
            account deletion requirements.
          </p>
        </footer>
      </div>
    </div>
  )
}
