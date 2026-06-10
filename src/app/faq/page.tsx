'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

//export const metadata = undefined // metadata must be in a server component — move to layout if needed

const FAN_FAQS = [
  {
    q: 'Is HuddleFinder free for fans?',
    a: 'Yes — completely free. Creating an account, browsing venues, finding events and RSVPing to free events costs nothing. You only pay when you purchase a ticket for a paid event, and that price is set by the venue.',
  },
  {
    q: 'How do I find events near me?',
    a: 'Sign in and use the Search page to browse events by city and sport. You can also use the "Near Me" button on the homepage to find venues and events based on your location. Filter by sport, city or date range to narrow things down.',
  },
  {
    q: 'How do I RSVP to a free event?',
    a: 'Find the event you want to attend, open the event page and tap "RSVP — Free". You need a verified HuddleFinder account to RSVP. Once confirmed you will appear on the venue\'s guest list and can show up on match day.',
  },
  {
    q: 'How do I buy tickets for a paid event?',
    a: 'Open the event page, select how many tickets you need using the quantity selector, and tap the Buy button. You will be taken to a secure Stripe checkout page. Once payment is complete your QR ticket is generated instantly.',
  },
  {
    q: 'What is a QR ticket and how do I use it?',
    a: 'After purchasing a ticket, a QR code is generated and stored in your HuddleFinder account under Dashboard → My Tickets. Show this QR code on your phone screen at the venue door — staff will scan it to check you in. No printing required.',
  },
  {
    q: 'Can I buy tickets for a group?',
    a: 'Yes. Use the quantity selector on the event page to purchase up to 10 tickets in one transaction. You receive one QR code that covers your entire group. When staff scan your QR code they can check in however many people arrive at once — so your group can even arrive separately.',
  },
  {
    q: 'What does the ticket price include?',
    a: 'The ticket price shown is the total amount you pay, including applicable Canadian taxes (GST, HST, PST or QST depending on the province). There are no hidden fees added at checkout.',
  },
  {
    q: 'Can I get a refund on my ticket?',
    a: 'All ticket sales are final. If you cannot attend, please contact us at info@huddlefinder.com at least 48 hours before the event and we will consider your request. If the venue cancels the event, you are entitled to a full refund which will be processed to your original payment method within 5–10 business days.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes. All payments are processed by Stripe, one of the world\'s most trusted payment processors. HuddleFinder never stores your credit card details. Stripe is PCI-DSS Level 1 certified.',
  },
  {
    q: 'Why do I need to verify my email?',
    a: 'Email verification protects your account and ensures you receive important updates about events you have RSVPd or purchased tickets for. You must verify your email before you can RSVP or buy tickets. Check your inbox after signing up — the verification email arrives within a minute.',
  },
  {
    q: 'Can I cancel my RSVP?',
    a: 'Yes. Open the event page and tap "Cancel RSVP". This frees up your spot for another fan. Note that cancelling an RSVP for a paid ticket is subject to our refund policy.',
  },
  {
    q: 'What sports can I find on HuddleFinder?',
    a: 'HuddleFinder covers all major sports including Football (Soccer), NFL, NHL, NBA, Rugby, Tennis, Formula 1, Cricket and more. We also have dedicated support for the World Cup. If your sport is not listed, use the general search — venues can list any sport.',
  },
]

const VENUE_FAQS = [
  {
    q: 'How do I list my venue on HuddleFinder?',
    a: 'Sign up as a venue owner at www.huddlefinder.ca, search for your venue by name or address, and claim your listing. You will verify ownership via SMS to your venue\'s phone number. Once verified, complete your profile with photos, sports, hours and amenities.',
  },
  {
    q: 'How much does it cost to list my venue?',
    a: 'Listing your venue and posting free events is completely free. Paid plans unlock ticket sales and event promotions. Starter is $49/month (9% commission per ticket) and Pro is $99/month (6.5% commission per ticket).',
  },
  {
    q: 'What is the difference between Starter and Pro?',
    a: 'Starter ($49/month) lets you sell tickets with a 9% commission and feature up to 5 events per 30-day cycle. Pro ($99/month) gives you a lower 6.5% commission, unlimited event promotions and a Featured badge on your venue profile. Both plans let you sell tickets and use the QR scanner.',
  },
  {
    q: 'How does ticket selling work?',
    a: 'Connect your Stripe account from your venue dashboard, then create a paid event and set your base ticket price. Fans purchase tickets directly through HuddleFinder. The ticket price fans pay includes tax. You receive the ticket revenue minus HuddleFinder\'s commission via Stripe, typically within 2–7 business days.',
  },
  {
    q: 'How is the commission calculated?',
    a: 'Commission is calculated on the base ticket price only — never on the tax portion. For example, if you set a base price of $20 with 12% BC tax, the fan pays $22.40. Your commission is 9% of $20 = $1.80, so you receive $20.60 ($18.20 base + $2.40 tax). The tax portion is paid out to you and you are responsible for remitting it to the CRA.',
  },
  {
    q: 'How does tax on tickets work?',
    a: 'When creating a paid event you select your province, and HuddleFinder calculates the applicable tax rate automatically. Tax is collected from fans and paid out to you via Stripe along with your ticket revenue. You are responsible for remitting that tax to the Canada Revenue Agency (CRA). If your annual revenue is under $30,000 you may be exempt from collecting tax — consult an accountant for advice specific to your situation.',
  },
  {
    q: 'Do I need a GST/HST number?',
    a: 'If your total annual revenue is under $30,000 you are considered a small supplier under Canadian tax law and are not required to register for GST/HST. Once you exceed $30,000 in annual revenue you must register with the CRA. We recommend consulting an accountant when you approach that threshold.',
  },
  {
    q: 'How do I get paid for ticket sales?',
    a: 'You must connect a Stripe account from your venue dashboard. Once connected, ticket revenue minus HuddleFinder\'s commission is transferred directly to your Stripe account. Payout timing follows Stripe\'s standard schedule, typically 2–7 business days after a transaction.',
  },
  {
    q: 'What is the QR scanner?',
    a: 'The QR scanner is a built-in tool in your venue dashboard for checking in ticket holders at the door. Open it on your phone, point the camera at a fan\'s QR code and it instantly verifies the ticket and marks them as checked in. It supports partial group check-in — if a fan bought 6 tickets you can check in 3 now and 3 later.',
  },
  {
    q: 'Can I create free events without a paid plan?',
    a: 'Yes. All venue owners including those on the Free plan can create unlimited free events where fans RSVP at no cost. Paid ticketing requires a Starter or Pro plan.',
  },
  {
    q: 'What are event promotions?',
    a: 'Promoted events appear at the top of search results and on the HuddleFinder homepage, giving you more visibility with fans searching in your city. Starter plan venues can promote up to 5 events per 30-day cycle. Pro plan venues have unlimited promotions and all events are Featured by default.',
  },
  {
    q: 'Can I cancel an event after publishing?',
    a: 'Yes. Open the event from your venue dashboard and tap "Cancel event". If the event had paid tickets, affected ticket holders are entitled to a full refund. Please cancel as early as possible and communicate with your attendees.',
  },
  {
    q: 'Can I edit an event after publishing?',
    a: 'Yes, as long as the event has not yet started. Open the event from your dashboard and tap "Edit event". You can update the title, description, date, time, sport and banner image. You cannot change the ticket price after tickets have been sold.',
  },
  {
    q: 'What cities is HuddleFinder available in?',
    a: 'HuddleFinder is available Canada-wide. While our popular city search features Vancouver, Toronto, Calgary and Montreal, venue owners can list from any city in Canada and fans can search any city using the search bar.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to your venue dashboard → Manage Venue → Profile → Subscription and tap "Cancel subscription". Your plan stays active until the end of the current billing period. You can reactivate any time before it expires to keep your plan without interruption.',
  },
]

interface FAQItemProps {
  q:       string
  a:       string
  isOpen:  boolean
  onToggle: () => void
}

function FAQItem({ q, a, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className={clsx(
          'text-sm font-semibold transition-colors',
          isOpen ? 'text-brand-red' : 'text-brand-charcoal'
        )}>
          {q}
        </span>
        <ChevronDownIcon className={clsx(
          'w-4 h-4 flex-shrink-0 transition-transform duration-200 text-gray-400',
          isOpen && 'rotate-180'
        )} />
      </button>
      {isOpen && (
        <div className="pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const [openFan,   setOpenFan]   = useState<number | null>(null)
  const [openVenue, setOpenVenue] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-brand-charcoal mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-gray-400">
            Everything you need to know about HuddleFinder.
            Can't find your answer?{' '}
            <a
              href="mailto:info@huddlefinder.com"
              className="text-brand-red hover:underline"
            >
              Email us
            </a>
            .
          </p>
        </div>

        {/* ── For Fans ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-brand-red-light rounded-xl flex items-center justify-center text-base flex-shrink-0">
              🏟️
            </div>
            <h2 className="text-lg font-bold text-brand-charcoal">
              For Fans
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6">
            {FAN_FAQS.map((item, i) => (
              <FAQItem
                key={i}
                q={item.q}
                a={item.a}
                isOpen={openFan === i}
                onToggle={() => setOpenFan(openFan === i ? null : i)}
              />
            ))}
          </div>
        </div>

        {/* ── For Venue Owners ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-brand-red-light rounded-xl flex items-center justify-center text-base flex-shrink-0">
              🍺
            </div>
            <h2 className="text-lg font-bold text-brand-charcoal">
              For Venue Owners
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6">
            {VENUE_FAQS.map((item, i) => (
              <FAQItem
                key={i}
                q={item.q}
                a={item.a}
                isOpen={openVenue === i}
                onToggle={() => setOpenVenue(openVenue === i ? null : i)}
              />
            ))}
          </div>
        </div>

        {/* ── Still have questions ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-base font-bold text-brand-charcoal mb-2">
            Still have questions?
          </p>
          <p className="text-sm text-gray-400 mb-4">
            We're here to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <a
            href="mailto:info@huddlefinder.com"
            className="inline-flex items-center gap-2 bg-brand-red text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-brand-red-dark transition-colors"
          >
            Contact us
          </a>
        </div>

        {/* ── Footer links ── */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <Link href="/terms" className="text-brand-red hover:underline">
            Terms & Conditions
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/privacy" className="text-brand-red hover:underline">
            Privacy Policy
          </Link>
        </div>

      </div>
    </div>
  )
}