'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  collection, query, where, getDocs, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

function TicketSuccessContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const eventId = searchParams.get('eventId')
  const userId  = searchParams.get('userId')

  const [message, setMessage] = useState('Processing your payment...')

  useEffect(() => {
    if (!eventId || !userId) {
      router.replace('/')
      return
    }
    pollForTicket()
  }, [])

  async function pollForTicket() {
    const maxAttempts = 15

    for (let i = 0; i < maxAttempts; i++) {
      if (i === 0)  setMessage('Processing your payment...')
      if (i === 3)  setMessage('Confirming your ticket...')
      if (i === 7)  setMessage('Almost there...')
      if (i === 10) setMessage('Taking a moment longer than usual...')

      try {
        // ── Removed orderBy to avoid composite index requirement ──
        // We only need to know IF a ticket exists, not the order
        const snap = await getDocs(query(
          collection(db, 'tickets'),
          where('userId',  '==', userId),
          where('eventId', '==', eventId),
          limit(1)
        ))

        if (!snap.empty) {
          const ticketId = snap.docs[0].data().ticketId ?? snap.docs[0].id
          router.replace(`/tickets/${ticketId}`)
          return
        }
      } catch (err) {
        console.error('Poll error:', err)
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // ── Timed out — send to dashboard instead of event page ──
    // Fan can tap refresh button if ticket not there yet
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl animate-bounce">🎟️</span>
        </div>
        <h2 className="text-lg font-bold text-brand-charcoal mb-2">
          Payment successful!
        </h2>
        <p className="text-sm text-gray-400 mb-6 animate-pulse">
          {message}
        </p>
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-red animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-300 mt-6">
          Please don't close this page
        </p>
      </div>
    </div>
  )
}

export default function TicketSuccessPage() {
  return (
    <Suspense>
      <TicketSuccessContent />
    </Suspense>
  )
}