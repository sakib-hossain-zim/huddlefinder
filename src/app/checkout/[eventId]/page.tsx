'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { VenueEvent } from '@/types/event'

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId }       = use(params)
  const router            = useRouter()
  const { user, userDoc } = useAuth()

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for auth to load before attempting checkout
    if (user === undefined) return
    if (!user) {
      router.replace(`/auth/login?redirect=/checkout/${eventId}`)
      return
    }
    initiateCheckout()
  }, [user])

  async function initiateCheckout() {
    try {
      // Quick validation — check event exists and is paid
      const snap = await getDoc(doc(db, 'events', eventId))
      if (!snap.exists()) {
        setError('Event not found.')
        setLoading(false)
        return
      }

      const event = { eventId: snap.id, ...snap.data() } as VenueEvent

      if (event.entryType !== 'paid') {
        // Free event — redirect back
        router.replace(`/events/${eventId}`)
        return
      }

      if (event.status === 'cancelled') {
        setError('This event has been cancelled.')
        setLoading(false)
        return
      }

      // Check sold out
      if (event.ticketCapacity && (event.ticketsSold ?? 0) >= event.ticketCapacity) {
        setError('Sorry — this event is sold out.')
        setLoading(false)
        return
      }

      // ── Call checkout API ─────────────────────────
      const res  = await fetch('/api/stripe/create-ticket-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          eventId,
          userId: user!.uid,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to start checkout. Please try again.')
        setLoading(false)
        return
      }

      // ── Redirect to Stripe Checkout ───────────────
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('No checkout URL returned. Please try again.')
        setLoading(false)
      }

    } catch (err) {
      console.error('Checkout error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <LoadingSpinner />
        <p className="text-sm text-gray-500 font-semibold animate-pulse">
          Preparing your checkout...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-brand-charcoal mb-2">
            Checkout unavailable
          </h2>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.replace(`/events/${eventId}`)}
            className="w-full py-3 bg-brand-red text-white rounded-xl text-sm font-semibold hover:bg-brand-red-dark transition-colors"
          >
            Back to event
          </button>
        </div>
      </div>
    )
  }

  return null
}