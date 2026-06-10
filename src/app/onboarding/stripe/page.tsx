'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Stepper from '@/components/ui/Stepper'
import {
  CreditCardIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

const STEPS = [
  { number: 1, label: 'Claim'    },
  { number: 2, label: 'Verify'   },
  { number: 3, label: 'Profile'  },
  { number: 4, label: 'Plan'     },
  { number: 5, label: 'Payments' },
]

export default function StripePage() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [venueId, setVenueId] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('onboarding_venue_id')
    if (!id) { router.replace('/onboarding/claim'); return }
    setVenueId(id)
  }, [router])

  async function handleConnectStripe() {
    if (!venueId) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ venueId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    localStorage.removeItem('onboarding_venue_id')
    router.push('/venue-dashboard')
  }

  return (
    <div>
      <Stepper steps={STEPS} currentStep={5} />

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-brand-charcoal transition-colors mb-6"
        >
        <ArrowLeftIcon className="w-4 h-4" />
        Back
      </button>

      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-red-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCardIcon className="w-7 h-7 text-brand-red" />
        </div>
        <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
          Connect payments
        </h1>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Connect your Stripe account to receive ticket payments directly into your bank account
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

        {/* Benefits */}
        <div className="space-y-4">
          {[
            {
              icon: BanknotesIcon,
              title: 'Direct payouts',
              desc:  'Ticket revenue goes straight to your bank account within 2-3 business days',
            },
            {
              icon: ShieldCheckIcon,
              title: 'Secure and trusted',
              desc:  'Stripe powers payments for Airbnb, Shopify and millions of businesses worldwide',
            },
            {
              icon: CreditCardIcon,
              title: 'No setup fees',
              desc:  'Free to connect. We only take our commission when you sell a ticket',
            },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-red-light rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-charcoal">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={handleConnectStripe}
        >
          <span className="flex items-center gap-2">
            Connect Stripe account
            <ArrowRightIcon className="w-4 h-4" />
          </span>
        </Button>

        <button
          onClick={handleSkip}
          className="w-full text-center text-sm text-gray-400 hover:text-brand-charcoal transition-colors py-2"
        >
          Skip for now — connect later from dashboard
        </button>

        <p className="text-center text-xs text-gray-400">
          You can still list free events and receive RSVPs without Stripe.
          Stripe is only needed for paid ticket events.
        </p>
      </div>
    </div>
  )
}