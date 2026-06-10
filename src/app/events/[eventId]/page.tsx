'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import {
  doc, getDoc, collection, addDoc, deleteDoc,
  query, where, getDocs, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { VenueEvent } from '@/types/event'
import type { Venue } from '@/types/venue'
import { formatTime } from '@/utils/formatDate'
import SportPill from '@/components/ui/SportPill'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import {
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  TicketIcon,
  ChevronLeftIcon,
  ShareIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import Link from 'next/link'

const SPORT_EMOJIS: Record<string, string> = {
  football:    '⚽',
  nfl:         '🏈',
  nhl:         '🏒',
  nba:         '🏀',
  rugby:       '🏉',
  tennis:      '🎾',
  f1:          '🏎️',
  cricket:     '🏏',
  'world-cup': '🏆',
}

function getSportEmoji(sport?: string): string {
  return SPORT_EMOJIS[sport ?? ''] ?? '🏟️'
}

function toDate(value: any): Date {
  if (!value) return new Date()
  if (value?.seconds !== undefined) return new Date(value.seconds * 1000)
  if (value instanceof Date) return value
  return new Date(value)
}

export default function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = use(params)
  const router      = useRouter()
  const { user, userDoc } = useAuth()
  const { toasts, toast, closeToast } = useToast()

  const [event,        setEvent]        = useState<VenueEvent | null>(null)
  const [venue,        setVenue]        = useState<Venue | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [rsvpLoading,  setRsvpLoading]  = useState(false)
  const [buyingTicket, setBuyingTicket] = useState(false)
  const [hasRsvp,      setHasRsvp]      = useState(false)
  const [rsvpId,       setRsvpId]       = useState('')
  const [copied,       setCopied]       = useState(false)
  const [quantity,     setQuantity]     = useState(1)

  useEffect(() => { fetchEvent() }, [eventId])
  useEffect(() => { if (user && event) checkRsvp() }, [user, event])

  async function fetchEvent() {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'events', eventId))
      if (!snap.exists()) { router.replace('/'); return }
      const data = { eventId: snap.id, ...snap.data() } as VenueEvent
      setEvent(data)
      if (data.venueId) {
        const venueSnap = await getDoc(doc(db, 'venues', data.venueId))
        if (venueSnap.exists()) {
          setVenue({ venueId: venueSnap.id, ...venueSnap.data() } as Venue)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function checkRsvp() {
    if (!user || !event) return
    try {
      if (event.entryType === 'paid') {
        const snap = await getDocs(query(
          collection(db, 'tickets'),
          where('userId',  '==', user.uid),
          where('eventId', '==', eventId)
        ))
        if (!snap.empty) { setHasRsvp(true); setRsvpId(snap.docs[0].id) }
      } else {
        const snap = await getDocs(query(
          collection(db, 'rsvps'),
          where('userId',  '==', user.uid),
          where('eventId', '==', eventId)
        ))
        if (!snap.empty) { setHasRsvp(true); setRsvpId(snap.docs[0].id) }
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRsvp() {
    if (!user) { router.push(`/auth/login?redirect=/events/${eventId}`); return }
    const isEmailAuth = user.providerData.some(p => p.providerId === 'password')
    if (isEmailAuth && !user.emailVerified) {
      toast.warning('Please verify your email before RSVPing')
      router.push('/auth/verify-email')
      return
    }
    if (!event) return
    setRsvpLoading(true)
    try {
      if (hasRsvp) {
        await deleteDoc(doc(db, 'rsvps', rsvpId))
        await updateDoc(doc(db, 'events', eventId), {
          rsvpCount: Math.max((event.rsvpCount ?? 1) - 1, 0),
        })
        setHasRsvp(false)
        setRsvpId('')
        setEvent(prev => prev
          ? { ...prev, rsvpCount: Math.max((prev.rsvpCount ?? 1) - 1, 0) }
          : prev
        )
        toast.success('RSVP cancelled')
      } else {
        if (event.rsvpLimit && (event.rsvpCount ?? 0) >= event.rsvpLimit) {
          toast.error('Sorry — this event is full')
          return
        }
        const rsvpRef = await addDoc(collection(db, 'rsvps'), {
          userId:       user.uid,
          userName:     `${userDoc?.firstName ?? ''} ${userDoc?.lastName ?? ''}`.trim(),
          userEmail:    user.email,
          eventId,
          venueId:      event.venueId,
          venueOwnerId: venue?.ownerId ?? '',
          createdAt:    serverTimestamp(),
          checkedIn:    false,
        })
        await updateDoc(doc(db, 'events', eventId), {
          rsvpCount: (event.rsvpCount ?? 0) + 1,
        })
        setHasRsvp(true)
        setRsvpId(rsvpRef.id)
        setEvent(prev => prev
          ? { ...prev, rsvpCount: (prev.rsvpCount ?? 0) + 1 }
          : prev
        )
        toast.success("You're on the list! 🎉")
      }
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setRsvpLoading(false)
    }
  }

  async function handleBuyTicket() {
    if (!user) { router.push(`/auth/login?redirect=/events/${eventId}`); return }
    const isEmailAuth = user.providerData.some(p => p.providerId === 'password')
    if (isEmailAuth && !user.emailVerified) {
      toast.warning('Please verify your email before purchasing')
      router.push('/auth/verify-email')
      return
    }
    if (!event) return
    setBuyingTicket(true)
    try {
      const res  = await fetch('/api/stripe/create-ticket-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ eventId, userId: user.uid, quantity }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to start checkout. Please try again.')
        return
      }
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setBuyingTicket(false)
    }
  }

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: event?.title ?? '', url })
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <LoadingSpinner fullPage />
  if (!event)  return null

  const startDate         = toDate(event.startTime)
  const isFull            = event.rsvpLimit ? (event.rsvpCount ?? 0) >= event.rsvpLimit : false
  const isFree            = event.entryType === 'free'
  const bannerImage       = event.bannerImage || event.coverPhoto || null
  const isEmailAuth       = user?.providerData.some(p => p.providerId === 'password')
  const needsVerification = isEmailAuth && user && !user.emailVerified

  const ticketPriceCAD = ((event.totalTicketPrice ?? event.ticketPrice) ?? 0) / 100
  const totalPrice     = ticketPriceCAD * quantity
  const basePriceCAD   = (event.ticketPrice ?? 0) / 100
  const taxAmountCAD   = (event.taxAmount ?? 0) / 100

  const remaining   = event.ticketCapacity
    ? event.ticketCapacity - (event.ticketsSold ?? 0)
    : 10
  const maxQuantity = Math.min(10, remaining)

  // ── Fix 1: Check if venue has completed Stripe onboarding ──
  const venueStripeOnboarded = (venue as any)?.stripeOnboarded ?? false

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">

      {/* ── Back bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-16 md:top-24 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-red transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Banner ── */}
        <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-brand-charcoal to-gray-700">
          {bannerImage ? (
            <img
              src={bannerImage}
              alt={event.title}
              className="w-full h-56 md:h-72 object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-56 flex items-center justify-center text-7xl">
              {getSportEmoji(event.sport)}
            </div>
          )}
          {event.status === 'live' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-brand-red text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE NOW
            </div>
          )}
          {event.status === 'cancelled' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-xl">Event Cancelled</span>
            </div>
          )}
        </div>

        {/* ── Email verification warning ── */}
        {needsVerification && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Verify your email to RSVP</p>
              <p className="text-xs text-amber-600 mt-0.5">Check your inbox for a verification link</p>
            </div>
            <button
              onClick={() => router.push('/auth/verify-email')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex-shrink-0"
            >
              Verify →
            </button>
          </div>
        )}

        {/* ── Event header card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">

          <div className="flex items-center gap-2 mb-3">
            {event.sport && <SportPill sport={event.sport} size="sm" />}
            {event.league && (
              <span className="text-xs text-gray-400 font-semibold">{event.league}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-brand-charcoal mb-4 leading-tight">
            {event.title}
          </h1>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <CalendarDaysIcon className="w-4 h-4 text-brand-red flex-shrink-0" />
              <span>
                {startDate.toLocaleDateString('en-CA', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 text-brand-red flex-shrink-0" />
              <span>Kickoff at {formatTime(event.startTime)}</span>
              {event.doorsOpen && (
                <span className="text-gray-400">· Doors {formatTime(event.doorsOpen)}</span>
              )}
            </div>
          </div>

          {/* Teams */}
          {event.teams && event.teams.length === 2 && (
            <div className="flex items-center justify-center gap-4 py-4 mb-4 bg-gray-50 rounded-xl">
              <span className="font-bold text-brand-charcoal text-lg text-right flex-1">
                {event.teams[0]}
              </span>
              <span className="text-xs font-bold text-gray-400 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                VS
              </span>
              <span className="font-bold text-brand-charcoal text-lg text-left flex-1">
                {event.teams[1]}
              </span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-brand-red/20">
              <div className="bg-brand-red px-4 py-2.5 flex items-center gap-2">
                <span className="text-white text-base">🎉</span>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  What's on offer
                </p>
              </div>
              <div className="bg-gradient-to-br from-brand-red-light to-amber-50 px-4 py-4">
                <p className="text-sm text-brand-charcoal leading-relaxed font-medium">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4 text-brand-red" />
              <span>
                <span className="font-bold text-brand-charcoal">{event.rsvpCount ?? 0}</span>
                {event.rsvpLimit
                  ? ` / ${event.rsvpLimit} spots filled`
                  : ' going'
                }
              </span>
            </div>
            {!isFree && (
              <div className="flex items-center gap-1.5">
                <TicketIcon className="w-4 h-4 text-brand-red" />
                <span>
                  <span className="font-bold text-brand-charcoal">
                    ${ticketPriceCAD.toFixed(2)}
                  </span>
                  {' '}per ticket
                </span>
              </div>
            )}
          </div>

          {/* ── Action section ── */}
          {event.status === 'cancelled' ? (
            <div className="w-full py-3 px-4 bg-gray-100 rounded-xl text-center text-sm font-semibold text-gray-400">
              This event has been cancelled
            </div>

          ) : isFree ? (
            // ── Free event ──
            <>
              <Button
                fullWidth
                size="lg"
                loading={rsvpLoading}
                onClick={handleRsvp}
                variant={hasRsvp ? 'secondary' : 'primary'}
              >
                {hasRsvp ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    You're going · Cancel RSVP
                  </span>
                ) : isFull ? (
                  'Event full'
                ) : needsVerification ? (
                  'Verify email to RSVP'
                ) : user ? (
                  'RSVP — Free'
                ) : (
                  'Sign in to RSVP'
                )}
              </Button>

              {hasRsvp && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-sm font-semibold text-green-700">You're on the list! 🎉</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Show up on match day and enjoy the game
                  </p>
                </div>
              )}
            </>

          ) : (
            // ── Paid event ──
            <div className="space-y-3">
              {hasRsvp ? (
                <div className="w-full p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-sm font-bold text-green-700 flex items-center justify-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    Ticket purchased
                  </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-xs text-green-600 mt-1.5 hover:underline block mx-auto"
                  >
                    View your ticket in dashboard →
                  </button>
                </div>

              ) : !venueStripeOnboarded ? (
                // ── Fix 1: Stripe not connected — block purchase ──
                <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-sm font-bold text-amber-800">
                    🎟️ Tickets coming soon
                  </p>
                  <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">
                    This venue is still setting up payments.
                    Check back again later.
                  </p>
                </div>

              ) : remaining <= 0 ? (
                <div className="w-full py-3 px-4 bg-gray-100 rounded-xl text-center text-sm font-semibold text-gray-400">
                  Sold out
                </div>

              ) : (
                <>
                  {/* Quantity selector */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-brand-charcoal">Tickets</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ${ticketPriceCAD.toFixed(2)} per person
                        {event.taxRate && event.taxRate > 0 && (
                          <span className="text-gray-300 ml-1">
                            · incl. {event.taxLabel}
                          </span>
                        )}
                        {event.ticketCapacity && (
                          <span className="ml-1">· {remaining} remaining</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold text-brand-charcoal hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <span className="text-base font-bold text-brand-charcoal w-4 text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                        disabled={quantity >= maxQuantity}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold text-brand-charcoal hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  {quantity > 1 && (
                    <div className="space-y-1.5 px-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          {quantity} tickets × ${ticketPriceCAD.toFixed(2)}
                        </span>
                        <span className="font-bold text-brand-charcoal">
                          ${totalPrice.toFixed(2)} CAD
                        </span>
                      </div>
                      {event.taxRate && event.taxRate > 0 && (
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>
                            Incl. {event.taxLabel} ({event.taxRate}%) on base price
                          </span>
                          <span>${(taxAmountCAD * quantity).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Buy button */}
                  <Button
                    fullWidth
                    size="lg"
                    loading={buyingTicket}
                    onClick={handleBuyTicket}
                  >
                    {!user
                      ? 'Sign in to buy tickets'
                      : needsVerification
                        ? 'Verify email to purchase'
                        : quantity === 1
                          ? `Buy ticket — $${ticketPriceCAD.toFixed(2)}`
                          : `Buy ${quantity} tickets — $${totalPrice.toFixed(2)}`
                    }
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Venue card ── */}
        {venue && (
          <Link href={`/venues/${venue.slug}`}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 hover:border-brand-red transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <BuildingStorefrontIcon className="w-5 h-5 text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">Hosted at</p>
                    <p className="text-sm font-bold text-brand-charcoal">{venue.name}</p>
                    <p className="text-xs text-gray-400">{venue.shortAddress || venue.address}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-brand-red flex-shrink-0">
                  View venue →
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* ── Directions ── */}
        {venue?.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand-red transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPinIcon className="w-5 h-5 text-brand-red" />
                <div>
                  <p className="text-sm font-semibold text-brand-charcoal">Get directions</p>
                  <p className="text-xs text-gray-400">{venue.shortAddress || venue.address}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-brand-red">Open Maps →</span>
            </div>
          </a>
        )}

      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}