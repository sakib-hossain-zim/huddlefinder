import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | HuddleFinder',
  description: 'Privacy policy for HuddleFinder — how we collect, use and protect your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-brand-charcoal mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-400">
            Last updated: June 11, 2026
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-600 leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              1. Introduction
            </h2>
            <p>
              HuddleFinder ("we", "us", "our") is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use,
              disclose and safeguard your personal information when you use our
              Platform at{' '}
              <a
                href="https://www.huddlefinder.ca"
                className="text-brand-red hover:underline"
              >
                www.huddlefinder.ca
              </a>
              .
            </p>
            <p className="mt-3">
              We are committed to complying with the{' '}
              <span className="font-semibold text-brand-charcoal">
                Personal Information Protection and Electronic Documents Act
                (PIPEDA)
              </span>{' '}
              and the{' '}
              <span className="font-semibold text-brand-charcoal">
                British Columbia Personal Information Protection Act (PIPA)
              </span>
              .
            </p>
            <p className="mt-3">
              By using HuddleFinder you consent to the collection and use of
              your information as described in this policy.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              2. Information We Collect
            </h2>

            <h3 className="font-semibold text-brand-charcoal mb-2">
              Information you provide directly:
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold">Account information</span> —
                name, email address, password, role (fan or venue owner)
              </li>
              <li>
                <span className="font-semibold">Venue information</span> —
                venue name, address, phone number, photos, operating hours,
                description (venue owners only)
              </li>
              <li>
                <span className="font-semibold">Phone number</span> —
                collected during venue SMS verification (venue owners only)
              </li>
              <li>
                <span className="font-semibold">Payment information</span> —
                processed by Stripe. We do not store full card details on our
                servers
              </li>
              <li>
                <span className="font-semibold">Event information</span> —
                event details, ticket pricing, descriptions created by venue
                owners
              </li>
            </ul>

            <h3 className="font-semibold text-brand-charcoal mt-4 mb-2">
              Information collected automatically:
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold">Location data</span> —
                approximate location when you use the "Near Me" feature
                (requires your explicit permission)
              </li>
              <li>
                <span className="font-semibold">Usage data</span> —
                pages visited, features used, search queries, timestamps
              </li>
              <li>
                <span className="font-semibold">Device information</span> —
                browser type, operating system, device identifiers
              </li>
              <li>
                <span className="font-semibold">Log data</span> —
                IP address, access times, referring URLs
              </li>
            </ul>

            <h3 className="font-semibold text-brand-charcoal mt-4 mb-2">
              Information from third parties:
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold">Google Sign-In</span> —
                if you sign in with Google we receive your name, email and
                profile photo from Google
              </li>
              <li>
                <span className="font-semibold">Stripe</span> —
                payment status and payout information for venue owners
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              3. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Create and manage your account</li>
              <li>Process ticket purchases and subscription payments</li>
              <li>
                Generate and validate QR code tickets for event entry
              </li>
              <li>
                Connect fans with venues and events relevant to their location
                and interests
              </li>
              <li>
                Send transactional communications including booking
                confirmations and account notifications
              </li>
              <li>
                Provide customer support and respond to enquiries
              </li>
              <li>
                Improve and personalize the Platform experience
              </li>
              <li>
                Detect, prevent and address fraud, abuse and security issues
              </li>
              <li>
                Comply with legal obligations
              </li>
              <li>
                Send platform updates and marketing communications (you may
                opt out at any time)
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              4. How We Share Your Information
            </h2>
            <p>
              We do not sell your personal information to third parties. We may
              share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                <span className="font-semibold">With venue owners</span> —
                when you RSVP or purchase a ticket, the venue owner receives
                your name and email address for event management purposes
              </li>
              <li>
                <span className="font-semibold">Service providers</span> —
                we share data with trusted third-party services that help us
                operate the Platform (listed in Section 6)
              </li>
              <li>
                <span className="font-semibold">Legal requirements</span> —
                we may disclose your information if required by law or in
                response to valid requests by public authorities
              </li>
              <li>
                <span className="font-semibold">Business transfers</span> —
                in the event of a merger, acquisition or sale of assets, your
                information may be transferred as part of that transaction
              </li>
              <li>
                <span className="font-semibold">With your consent</span> —
                in any other circumstances where you have given us explicit
                consent
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              5. Data Storage & Security
            </h2>
            <p>
              Your data is stored on Google Firebase servers located in the
              United States (us-central region). By using HuddleFinder you
              consent to the transfer and storage of your information outside
              of Canada.
            </p>
            <p className="mt-3">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>HTTPS encryption for all data in transit</li>
              <li>Firebase Security Rules restricting data access</li>
              <li>
                Secure authentication via Firebase Auth and Google Sign-In
              </li>
              <li>
                Payment data processed exclusively by Stripe — we never store
                full card numbers
              </li>
              <li>Admin SDK access restricted to server-side API routes only</li>
            </ul>
            <p className="mt-3">
              While we take reasonable measures to protect your information, no
              method of transmission or storage is 100% secure and we cannot
              guarantee absolute security.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              6. Third Party Services
            </h2>
            <p>
              HuddleFinder uses the following third-party services which may
              process your personal information:
            </p>
            <div className="mt-3 space-y-3">
              {[
                {
                  name: 'Google Firebase',
                  purpose: 'Database, authentication and file storage',
                  link: 'https://firebase.google.com/support/privacy',
                },
                {
                  name: 'Stripe',
                  purpose: 'Payment processing and venue payouts',
                  link: 'https://stripe.com/privacy',
                },
                {
                  name: 'Twilio',
                  purpose: 'SMS verification for venue owners',
                  link: 'https://www.twilio.com/legal/privacy',
                },
                {
                  name: 'Google Maps / Places',
                  purpose: 'Venue location and mapping',
                  link: 'https://policies.google.com/privacy',
                },
                {
                  name: 'Vercel',
                  purpose: 'Platform hosting and deployment',
                  link: 'https://vercel.com/legal/privacy-policy',
                },
              ].map(service => (
                <div
                  key={service.name}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-xl gap-4"
                >
                  <div>
                    <p className="font-semibold text-brand-charcoal">
                      {service.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {service.purpose}
                    </p>
                  </div>
                  <a
                    href={service.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-red hover:underline whitespace-nowrap flex-shrink-0"
                  >
                    Privacy policy →
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              7. Cookies
            </h2>
            <p>
              HuddleFinder uses cookies and similar tracking technologies to
              maintain your session, remember your preferences and analyze
              Platform usage. We use:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                <span className="font-semibold">Essential cookies</span> —
                required for authentication and core Platform functionality.
                Cannot be disabled.
              </li>
              <li>
                <span className="font-semibold">Analytics cookies</span> —
                help us understand how the Platform is used so we can improve
                it. You may opt out via your browser settings.
              </li>
            </ul>
            <p className="mt-3">
              You can control cookies through your browser settings. Disabling
              essential cookies may prevent some features from working correctly.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              8. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide our services. Specifically:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                Account data is retained until you request deletion or we
                terminate your account
              </li>
              <li>
                Ticket and transaction records are retained for 7 years for
                accounting and legal compliance purposes
              </li>
              <li>
                Log data is retained for up to 90 days
              </li>
              <li>
                Venue data is retained for 12 months after venue deactivation
              </li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              9. Your Rights (PIPEDA)
            </h2>
            <p>
              Under Canadian privacy law you have the right to:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                <span className="font-semibold">Access</span> — request a copy
                of the personal information we hold about you
              </li>
              <li>
                <span className="font-semibold">Correction</span> — request
                that we correct inaccurate or incomplete information
              </li>
              <li>
                <span className="font-semibold">Withdrawal of consent</span> —
                withdraw consent to the collection or use of your information
                (subject to legal or contractual restrictions)
              </li>
              <li>
                <span className="font-semibold">Deletion</span> — request
                deletion of your account and personal data, subject to our
                legal retention obligations
              </li>
              <li>
                <span className="font-semibold">Complaint</span> — file a
                complaint with the Office of the Privacy Commissioner of Canada
                if you believe your rights have been violated
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights please contact us at{' '}
              <a
                href="mailto:info@huddlefinder.com"
                className="text-brand-red hover:underline"
              >
                info@huddlefinder.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              10. Children's Privacy
            </h2>
            <p>
              HuddleFinder is not directed at children under the age of 13. We
              do not knowingly collect personal information from children under
              13. If we become aware that a child under 13 has provided us with
              personal information, we will delete it promptly. If you believe
              a child has provided us with their information please contact us
              at{' '}
              <a
                href="mailto:info@huddlefinder.com"
                className="text-brand-red hover:underline"
              >
                info@huddlefinder.com
              </a>
              .
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes by posting the new policy on
              this page with an updated date and, where appropriate, by sending
              you an email notification. We encourage you to review this policy
              periodically.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              12. Contact Us
            </h2>
            <p>
              If you have any questions, concerns or requests regarding this
              Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-xl">
              <p className="font-semibold text-brand-charcoal">
                HuddleFinder — Privacy Officer
              </p>
              <p className="mt-1">Vancouver, British Columbia, Canada</p>
              <a
                href="mailto:info@huddlefinder.com"
                className="text-brand-red hover:underline block mt-1"
              >
                info@huddlefinder.com
              </a>
              <a
                href="https://www.huddlefinder.ca"
                className="text-brand-red hover:underline block mt-1"
              >
                www.huddlefinder.ca
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              You may also contact the Office of the Privacy Commissioner of
              Canada at{' '}
              <a
                href="https://www.priv.gc.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-red hover:underline"
              >
                www.priv.gc.ca
              </a>{' '}
              if you have unresolved concerns.
            </p>
          </section>

        </div>

        {/* Footer link */}
        <div className="mt-6 text-center">
          <Link
            href="/terms"
            className="text-sm text-brand-red hover:underline"
          >
            View our Terms & Conditions →
          </Link>
        </div>

      </div>
    </div>
  )
}