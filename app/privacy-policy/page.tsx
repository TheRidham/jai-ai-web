import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | JAI App</title>
        <meta name="description" content="JAI App Privacy Policy" />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
        <header className="mb-10">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-lg text-gray-600 mt-2">Effective: October 2025</p>
        </header>

        <section className="space-y-6">
          <p>
            Welcome to <strong>JAI App</strong> (“we,” “us,” “our”). Your privacy is important to us.
            This Privacy Policy explains how we collect, use, store, and protect your personal data when
            you use the JAI App, an AI + Human Advisory platform operated by SeedsAI.
          </p>

          <p>By using our services, you consent to this Privacy Policy.</p>

          <h2 className="text-xl font-semibold ">1. Information We Collect</h2>

          <h3 className="font-medium mt-2">a. Information You Provide</h3>
          <ul className="list-disc list-inside text-gray-700">
            <li><strong>Account Information:</strong> Name, email, phone number (if provided)</li>
            <li><strong>Chat Interactions:</strong> Encrypted messages with AI or human advisors</li>
            <li><strong>Support Requests:</strong> Information you share via support channels</li>
            <li><strong>Feedback and Ratings:</strong> Optional inputs for improvement</li>
          </ul>

          <h3 className="font-medium mt-4">b. Automatically Collected Data</h3>
          <ul className="list-disc list-inside text-gray-700">
            <li>Usage analytics (Google Analytics, Firebase, Crashlytics)</li>
            <li>App performance and crash diagnostics</li>
            <li><strong>No personal chat content</strong> is shared with these tools</li>
          </ul>

          <h2 className="text-xl font-semibold ">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>Provide, personalize, and improve services</li>
            <li>Enable secure login and manage your account</li>
            <li>Ensure quality assurance and reliability</li>
            <li>Enhance AI using anonymized or aggregated data</li>
            <li>Communicate updates and support responses</li>
            <li>Comply with legal requirements</li>
          </ul>

          <h2 className="text-xl font-semibold ">3. AI and Human Advisory Transparency</h2>
          <p>
            We use a blend of AI and verified human advisors. AI responses may use licensed LLM providers.
            Human advisors may review limited interactions for QA or dispute resolution.
            We never sell or disclose your personal data for advertising.
          </p>

          <h2 className="text-xl font-semibold ">4. Data Sharing and Disclosure</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>No selling, renting, or trading personal information</li>
            <li>Shared only with authorized service providers under confidentiality</li>
            <li>Legal disclosures only as required by law</li>
          </ul>

          <h2 className="text-xl font-semibold ">5. Data Security</h2>
          <p>
            We use strong encryption, secure cloud storage, and access controls.
            Still, no online system is completely secure. Avoid sharing sensitive data unless necessary.
          </p>

          <h2 className="text-xl font-semibold ">6. Data Retention</h2>
          <p>
            Data is stored as long as needed to deliver services or comply with law.
            You’ll be able to request deletion once features are live.
            Aggregated/anonymized data may be retained for analytics.
          </p>

          <h2 className="text-xl font-semibold ">7. Your Rights</h2>
          <p>Depending on your location, you may:</p>
          <ul className="list-disc list-inside text-gray-700">
            <li>Access or review your personal data</li>
            <li>Correct outdated info</li>
            <li>Withdraw consent</li>
            <li>Request deletion (coming soon)</li>
            <li>Lodge a complaint with authorities</li>
          </ul>
          <p>Contact us at <a href="mailto:support@jaiapp.in" className=" underline">support@jaiapp.in</a></p>

          <h2 className="text-xl font-semibold ">8. Children’s Privacy</h2>
          <p>
            We do not knowingly collect data from children under 13 (or under 16 in some regions).
            If you believe a child has submitted data, please contact us for removal.
          </p>

          <h2 className="text-xl font-semibold ">9. International Data Transfers</h2>
          <p>
            Your data may be processed in India or other countries. All transfers comply with legal safeguards.
          </p>

          <h2 className="text-xl font-semibold ">10. Updates to This Policy</h2>
          <p>
            We may update this policy. Significant changes will be communicated in-app or via email.
            Continued use means you accept the updated policy.
          </p>

          <h2 className="text-xl font-semibold ">11. Contact Us</h2>
          <p>
            <strong>JAI App Privacy Team</strong><br />
            📧 <a href="mailto:support@jaiapp.in" className=" underline">support@jaiapp.in</a><br />
            🌐 <a href="https://jaiapp.in" className=" underline">https://jaiapp.in</a>
          </p>

          <h2 className="text-xl font-semibold ">12. Legal Basis and Compliance</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>DPDP Act, 2023 (India)</li>
            <li>GDPR (EU)</li>
            <li>CCPA (California)</li>
            <li>Google Play Developer Policies</li>
          </ul>

          <h2 className="text-xl font-semibold ">13. Consent</h2>
          <p>
            By using JAI App, you acknowledge that you have read, understood, and agreed to this Privacy Policy and our Terms of Service.
          </p>
        </section>

        <footer className="text-center text-sm text-gray-500 mt-10">
          &copy; 2025 JAI App | All rights reserved.
        </footer>
      </main>
    </>
  );
}
