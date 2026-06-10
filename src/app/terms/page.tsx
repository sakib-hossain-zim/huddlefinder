import Link from 'next/link'

export const metadata = {
  title: 'Terms & Conditions | HuddleFinder',
  description: 'Terms and conditions for using HuddleFinder.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-brand-charcoal mb-3">
            Terms & Conditions
          </h1>
          <p className="text-sm text-gray-400">
            Last updated: June 11, 2026
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-600 leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              1. About HuddleFinder
            </h2>
            <p>
              HuddleFinder ("we", "us", "our") is a Canadian sports event
              discovery platform that connects sports fans with venues hosting
              live sporting events. We operate the website located at{' '}
              <a
                href="https://www.huddlefinder.ca"
                className="text-brand-red hover:underline"
              >
                www.huddlefinder.ca
              </a>{' '}
              and all associated mobile and web applications (collectively, the
              "Platform").
            </p>
            <p className="mt-3">
              HuddleFinder is based in Vancouver, British Columbia, Canada.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              2. Acceptance of Terms
            </h2>
            <p>
              By accessing or using HuddleFinder, creating an account, purchasing
              a ticket, or listing a venue, you agree to be bound by these Terms
              & Conditions and our{' '}
              <Link href="/privacy" className="text-brand-red hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, please do not use the Platform.
            </p>
            <p className="mt-3">
              We reserve the right to update these terms at any time. Continued
              use of the Platform after changes constitutes acceptance of the
              updated terms.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              3. Eligibility
            </h2>
            <p>
              You must be at least 13 years of age to use HuddleFinder. If you
              are under 18, you must have parental or guardian consent. By using
              the Platform you represent and warrant that you meet these
              requirements.
            </p>
            <p className="mt-3">
              Venue owners must be at least 18 years of age and legally
              authorized to operate the venue they list on the Platform.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              4. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity that occurs under your
              account. You agree to notify us immediately at{' '}
              <a
                href="mailto:info@huddlefinder.com"
                className="text-brand-red hover:underline"
              >
                info@huddlefinder.com
              </a>{' '}
              if you suspect any unauthorized use of your account.
            </p>
            <p className="mt-3">
              You agree to provide accurate, current and complete information
              when creating your account and to keep your information up to date.
              We reserve the right to suspend or terminate accounts that contain
              false or misleading information.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              5. Fan Responsibilities
            </h2>
            <p>As a fan using HuddleFinder you agree to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Provide accurate personal information when registering</li>
              <li>
                Only purchase tickets for events you genuinely intend to attend
              </li>
              <li>
                Present your valid QR code ticket at the venue door for scanning
              </li>
              <li>
                Comply with the venue's rules, policies and applicable liquor
                laws
              </li>
              <li>
                Not resell, transfer or duplicate tickets except as expressly
                permitted
              </li>
              <li>
                Not engage in fraudulent activity including chargebacks for
                tickets you have used
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              6. Venue Owner Responsibilities
            </h2>
            <p>As a venue owner using HuddleFinder you agree to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                Provide accurate and truthful information about your venue and
                events
              </li>
              <li>
                Only list events that will genuinely take place at your venue
              </li>
              <li>
                Honour all tickets sold through the Platform and admit ticket
                holders
              </li>
              <li>
                Notify fans promptly if an event is cancelled or significantly
                changed
              </li>
              <li>
                Comply with all applicable laws including liquor licensing,
                fire capacity limits and health & safety regulations
              </li>
              <li>
                Complete Stripe Connect onboarding accurately to receive payouts
              </li>
              <li>
                Not attempt to circumvent Platform commission by directing fans
                to purchase tickets outside HuddleFinder
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              7. Tickets & Payments
            </h2>
            <p>
              Ticket purchases are processed securely through Stripe. By
              purchasing a ticket you authorize HuddleFinder to charge your
              payment method for the full ticket amount including any applicable
              taxes and fees.
            </p>
            <p className="mt-3">
              HuddleFinder charges a platform commission on each ticket sale.
              This commission is deducted before payouts are sent to venue
              owners via Stripe Connect. Commission rates are:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Starter plan venues — 9% per ticket sale</li>
              <li>Pro plan venues — 6.5% per ticket sale</li>
            </ul>
            <p className="mt-3">
              Payouts to venue owners are subject to Stripe's standard payout
              schedule and terms.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              8. Refund Policy
            </h2>
            <p>
              All ticket sales are final. HuddleFinder does not guarantee
              refunds for change of mind or failure to attend.
            </p>
            <p className="mt-3">
              If you wish to request a refund, please contact us at{' '}
              <a
                href="mailto:info@huddlefinder.com"
                className="text-brand-red hover:underline"
              >
                info@huddlefinder.com
              </a>{' '}
              at least 48 hours before the event start time. Refund requests
              received at least 48 hours before the event will be considered at
              our discretion. Refund requests received within 48 hours of the
              event start time will not be eligible for a refund except in the
              case of venue cancellation.
            </p>
            <p className="mt-3">
              If a venue cancels an event, affected ticket holders will be
              eligible for a full refund. Refunds are processed via the original
              payment method and typically take 5–10 business days to appear.
            </p>
            <p className="mt-3">
              HuddleFinder's platform commission is non-refundable in cases
              where a refund is granted.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              9. Subscriptions
            </h2>
            <p>
              Venue owner subscription plans (Starter and Pro) are billed
              monthly on a recurring basis. You authorize HuddleFinder to charge
              your payment method on each billing date.
            </p>
            <p className="mt-3">
              You may cancel your subscription at any time from your venue
              dashboard. Cancellation takes effect at the end of the current
              billing period and you will retain access to paid features until
              that date. No partial refunds are issued for unused subscription
              time.
            </p>
            <p className="mt-3">
              Downgrading your plan takes effect at the start of the next
              billing cycle. You retain your current plan's features until that
              date.
            </p>
            <p className="mt-3">
              We reserve the right to change subscription pricing with 30 days
              notice to active subscribers.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              10. Prohibited Conduct
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Use the Platform for any unlawful purpose</li>
              <li>
                Post false, misleading or fraudulent venue or event information
              </li>
              <li>
                Attempt to gain unauthorized access to other user accounts or
                Platform systems
              </li>
              <li>
                Scrape, crawl or systematically extract data from the Platform
              </li>
              <li>
                Interfere with or disrupt the Platform's servers or networks
              </li>
              <li>
                Use the Platform to send spam, unsolicited messages or
                advertising
              </li>
              <li>
                Impersonate any person, venue or organization
              </li>
              <li>
                Duplicate, forge or tamper with QR ticket codes
              </li>
            </ul>
            <p className="mt-3">
              Violation of these terms may result in immediate account
              suspension or termination without notice.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              11. Intellectual Property
            </h2>
            <p>
              All content on the Platform including but not limited to the
              HuddleFinder name, logo, design, text, graphics and software is
              owned by or licensed to HuddleFinder and is protected by Canadian
              and international copyright laws.
            </p>
            <p className="mt-3">
              Venue owners retain ownership of photos and content they upload to
              the Platform but grant HuddleFinder a non-exclusive, royalty-free
              licence to display and promote that content on the Platform and in
              marketing materials.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              12. Third Party Services
            </h2>
            <p>
              HuddleFinder integrates with third-party services including Stripe
              (payments), Firebase (data storage), Twilio (SMS) and Google Maps.
              Your use of these services is also subject to their respective
              terms and privacy policies. HuddleFinder is not responsible for
              the practices of these third-party providers.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              13. Disclaimer of Warranties
            </h2>
            <p>
              The Platform is provided "as is" and "as available" without
              warranties of any kind, either express or implied. HuddleFinder
              does not warrant that the Platform will be uninterrupted,
              error-free or free of viruses or other harmful components.
            </p>
            <p className="mt-3">
              HuddleFinder does not endorse, verify or guarantee any venue,
              event or content listed on the Platform. We are not responsible
              for the quality, safety or legality of events or venues listed by
              third parties.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              14. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable Canadian law,
              HuddleFinder shall not be liable for any indirect, incidental,
              special, consequential or punitive damages arising from your use
              of the Platform, including but not limited to loss of revenue,
              data, goodwill or other intangible losses.
            </p>
            <p className="mt-3">
              In no event shall HuddleFinder's total liability to you for all
              claims exceed the greater of (a) the amount you paid to
              HuddleFinder in the 12 months prior to the claim or (b) CAD $100.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              15. Governing Law
            </h2>
            <p>
              These Terms & Conditions are governed by and construed in
              accordance with the laws of the Province of British Columbia and
              the federal laws of Canada applicable therein, without regard to
              conflict of law principles.
            </p>
            <p className="mt-3">
              Any disputes arising from these terms or your use of the Platform
              shall be subject to the exclusive jurisdiction of the courts of
              British Columbia, Canada.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-base font-bold text-brand-charcoal mb-3">
              16. Contact Us
            </h2>
            <p>
              If you have any questions about these Terms & Conditions please
              contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-xl">
              <p className="font-semibold text-brand-charcoal">HuddleFinder</p>
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
          </section>

        </div>

        {/* Footer link */}
        <div className="mt-6 text-center">
          <Link
            href="/privacy"
            className="text-sm text-brand-red hover:underline"
          >
            View our Privacy Policy →
          </Link>
        </div>

      </div>
    </div>
  )
}