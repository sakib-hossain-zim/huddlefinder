'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useState } from 'react'
import { ChevronLeftIcon, BanknotesIcon, ShieldCheckIcon, CreditCardIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export default function VenueDashboardStripePage() {
  const router  = useRouter()
  const { userDoc, user } = useAuth()
  const { toasts, toast, closeToast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleConnectStripe() {
    if (!userDoc?.venueId) {
      toast.error('No venue found. Please contact support.')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/stripe/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ venueId: userDoc.venueId, userId:  user?.uid }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to connect Stripe. Please try again.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/venue-dashboard')}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-charcoal">
            Connect payments
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Connect your Stripe account to receive ticket payments directly
            into your bank account
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

          {/* Benefits */}
          <div className="space-y-4">
            {[
              {
                icon:  BanknotesIcon,
                title: 'Direct payouts',
                desc:  'Ticket revenue goes straight to your bank account within 2-3 business days',
              },
              {
                icon:  ShieldCheckIcon,
                title: 'Secure and trusted',
                desc:  'Stripe powers payments for Airbnb, Shopify and millions of businesses worldwide',
              },
              {
                icon:  CreditCardIcon,
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
            onClick={() => router.push('/venue-dashboard')}
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

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}