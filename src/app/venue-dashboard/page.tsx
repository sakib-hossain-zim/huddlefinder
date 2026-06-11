'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  collection, query, where, getDocs,
  orderBy, doc, getDoc, updateDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Venue } from '@/types/venue'
import { VenueEvent } from '@/types/event'
import { formatEventDateShort, formatTime } from '@/utils/formatDate'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import {
  CalendarDaysIcon,
  UserGroupIcon,
  TicketIcon,
  PlusCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
  BoltIcon,
  StarIcon,
  UserCircleIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const EVENTS_PER_PAGE = 5

interface Stats {
  totalEvents:   number
  totalRsvps:    number
  upcomingCount: number
}

function toDate(value: any): Date {
  if (!value) return new Date()
  if (value?.seconds !== undefined) return new Date(value.seconds * 1000)
  if (value instanceof Date) return value
  return new Date(value)
}

function getSportEmoji(sport?: string): string {
  const emojis: Record<string, string> = {
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
  return emojis[sport ?? ''] ?? '🏟️'
}

function VenueDashboardContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { userDoc, refreshUserDoc, user } = useAuth()
  const { toasts, toast, closeToast } = useToast()

  const [venue,          setVenue]          = useState<Venue | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<VenueEvent[]>([])
  const [pastEvents,     setPastEvents]     = useState<VenueEvent[]>([])
  const [stats,          setStats]          = useState<Stats>({
    totalEvents: 0, totalRsvps: 0, upcomingCount: 0,
  })
  const [loading,      setLoading]      = useState(true)
  const [reactivating, setReactivating] = useState(false)
  const [showPast,     setShowPast]     = useState(false)

  const [upcomingPage,   setUpcomingPage]   = useState(1)
  const [pastPage,       setPastPage]       = useState(1)
  const [promotionsUsed, setPromotionsUsed] = useState(0)
  const [daysUntilReset, setDaysUntilReset] = useState(0)

  // ── Ref: prevents Stripe Connect incomplete toast ──────
  // Only shows success if stripeOnboarded=true in Firestore
  const pendingStripeCheckRef = useRef(false)

  // ── Ref: prevents subscription toast loop ─────────────
  // refreshUserDoc() triggers useEffect again — this ref
  // ensures handleSubscriptionSuccess only runs once
  const subscriptionHandledRef = useRef(false)

  // useEffect(() => {
  //   const subscription = searchParams.get('subscription')
  //   const plan         = searchParams.get('plan')
  //   const connected    = searchParams.get('connected')

  //   // ── Only handle subscription success once ────────────
  //   if (
  //     subscription === 'success' &&
  //     plan &&
  //     userDoc?.venueId &&
  //     !subscriptionHandledRef.current
  //   ) {
  //     subscriptionHandledRef.current = true
  //     handleSubscriptionSuccess(plan)
  //   }

  //   if (connected === 'true') {
  //     pendingStripeCheckRef.current = true
  //     router.replace('/venue-dashboard')
  //   }
  // }, [searchParams, userDoc])

    useEffect(() => {
    const subscription = searchParams.get('subscription')
    const plan         = searchParams.get('plan')
    const connected    = searchParams.get('connected')

    // ── Clear URL immediately if subscription params present ──
    if (subscription === 'success' && plan) {
      router.replace('/venue-dashboard')
    }

    // ── Use sessionStorage to persist across component mounts ──
    // subscriptionHandledRef resets when component unmounts
    // sessionStorage persists for the whole browser session
    // Using plan as value so upgrading again (starter→pro)
    // still shows the toast correctly
    const alreadyHandled = sessionStorage.getItem('hf_sub_handled') === plan

    if (
      subscription === 'success' &&
      plan &&
      userDoc?.venueId &&
      !subscriptionHandledRef.current &&
      !alreadyHandled
    ) {
      subscriptionHandledRef.current = true
      sessionStorage.setItem('hf_sub_handled', plan)
      handleSubscriptionSuccess(plan)
    }

    if (connected === 'true') {
      pendingStripeCheckRef.current = true
      router.replace('/venue-dashboard')
    }
  }, [searchParams, userDoc])

  // async function handleSubscriptionSuccess(plan: string) {
  //   if (!userDoc?.venueId) return
  //   try {
  //     await updateDoc(doc(db, 'venues', userDoc.venueId), {
  //       plan,
  //       featured:            plan === 'pro',
  //       promotionsUsed:      0,
  //       promotionCycleStart: new Date(),
  //       subscriptionStatus:  'active',
  //       downgradingTo:       null,
  //       subscriptionEndsAt:  null,
  //       updatedAt:           new Date(),
  //     })
  //     await refreshUserDoc()
  //     toast.success(`Welcome to ${plan.charAt(0).toUpperCase() + plan.slice(1)}! 🎉`)
  //     router.replace('/venue-dashboard')
  //     if (userDoc.venueId) fetchDashboardData(userDoc.venueId)
  //   } catch (err) {
  //     console.error('Subscription success handler error:', err)
  //   }
  // }

    async function handleSubscriptionSuccess(plan: string) {
    if (!userDoc?.venueId) return
    try {
      await updateDoc(doc(db, 'venues', userDoc.venueId), {
        plan,
        featured:            plan === 'pro',
        promotionsUsed:      0,
        promotionCycleStart: new Date(),
        subscriptionStatus:  'active',
        downgradingTo:       null,
        subscriptionEndsAt:  null,
        updatedAt:           new Date(),
      })
      await refreshUserDoc()
      toast.success(`Welcome to ${plan.charAt(0).toUpperCase() + plan.slice(1)}! 🎉`)
      if (userDoc.venueId) fetchDashboardData(userDoc.venueId)
    } catch (err) {
      console.error('Subscription success handler error:', err)
    }
  }

  useEffect(() => {
    if (userDoc?.venueId) {
      fetchDashboardData(userDoc.venueId)
    } else {
      setLoading(false)
    }
  }, [userDoc])

  async function fetchDashboardData(venueId: string) {
    setLoading(true)
    try {
      const [venueSnap, eventsSnap] = await Promise.all([
        getDoc(doc(db, 'venues', venueId)),
        getDocs(query(
          collection(db, 'events'),
          where('venueId', '==', venueId),
          orderBy('startTime', 'asc')
        )),
      ])

      if (venueSnap.exists()) {
        const venueData = { venueId: venueSnap.id, ...venueSnap.data() } as Venue
        setVenue(venueData)

        // ── Stripe Connect toast — only if fully onboarded ──
        if (pendingStripeCheckRef.current) {
          pendingStripeCheckRef.current = false
          if ((venueData as any).stripeOnboarded) {
            toast.success('Stripe connected! You can now sell tickets. 🎉')
          } else {
            toast.warning('Stripe setup incomplete. Please finish connecting your account.')
          }
        }

        if (venueData.plan === 'starter') {
          const used = (venueData as any).promotionsUsed ?? 0
          setPromotionsUsed(used)
          const cycleStart = (venueData as any).promotionCycleStart
          if (cycleStart) {
            const start = cycleStart?.toDate
              ? cycleStart.toDate()
              : cycleStart._seconds
                ? new Date(cycleStart._seconds * 1000)
                : new Date(cycleStart)
            const elapsed = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)
            setDaysUntilReset(Math.max(Math.ceil(30 - elapsed), 0))
          }
        }
      }

      const now       = new Date()
      const allEvents = eventsSnap.docs.map(d => ({
        eventId: d.id, ...d.data()
      } as VenueEvent))

      const upcoming = allEvents.filter(e =>
        toDate(e.startTime) >= now && e.status !== 'cancelled'
      )
      const past = allEvents
        .filter(e => toDate(e.startTime) < now)
        .reverse()

      setUpcomingEvents(upcoming)
      setPastEvents(past)

      const totalRsvps = allEvents.reduce(
        (sum, e) => sum + (e.rsvpCount ?? 0), 0
      )
      setStats({
        totalEvents:   allEvents.length,
        totalRsvps,
        upcomingCount: upcoming.length,
      })
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleReactivate() {
    if (!user || !userDoc?.venueId) return
    setReactivating(true)
    try {
      const res  = await fetch('/api/stripe/reactivate-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.uid, venueId: userDoc.venueId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to reactivate. Please try again.')
        return
      }
      await fetchDashboardData(userDoc.venueId)
      toast.success(`${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} plan kept! ✓`)
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setReactivating(false)
    }
  }

  function formatEndDate(subscriptionEndsAt: any): string {
    if (!subscriptionEndsAt) return 'end of billing cycle'
    const date = subscriptionEndsAt?.toDate
      ? subscriptionEndsAt.toDate()
      : subscriptionEndsAt?._seconds
        ? new Date(subscriptionEndsAt._seconds * 1000)
        : new Date(subscriptionEndsAt)
    return date.toLocaleDateString('en-CA', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  if (loading) return <LoadingSpinner fullPage />

  if (!userDoc?.venueId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <BuildingStorefrontIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-brand-charcoal mb-2">No venue linked</h2>
          <p className="text-sm text-gray-400 mb-6">
            Complete your venue setup to access the dashboard
          </p>
          <Button onClick={() => router.push('/onboarding/claim')}>
            Set up your venue
          </Button>
        </div>
      </div>
    )
  }

  const planLabel      = venue?.plan
    ? venue.plan.charAt(0).toUpperCase() + venue.plan.slice(1)
    : 'Free'
  const promotionsLeft = Math.max(5 - promotionsUsed, 0)
  const venueAny       = venue as any

  const totalUpcomingPages = Math.ceil(upcomingEvents.length / EVENTS_PER_PAGE)
  const totalPastPages     = Math.ceil(pastEvents.length / EVENTS_PER_PAGE)

  const paginatedUpcoming = upcomingEvents.slice(
    (upcomingPage - 1) * EVENTS_PER_PAGE,
    upcomingPage * EVENTS_PER_PAGE
  )
  const paginatedPast = pastEvents.slice(
    (pastPage - 1) * EVENTS_PER_PAGE,
    pastPage * EVENTS_PER_PAGE
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Venue Dashboard
            </p>
            <h1 className="text-2xl font-bold text-brand-charcoal">
              {venue?.name ?? 'Your venue'}
            </h1>
            {venue && (
              <p className="text-sm text-gray-400 mt-0.5">
                {[venue.city, `${planLabel} plan`].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {venue?.slug && (
              <Link
                href={`/venues/${venue.slug}`}
                className="text-xs font-semibold text-brand-red hover:underline"
                target="_blank"
              >
                View public page →
              </Link>
            )}
            <button
              onClick={() => router.push('/venue-dashboard/profile')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-brand-charcoal hover:border-brand-red hover:text-brand-red transition-colors shadow-sm"
            >
              <UserCircleIcon className="w-4 h-4" />
              Profile
            </button>
          </div>
        </div>

        {/* ── Incomplete profile nudge ── */}
        {venue && !venue.description && !(venue.sports?.length > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <BuildingStorefrontIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800">Complete your venue profile</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Add description, sports, photos and hours so fans can find you
              </p>
            </div>
            <button
              onClick={() => router.push('/venue-dashboard/settings')}
              className="text-xs font-bold text-blue-700 flex-shrink-0"
            >
              Complete →
            </button>
          </div>
        )}

        {/* ── Cancelling banner ── */}
        {venueAny?.subscriptionStatus === 'cancelling' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">
                Your {planLabel} plan is ending
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Benefits active until{' '}
                <span className="font-bold">
                  {formatEndDate(venueAny?.subscriptionEndsAt)}
                </span>.
                After that your account moves to Free.
              </p>
            </div>
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="text-xs font-bold text-amber-700 flex-shrink-0 hover:underline disabled:opacity-50"
            >
              Keep plan →
            </button>
          </div>
        )}

        {/* ── Downgrading banner ── */}
        {venueAny?.subscriptionStatus === 'downgrading' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800">
                Downgrading to {venueAny?.downgradingTo?.charAt(0).toUpperCase() + venueAny?.downgradingTo?.slice(1)}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                You keep {planLabel} features until{' '}
                <span className="font-bold">
                  {formatEndDate(venueAny?.subscriptionEndsAt)}
                </span>.
                Then billed at the lower rate.
              </p>
            </div>
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="text-xs font-bold text-blue-700 flex-shrink-0 hover:underline disabled:opacity-50"
            >
              Keep {planLabel} →
            </button>
          </div>
        )}

        {/* ── Upgrade banner for free users ── */}
        {venue?.plan === 'free' && (
          <div className="bg-gradient-to-r from-brand-charcoal to-gray-700 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-sm">Upgrade to sell tickets</p>
              <p className="text-white/60 text-xs mt-0.5">
                Starter plan — $49/mo. Feature 5 events/month and more.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push('/venue-dashboard/upgrade')}
              className="flex-shrink-0 bg-brand-red hover:bg-brand-red-dark"
            >
              Upgrade
            </Button>
          </div>
        )}

        {/* ── Starter promotions widget ── */}
        {venue?.plan === 'starter' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MegaphoneIcon className="w-4 h-4 text-brand-red" />
                <p className="text-sm font-bold text-brand-charcoal">Event promotions</p>
              </div>
              <button
                onClick={() => router.push('/venue-dashboard/upgrade')}
                className="text-xs font-bold text-amber-600 hover:underline"
              >
                ⚡ Go Pro for unlimited
              </button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(i => (
                  <div
                    key={i}
                    className={clsx(
                      'w-3 h-3 rounded-full transition-colors',
                      i <= promotionsUsed ? 'bg-brand-red' : 'bg-gray-200'
                    )}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-brand-charcoal">
                {promotionsUsed}/5 used
              </p>
              <p className="text-xs text-gray-400 ml-auto">
                {daysUntilReset > 0 ? `resets in ${daysUntilReset} days` : 'resets soon'}
              </p>
            </div>
            {promotionsLeft > 0 ? (
              <p className="text-xs text-gray-400">
                You have{' '}
                <span className="font-bold text-brand-charcoal">
                  {promotionsLeft} promotion{promotionsLeft !== 1 ? 's' : ''}
                </span>{' '}
                remaining. Feature events from the event management page.
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                All promotions used. Remove one or{' '}
                <button
                  onClick={() => router.push('/venue-dashboard/upgrade')}
                  className="font-bold text-brand-red hover:underline"
                >
                  upgrade to Pro
                </button>{' '}
                for unlimited.
              </p>
            )}
          </div>
        )}

        {/* ── Pro promotions indicator ── */}
        {venue?.plan === 'pro' && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <MegaphoneIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">⭐ Unlimited event promotions</p>
              <p className="text-xs text-amber-600 mt-0.5">
                All your events are Featured by default. Toggle visibility per event.
              </p>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total events',  value: stats.totalEvents,   icon: CalendarDaysIcon, color: 'bg-blue-50 text-blue-600'          },
            { label: 'Total RSVPs',   value: stats.totalRsvps,    icon: UserGroupIcon,    color: 'bg-green-50 text-green-600'        },
            { label: 'Upcoming',      value: stats.upcomingCount, icon: BoltIcon,         color: 'bg-brand-red-light text-brand-red' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center mb-2', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-brand-charcoal">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Quick actions ── */}
        <div className="mb-6">
          {venue?.plan !== 'free' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/venue-dashboard/settings')}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-brand-red transition-colors active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BuildingStorefrontIcon className="w-5 h-5 text-brand-charcoal" />
                </div>
                <div>
                  <p className="font-bold text-sm text-brand-charcoal">Manage Venue</p>
                  <p className="text-gray-400 text-xs mt-0.5">Profile & settings</p>
                </div>
              </button>
              <button
                onClick={() => router.push('/venue-dashboard/scanner')}
                className="bg-green-600 text-white rounded-2xl p-4 flex items-center gap-3 hover:bg-green-700 transition-colors active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCodeIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Scan Tickets</p>
                  <p className="text-white/70 text-xs mt-0.5">Check in fans</p>
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/venue-dashboard/settings')}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-brand-red transition-colors active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BuildingStorefrontIcon className="w-5 h-5 text-brand-charcoal" />
              </div>
              <div>
                <p className="font-bold text-sm text-brand-charcoal">Manage Venue</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Update profile, photos, hours and settings
                </p>
              </div>
            </button>
          )}
        </div>

        {/* ── Stripe Connect warning ── */}
        {venue && !venueAny.stripeOnboarded && venue.plan !== 'free' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <BanknotesIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-700">
                Connect Stripe to accept payments
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                You won't be able to sell tickets until Stripe is connected.
              </p>
            </div>
            <button
              onClick={() => router.push('/venue-dashboard/stripe')}
              className="text-xs font-bold text-amber-700 flex-shrink-0"
            >
              Connect →
            </button>
          </div>
        )}

        {/* ── Upcoming events ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-brand-charcoal flex items-center gap-2">
              Upcoming events
              {upcomingEvents.length > 0 && (
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {upcomingEvents.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => router.push('/venue-dashboard/events/create')}
              className="flex items-center gap-1.5 bg-brand-red text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-brand-red-dark transition-colors active:scale-[0.97] shadow-sm shadow-brand-red/30"
            >
              <PlusCircleIcon className="w-4 h-4" />
              New event
            </button>
          </div>

          {upcomingEvents.length > 0 ? (
            <>
              <div className="space-y-3">
                {paginatedUpcoming.map(event => (
                  <Link
                    key={event.eventId}
                    href={`/venue-dashboard/events/${event.eventId}`}
                    className="block"
                  >
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand-red transition-colors active:scale-[0.98]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-brand-red-light rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                            {getSportEmoji(event.sport)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-brand-charcoal text-sm truncate">
                                {event.title}
                              </p>
                              {event.promoted && !event.private && (
                                <span className="text-xs text-brand-red font-bold flex-shrink-0">⭐</span>
                              )}
                              {event.private && (
                                <span className="text-xs text-gray-400 font-semibold flex-shrink-0">Private</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {event.startTime
                                ? `${formatEventDateShort(event.startTime)} · ${formatTime(event.startTime)}`
                                : 'Date TBC'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm font-bold text-brand-charcoal">
                                {event.rsvpCount ?? 0}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">RSVPs</p>
                          </div>
                          {event.entryType === 'paid' && (
                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <TicketIcon className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-sm font-bold text-brand-charcoal">
                                  {event.ticketsSold ?? 0}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">Tickets</p>
                            </div>
                          )}
                          <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                      {event.status === 'live' && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                          <span className="text-xs font-bold text-brand-red">LIVE NOW</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {totalUpcomingPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setUpcomingPage(p => Math.max(1, p - 1))}
                    disabled={upcomingPage === 1}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-500 hover:text-brand-charcoal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalUpcomingPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setUpcomingPage(page)}
                        className={clsx(
                          'w-8 h-8 rounded-full text-sm font-bold transition-colors',
                          upcomingPage === page
                            ? 'bg-brand-red text-white'
                            : 'text-gray-400 hover:text-brand-charcoal hover:bg-gray-100'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setUpcomingPage(p => Math.min(totalUpcomingPages, p + 1))}
                    disabled={upcomingPage === totalUpcomingPages}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-500 hover:text-brand-charcoal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {totalUpcomingPages > 1 && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  Showing {((upcomingPage - 1) * EVENTS_PER_PAGE) + 1}–{Math.min(upcomingPage * EVENTS_PER_PAGE, upcomingEvents.length)} of {upcomingEvents.length} upcoming events
                </p>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <CalendarDaysIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-brand-charcoal mb-1">No upcoming events</p>
              <p className="text-xs text-gray-400 mb-4">Post your first event to start getting RSVPs</p>
              <Button size="sm" onClick={() => router.push('/venue-dashboard/events/create')}>
                Create your first event
              </Button>
            </div>
          )}
        </div>

        {/* ── Past events ── */}
        {pastEvents.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => { setShowPast(p => !p); setPastPage(1) }}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <h2 className="text-base font-bold text-brand-charcoal flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-gray-400" />
                Past events
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {pastEvents.length}
                </span>
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 group-hover:text-brand-charcoal transition-colors">
                {showPast ? 'Hide' : 'Show'}
                <ChevronDownIcon className={clsx(
                  'w-4 h-4 transition-transform duration-200',
                  showPast && 'rotate-180'
                )} />
              </div>
            </button>

            {showPast && (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  Past events are read-only. You can view performance data but cannot edit.
                </p>
                <div className="space-y-3">
                  {paginatedPast.map(event => (
                    <Link
                      key={event.eventId}
                      href={`/venue-dashboard/events/${event.eventId}`}
                      className="block"
                    >
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 opacity-70 hover:opacity-100 hover:border-gray-200 transition-all active:scale-[0.98]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                              {getSportEmoji(event.sport)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-500 text-sm truncate">
                                  {event.title}
                                </p>
                                {event.status === 'cancelled' && (
                                  <span className="text-xs text-red-400 font-semibold flex-shrink-0 bg-red-50 px-1.5 py-0.5 rounded-full">
                                    Cancelled
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {event.startTime
                                  ? `${formatEventDateShort(event.startTime)} · ${formatTime(event.startTime)}`
                                  : 'Date TBC'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <UserGroupIcon className="w-3.5 h-3.5 text-gray-300" />
                                <span className="text-sm font-bold text-gray-400">
                                  {event.rsvpCount ?? 0}
                                </span>
                              </div>
                              <p className="text-xs text-gray-300">RSVPs</p>
                            </div>
                            {event.entryType === 'paid' && (
                              <div className="text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <TicketIcon className="w-3.5 h-3.5 text-gray-300" />
                                  <span className="text-sm font-bold text-gray-400">
                                    {event.ticketsSold ?? 0}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300">Tickets</p>
                              </div>
                            )}
                            <ChevronRightIcon className="w-4 h-4 text-gray-200" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {totalPastPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setPastPage(p => Math.max(1, p - 1))}
                      disabled={pastPage === 1}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-500 hover:text-brand-charcoal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPastPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setPastPage(page)}
                          className={clsx(
                            'w-8 h-8 rounded-full text-sm font-bold transition-colors',
                            pastPage === page
                              ? 'bg-gray-500 text-white'
                              : 'text-gray-400 hover:text-brand-charcoal hover:bg-gray-100'
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setPastPage(p => Math.min(totalPastPages, p + 1))}
                      disabled={pastPage === totalPastPages}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-500 hover:text-brand-charcoal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {totalPastPages > 1 && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Showing {((pastPage - 1) * EVENTS_PER_PAGE) + 1}–{Math.min(pastPage * EVENTS_PER_PAGE, pastEvents.length)} of {pastEvents.length} past events
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Profile completeness ── */}
        {venue && (
          <div className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-brand-charcoal mb-4 flex items-center gap-2">
              <StarIcon className="w-4 h-4 text-brand-red" />
              Profile completeness
            </h2>
            <div className="space-y-2.5">
              {[
                { label: 'Venue name',    done: !!venue.name                               },
                { label: 'Address',       done: !!venue.address                            },
                { label: 'Description',   done: !!venue.description                        },
                { label: 'Cover photo',   done: !!venue.coverPhoto                         },
                { label: 'Sports shown',  done: (venue.sports?.length ?? 0) > 0           },
                { label: 'Opening hours', done: Object.keys(venue.hours ?? {}).length > 0 },
                { label: 'Phone number',  done: !!venue.phone                              },
                { label: 'Website',       done: !!venue.website                            },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className={item.done ? 'text-gray-600' : 'text-gray-400'}>
                    {item.label}
                  </span>
                  <span className={clsx(
                    'text-xs font-semibold',
                    item.done ? 'text-green-600' : 'text-gray-300'
                  )}>
                    {item.done ? '✓ Done' : '○ Missing'}
                  </span>
                </div>
              ))}
            </div>
            {(() => {
              const items = [
                !!venue.name, !!venue.address, !!venue.description,
                !!venue.coverPhoto, (venue.sports?.length ?? 0) > 0,
                Object.keys(venue.hours ?? {}).length > 0,
                !!venue.phone, !!venue.website,
              ]
              const done    = items.filter(Boolean).length
              const percent = Math.round((done / items.length) * 100)
              return (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                    <span>{done}/{items.length} complete</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-red rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {percent < 100 && (
                    <button
                      onClick={() => router.push('/venue-dashboard/settings')}
                      className="text-xs text-brand-red font-semibold mt-2"
                    >
                      Complete your profile →
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        )}

      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}

export default function VenueDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <VenueDashboardContent />
    </Suspense>
  )
}