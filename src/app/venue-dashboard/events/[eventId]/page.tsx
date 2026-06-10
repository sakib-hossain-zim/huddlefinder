'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import {
  doc, getDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { VenueEvent } from '@/types/event'
import { Venue } from '@/types/venue'
import { formatEventDate, formatTime } from '@/utils/formatDate'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import {
  ChevronLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  TicketIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  PhotoIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'

const SPORTS = [
  { value: 'football',  label: 'Football',  emoji: '⚽' },
  { value: 'nfl',       label: 'NFL',        emoji: '🏈' },
  { value: 'nhl',       label: 'NHL',        emoji: '🏒' },
  { value: 'nba',       label: 'NBA',        emoji: '🏀' },
  { value: 'rugby',     label: 'Rugby',      emoji: '🏉' },
  { value: 'tennis',    label: 'Tennis',     emoji: '🎾' },
  { value: 'f1',        label: 'Formula 1',  emoji: '🏎️' },
  { value: 'cricket',   label: 'Cricket',    emoji: '🏏' },
  { value: 'world-cup', label: 'World Cup',  emoji: '🏆' },
]

const LEAGUES: Record<string, string[]> = {
  football:    ['World Cup', 'Premier League', 'Champions League', 'La Liga', 'Serie A', 'MLS', 'Other'],
  nfl:         ['NFL Regular Season', 'NFL Playoffs', 'Super Bowl', 'Other'],
  nhl:         ['NHL Regular Season', 'NHL Playoffs', 'Stanley Cup', 'Other'],
  nba:         ['NBA Regular Season', 'NBA Playoffs', 'NBA Finals', 'Other'],
  rugby:       ['Rugby World Cup', 'Six Nations', 'Super Rugby', 'Other'],
  tennis:      ['Wimbledon', 'US Open', 'Australian Open', 'French Open', 'Other'],
  f1:          ['Formula 1', 'Other'],
  cricket:     ['ICC World Cup', 'Test Cricket', 'IPL', 'Other'],
  'world-cup': ['World Cup'],
}

interface Attendee {
  id:           string
  userId:       string
  userName:     string
  userEmail:    string
  type:         'rsvp' | 'ticket'
  quantity:     number
  checkedIn:    boolean
  checkedInAt?: any
  createdAt:    any
}

export default function EventManagementPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId }       = use(params)
  const router            = useRouter()
  const { userDoc, user } = useAuth()
  const { toasts, toast, closeToast } = useToast()

  const [event,          setEvent]          = useState<VenueEvent | null>(null)
  const [venue,          setVenue]          = useState<Venue | null>(null)
  const [attendees,      setAttendees]      = useState<Attendee[]>([])
  const [loading,        setLoading]        = useState(true)
  const [editing,        setEditing]        = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [promoting,      setPromoting]      = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [error,          setError]          = useState('')
  const [tab,            setTab]            = useState<'overview' | 'rsvps'>('overview')

  const [promotionsUsed, setPromotionsUsed] = useState(0)
  const [promotionsLeft, setPromotionsLeft] = useState(5)
  const [daysUntilReset, setDaysUntilReset] = useState(0)

  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [date,          setDate]          = useState('')
  const [time,          setTime]          = useState('')
  const [rsvpLimit,     setRsvpLimit]     = useState('')
  const [sport,         setSport]         = useState('')
  const [league,        setLeague]        = useState('')
  const [bannerFile,    setBannerFile]    = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')

  useEffect(() => {
    if (user) fetchEvent()
  }, [eventId, user])

  async function fetchEvent() {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'events', eventId))
      if (!snap.exists()) { router.replace('/venue-dashboard'); return }

      const data = { eventId: snap.id, ...snap.data() } as VenueEvent
      setEvent(data)
      setTitle(data.title ?? '')
      setDescription(data.description ?? '')
      setSport(data.sport ?? '')
      setLeague(data.league ?? '')

      if (data.startTime) {
        const d = data.startTime?.seconds
          ? new Date(data.startTime.seconds * 1000)
          : new Date(data.startTime)
        setDate(d.toISOString().split('T')[0])
        setTime(d.toTimeString().slice(0, 5))
      }
      setRsvpLimit(data.rsvpLimit?.toString() ?? '')

      if (data.venueId) {
        const venueSnap = await getDoc(doc(db, 'venues', data.venueId))
        if (venueSnap.exists()) {
          const venueData = { venueId: venueSnap.id, ...venueSnap.data() } as Venue
          setVenue(venueData)

          if (venueData.plan === 'starter') {
            const used = (venueData as any).promotionsUsed ?? 0
            setPromotionsUsed(used)
            setPromotionsLeft(Math.max(5 - used, 0))

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
      }

      await fetchAttendeesForEvent(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAttendeesForEvent(eventData: VenueEvent) {
    if (!user) return
    try {
      const isFreeEvent = eventData.entryType !== 'paid'

      if (isFreeEvent) {
        const snap = await getDocs(query(
          collection(db, 'rsvps'),
          where('eventId',      '==', eventId),
          where('venueOwnerId', '==', user.uid)
        ))
        const results: Attendee[] = snap.docs
          .map(d => ({
            id:          d.id,
            userId:      d.data().userId     ?? '',
            userName:    d.data().userName   ?? 'Unknown',
            userEmail:   d.data().userEmail  ?? '',
            type:        'rsvp' as const,
            quantity:    1,
            checkedIn:   d.data().checkedIn  ?? false,
            checkedInAt: d.data().checkedInAt,
            createdAt:   d.data().createdAt,
          }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setAttendees(results)
      } else {
        const snap = await getDocs(query(
          collection(db, 'tickets'),
          where('eventId', '==', eventId),
          where('venueId', '==', eventData.venueId)
        ))
        const results: Attendee[] = snap.docs
          .map(d => ({
            id:          d.id,
            userId:      d.data().userId     ?? '',
            userName:    d.data().userName   ?? 'Unknown',
            userEmail:   d.data().userEmail  ?? '',
            type:        'ticket' as const,
            quantity:    d.data().quantity   ?? 1,
            checkedIn:   d.data().checkedIn  ?? false,
            checkedInAt: d.data().checkedInAt,
            createdAt:   d.data().purchasedAt,
          }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setAttendees(results)
      }
    } catch (err: any) {
      console.warn('Attendees fetch error:', err.message)
      setAttendees([])
    }
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!event) return
    if (!sport) { setError('Please select a sport'); return }
    setSaving(true)
    setError('')
    try {
      const startTime = new Date(`${date}T${time}:00`)
      const updates: any = {
        title,
        description,
        sport,
        league,
        startTime,
        rsvpLimit: rsvpLimit ? Number(rsvpLimit) : null,
        updatedAt: new Date(),
      }
      if (bannerFile) {
        const bannerRef = ref(storage, `events/${eventId}/banner_${Date.now()}`)
        await uploadBytes(bannerRef, bannerFile)
        updates.bannerImage = await getDownloadURL(bannerRef)
      }
      await updateDoc(doc(db, 'events', eventId), updates)
      setEvent(prev => prev ? {
        ...prev, title, description, sport, league, startTime,
        rsvpLimit:   rsvpLimit ? Number(rsvpLimit) : undefined,
        bannerImage: updates.bannerImage ?? prev.bannerImage,
      } : prev)
      setEditing(false)
      toast.success('Event updated')
    } catch (err) {
      console.error(err)
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'events', eventId))
      router.replace('/venue-dashboard')
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  async function handleStatusChange(status: 'upcoming' | 'cancelled') {
    if (!event) return
    try {
      await updateDoc(doc(db, 'events', eventId), { status, updatedAt: new Date() })
      setEvent(prev => prev ? { ...prev, status } : prev)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleTogglePromotion(action: string) {
    if (!user || !event) return
    setPromoting(true)
    try {
      const res  = await fetch('/api/events/toggle-promotion', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ eventId: event.eventId, userId: user.uid, action }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'limit_reached') {
          setShowLimitModal(true)
          return
        }
        toast.error(data.error ?? 'Failed to update promotion')
        return
      }

      setEvent(prev => prev ? {
        ...prev,
        promoted: data.promoted ?? prev.promoted,
        private:  data.private  ?? prev.private,
      } : prev)

      if (data.promotionsUsed !== undefined) {
        setPromotionsUsed(data.promotionsUsed)
        setPromotionsLeft(Math.max(5 - data.promotionsUsed, 0))
      }
      if (data.daysUntilReset !== undefined) {
        setDaysUntilReset(data.daysUntilReset)
      }

      toast.success(
        action === 'promote'      ? '⭐ Event is now Featured!' :
        action === 'unpromote'    ? 'Promotion removed' :
        action === 'make_private' ? 'Event set to private' :
        '⭐ Event is now Featured!'
      )
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  function getSportEmoji(sport?: string): string {
    return SPORTS.find(s => s.value === sport)?.emoji ?? '🏟️'
  }

  function toDate(value: any): Date {
    if (!value) return new Date()
    if (value?.seconds !== undefined) return new Date(value.seconds * 1000)
    if (value instanceof Date) return value
    return new Date(value)
  }

  if (loading) return <LoadingSpinner fullPage />
  if (!event)  return null

  const startDate   = toDate(event.startTime)
  const isPastEvent = startDate < new Date()
  const venuePlan   = venue?.plan ?? event.venuePlan ?? 'free'
  const isPro       = venuePlan === 'pro'
  const isStarter   = venuePlan === 'starter'
  const isPaidEvent = event.entryType === 'paid'

  // ── Fix 3: Lock event once any attendee has been scanned ──
  const hasCheckedInAttendees = attendees.some(a => a.checkedIn)
  const checkedInCount        = attendees.filter(a => a.checkedIn).length

  const attendeesTabLabel = isPaidEvent
    ? `Ticket buyers (${attendees.length})`
    : `RSVPs (${attendees.length})`

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/venue-dashboard')}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        {/* ── Past event banner ── */}
        {isPastEvent && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <LockClosedIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-600">Past event — read only</p>
              <p className="text-xs text-gray-400 mt-0.5">
                This event has ended. You can view performance data but cannot make changes.
              </p>
            </div>
          </div>
        )}

        {/* ── Fix 3: In-progress banner — shown when fans are checked in ── */}
        {!isPastEvent && hasCheckedInAttendees && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-700">Event is in progress</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {checkedInCount} attendee{checkedInCount !== 1 ? 's have' : ' has'} checked in —
                this event cannot be edited or cancelled.
              </p>
            </div>
          </div>
        )}

        {/* ── Event hero ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
                isPastEvent ? 'bg-gray-100' : 'bg-brand-red-light'
              )}>
                {getSportEmoji(event.sport)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={clsx(
                  'text-xl font-bold leading-tight',
                  isPastEvent ? 'text-gray-500' : 'text-brand-charcoal'
                )}>
                  {event.title}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">{event.league}</p>
              </div>
            </div>

            <span className={clsx(
              'text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0',
              isPastEvent && event.status === 'upcoming' && 'bg-gray-100 text-gray-400',
              !isPastEvent && event.status === 'upcoming'  && 'bg-blue-50 text-blue-600',
              event.status === 'live'      && 'bg-green-50 text-green-600',
              event.status === 'completed' && 'bg-gray-100 text-gray-500',
              event.status === 'cancelled' && 'bg-red-50 text-red-500',
            )}>
              {event.status === 'live' && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1" />
              )}
              {isPastEvent && event.status === 'upcoming'
                ? 'Ended'
                : event.status?.charAt(0).toUpperCase() + event.status?.slice(1)
              }
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-brand-red" />
              <span>
                {startDate.toLocaleDateString('en-CA', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-brand-red" />
              <span>
                {startDate.toLocaleTimeString('en-CA', {
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {
                icon:  UserGroupIcon,
                value: event.rsvpCount ?? 0,
                label: isPaidEvent ? 'Attendees' : 'RSVPs',
              },
              {
                icon:  TicketIcon,
                value: event.ticketsSold ?? 0,
                label: 'Tickets sold',
              },
              {
                icon:  CheckCircleIcon,
                value: checkedInCount,
                label: 'Checked in',
              },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <stat.icon className={clsx(
                    'w-4 h-4',
                    isPastEvent ? 'text-gray-300' : 'text-brand-red'
                  )} />
                </div>
                <p className={clsx(
                  'text-xl font-bold',
                  isPastEvent ? 'text-gray-400' : 'text-brand-charcoal'
                )}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── Fix 3: Action buttons — locked if checked-in attendees ── */}
          {!isPastEvent && (
            <div className="flex flex-wrap gap-2">
              {hasCheckedInAttendees ? (
                // ── Locked — fans already inside, show info only ──
                <div className="w-full flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-700">
                    Cannot edit or cancel while fans are checked in.
                    Use the scanner to manage remaining attendees.
                  </p>
                </div>
              ) : (
                // ── Normal actions — no check-ins yet ──
                <>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(e => !e)}>
                    <PencilSquareIcon className="w-4 h-4 mr-1.5" />
                    {editing ? 'Cancel edit' : 'Edit event'}
                  </Button>

                  {event.status === 'upcoming' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStatusChange('cancelled')}>
                      <XCircleIcon className="w-4 h-4 mr-1.5" />
                      Cancel event
                    </Button>
                  )}

                  {event.status === 'cancelled' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStatusChange('upcoming')}>
                      <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                      Reinstate event
                    </Button>
                  )}

                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Promotion controls — hidden for past events and locked events ── */}
          {!isPastEvent && !hasCheckedInAttendees && event.status !== 'cancelled' && (
            <div className="mt-4 pt-4 border-t border-gray-100">

              {/* Starter controls */}
              {isStarter && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-brand-charcoal">Event promotions</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {promotionsUsed}/5 used this cycle
                        {daysUntilReset > 0 && ` · resets in ${daysUntilReset} days`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div
                          key={i}
                          className={clsx(
                            'w-2.5 h-2.5 rounded-full transition-colors',
                            i <= promotionsUsed ? 'bg-brand-red' : 'bg-gray-200'
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {event.promoted ? (
                    <>
                      <div className="flex items-center gap-2 p-2.5 bg-brand-red-light rounded-xl">
                        <span className="text-xs font-bold text-brand-red">⭐ Currently Featured</span>
                        <span className="text-xs text-gray-400 ml-auto">Showing in priority results</span>
                      </div>
                      <button
                        onClick={() => handleTogglePromotion('unpromote')}
                        disabled={promoting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {promoting
                          ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          : <><XMarkIcon className="w-4 h-4" /> Remove promotion</>
                        }
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleTogglePromotion('promote')}
                      disabled={promoting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-red text-white rounded-xl text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-50"
                    >
                      {promoting
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <>⭐ Feature this event</>
                      }
                    </button>
                  )}
                </div>
              )}

              {/* Pro controls */}
              {isPro && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-brand-charcoal">Event visibility</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {event.private
                          ? 'Not promoted — hidden from featured results'
                          : 'Featured in search results and homepage'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => handleTogglePromotion(
                        event.private ? 'make_public' : 'make_private'
                      )}
                      disabled={promoting}
                      className={clsx(
                        'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
                        event.private ? 'bg-gray-300' : 'bg-brand-red'
                      )}
                    >
                      <span className={clsx(
                        'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
                        event.private ? 'translate-x-0' : 'translate-x-5'
                      )} />
                    </button>
                  </div>

                  {event.private ? (
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-xs font-semibold text-gray-400">Not promoted</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-brand-red-light rounded-xl">
                      <span className="text-xs font-bold text-brand-red">⭐ Featured</span>
                      <span className="text-xs text-gray-400 ml-auto">Showing in priority results</span>
                    </div>
                  )}
                </div>
              )}

              {/* Free — upgrade nudge */}
              {!isStarter && !isPro && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-brand-charcoal">Want this event Featured?</p>
                    <p className="text-xs text-gray-400 mt-0.5">Upgrade to Starter for 5 promotions/month</p>
                  </div>
                  <button
                    onClick={() => router.push('/venue-dashboard/upgrade')}
                    className="text-xs font-bold text-brand-red hover:underline flex-shrink-0 ml-3"
                  >
                    Upgrade →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Fix 3: Edit form — hidden if checked-in attendees OR past event ── */}
        {editing && !isPastEvent && !hasCheckedInAttendees && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="text-base font-bold text-brand-charcoal mb-4">
              Edit event details
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Sport */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-bold text-brand-charcoal">Sport</label>
                  <span className="text-xs font-bold text-brand-red">* Required</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Fans filter events by sport — make sure this is correct
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {SPORTS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSport(s.value)
                        setLeague(LEAGUES[s.value]?.[0] ?? '')
                      }}
                      className={clsx(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all',
                        sport === s.value
                          ? 'border-brand-red bg-brand-red-light'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className="text-xl">{s.emoji}</span>
                      <span className={clsx(
                        'text-xs font-semibold text-center leading-tight',
                        sport === s.value ? 'text-brand-red' : 'text-gray-600'
                      )}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* League */}
              {sport && LEAGUES[sport] && (
                <div>
                  <label className="block text-sm font-bold text-brand-charcoal mb-3">
                    Competition / League
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LEAGUES[sport].map(l => (
                      <button
                        key={l}
                        onClick={() => setLeague(l)}
                        className={clsx(
                          'px-3 py-1.5 rounded-full text-sm font-semibold border transition-all',
                          league === l
                            ? 'bg-brand-red text-white border-brand-red'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-red'
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Input
                label="Event title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                    Kickoff time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {description.length}/300
                </p>
              </div>

              {/* Banner */}
              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                  Event banner
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <label className="block cursor-pointer">
                  {bannerPreview || event.bannerImage ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={bannerPreview || event.bannerImage}
                        alt="Banner"
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-semibold">Change banner</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-brand-red hover:bg-brand-red-light transition-all">
                      <PhotoIcon className="w-7 h-7 text-gray-300" />
                      <p className="text-sm text-gray-400 font-semibold">Upload event banner</p>
                      <p className="text-xs text-gray-300">JPG or PNG · 1200×630px recommended</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <Input
                label="RSVP limit"
                type="number"
                value={rsvpLimit}
                onChange={e => setRsvpLimit(e.target.value)}
                hint="Leave blank for unlimited"
                placeholder="e.g. 50"
              />

              <Button fullWidth size="md" loading={saving} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-4">
          {(['overview', 'rsvps'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                tab === t
                  ? 'bg-brand-red text-white'
                  : 'text-gray-500 hover:text-brand-charcoal'
              )}
            >
              {t === 'rsvps' ? attendeesTabLabel : 'Overview'}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            {[
              {
                label: 'Sport',
                value: `${getSportEmoji(event.sport)} ${SPORTS.find(s => s.value === event.sport)?.label ?? event.sport}`,
              },
              { label: 'League', value: event.league },
              {
                label: 'Entry type',
                value: event.entryType === 'paid'
                  ? `Paid — $${((event.totalTicketPrice ?? event.ticketPrice ?? 0) / 100).toFixed(2)}`
                  : 'Free',
              },
              event.rsvpLimit ? {
                label: 'RSVP limit',
                value: `${event.rsvpCount ?? 0} / ${event.rsvpLimit}`,
              } : null,
              event.teams?.length > 0 ? {
                label: 'Teams',
                value: event.teams.join(' vs '),
              } : null,
            ].filter(Boolean).map(item => (
              <div key={item!.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{item!.label}</span>
                <span className="font-semibold text-brand-charcoal">{item!.value}</span>
              </div>
            ))}
            {event.description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Attendees tab ── */}
        {tab === 'rsvps' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {attendees.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {attendees.map(attendee => (
                  <div key={attendee.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-brand-red-light rounded-full flex items-center justify-center text-sm font-bold text-brand-red flex-shrink-0">
                        {attendee.userName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brand-charcoal">
                          {attendee.userName}
                        </p>
                        <p className="text-xs text-gray-400">{attendee.userEmail}</p>
                        {attendee.type === 'ticket' && attendee.quantity > 1 && (
                          <p className="text-xs font-semibold text-brand-red mt-0.5">
                            {attendee.quantity} person entry
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {attendee.type === 'ticket' && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          🎟️ ×{attendee.quantity}
                        </span>
                      )}
                      {attendee.checkedIn ? (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                          ✓ Checked in
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not checked in</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <UserGroupIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-brand-charcoal mb-1">
                  {isPaidEvent ? 'No tickets sold yet' : 'No RSVPs yet'}
                </p>
                <p className="text-xs text-gray-400">
                  {isPaidEvent
                    ? 'Ticket buyers will appear here once they purchase'
                    : 'Share your event to start getting RSVPs'
                  }
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Promotion limit modal ── */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="text-lg font-bold text-brand-charcoal text-center mb-2">
              Promotion limit reached
            </h3>
            <p className="text-sm text-gray-400 text-center leading-relaxed mb-6">
              You've used all 5 promotions this cycle.
              Resets in {daysUntilReset} days.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowLimitModal(false); router.push('/venue-dashboard') }}
                className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-brand-charcoal hover:bg-gray-50 transition-colors text-left flex items-center justify-between"
              >
                <div>
                  <p className="font-bold">Manage my promotions</p>
                  <p className="text-xs text-gray-400 mt-0.5">Remove a promotion from another event</p>
                </div>
                <ChevronLeftIcon className="w-4 h-4 rotate-180 text-gray-400" />
              </button>
              <button
                onClick={() => { setShowLimitModal(false); toast.info('One-time promotions coming soon') }}
                className="w-full py-3 px-4 bg-brand-red-light border border-brand-red/20 rounded-xl text-sm text-left flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-brand-red">Buy a one-time promotion</p>
                  <p className="text-xs text-brand-red/70 mt-0.5">Feature this event for $5</p>
                </div>
                <span className="text-xs font-bold bg-brand-red text-white px-2 py-1 rounded-full">$5</span>
              </button>
              <button
                onClick={() => { setShowLimitModal(false); router.push('/venue-dashboard/upgrade') }}
                className="w-full py-3 px-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl text-sm font-bold text-white text-left flex items-center justify-between"
              >
                <div>
                  <p>Upgrade to Pro</p>
                  <p className="text-xs text-white/80 mt-0.5">Unlimited promotions — $99/mo</p>
                </div>
                <span className="text-xs font-bold bg-white text-amber-600 px-2 py-1 rounded-full">⚡ Pro</span>
              </button>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-brand-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}