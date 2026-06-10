'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  collection, query, where, getDocs,
  orderBy, doc, getDoc, deleteDoc, updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { VenueEvent } from '@/types/event'
import { formatTime } from '@/utils/formatDate'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  TicketIcon,
  UserCircleIcon,
  ChevronRightIcon,
  XCircleIcon,
  CheckCircleIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

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

// Unified entry — either an RSVP or a ticket
interface EventEntry {
  key:       string
  eventId:   string
  event:     VenueEvent
  type:      'rsvp' | 'ticket'
  rsvpId?:   string
  ticketId?: string
  quantity?: number
  checkedIn?: boolean
}

interface TicketDoc {
  ticketId:    string
  eventId:     string
  quantity:    number
  checkedIn:   boolean
  eventTitle:  string
  venueName:   string
  eventDate:   string
  ticketPrice: number
  totalPrice:  number
  qrData:      string
  purchasedAt: any
}

export default function FanDashboardPage() {
  const router            = useRouter()
  const { user, userDoc } = useAuth()
  const { toasts, toast, closeToast } = useToast()

  const [entries,    setEntries]    = useState<EventEntry[]>([])
  const [tickets,    setTickets]    = useState<TicketDoc[]>([])
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [tab,        setTab]        = useState<'upcoming' | 'past' | 'tickets'>('upcoming')

  useEffect(() => {
    if (user) fetchAllData()
  }, [user])

  async function fetchAllData() {
    if (!user) return
    setLoading(true)
    try {
      // Fetch tickets first so we know which eventIds are covered
      const ticketDocs = await fetchTickets()
      await fetchRsvps(new Set(ticketDocs.map(t => t.eventId)))
    } finally {
      setLoading(false)
    }
  }

  async function fetchTickets(): Promise<TicketDoc[]> {
    if (!user) return []
    try {
      const snap = await getDocs(query(
        collection(db, 'tickets'),
        where('userId', '==', user.uid),
        orderBy('purchasedAt', 'desc')
      ))

      const ticketDocs = snap.docs.map(d => ({
        ticketId: d.id,
        ...d.data(),
      })) as TicketDoc[]

      setTickets(ticketDocs)

      // Build ticket entries — deduplicated by eventId
      // If fan bought 2 separate tickets for same event, show event once
      const seen          = new Set<string>()
      const ticketEntries: EventEntry[] = []

      for (const ticket of ticketDocs) {
        if (seen.has(ticket.eventId)) continue
        seen.add(ticket.eventId)

        try {
          const eventSnap = await getDoc(doc(db, 'events', ticket.eventId))
          if (!eventSnap.exists()) continue
          ticketEntries.push({
            key:       `ticket-${ticket.ticketId}`,
            eventId:   ticket.eventId,
            event:     { eventId: eventSnap.id, ...eventSnap.data() } as VenueEvent,
            type:      'ticket',
            ticketId:  ticket.ticketId,
            quantity:  ticket.quantity,
            checkedIn: ticket.checkedIn,
          })
        } catch {
          continue
        }
      }

      setEntries(prev => {
        // Keep existing RSVP entries not covered by tickets
        const ticketEventIds = new Set(ticketEntries.map(e => e.eventId))
        const rsvpEntries    = prev.filter(
          e => e.type === 'rsvp' && !ticketEventIds.has(e.eventId)
        )
        return [...ticketEntries, ...rsvpEntries]
      })

      return ticketDocs
    } catch (err) {
      console.error('Error fetching tickets:', err)
      return []
    }
  }

  async function fetchRsvps(ticketEventIds: Set<string>) {
    if (!user) return
    try {
      const snap = await getDocs(query(
        collection(db, 'rsvps'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      ))

      const seen        = new Set<string>()
      const rsvpEntries: EventEntry[] = []

      for (const d of snap.docs) {
        const eventId = d.data().eventId

        // Skip if already covered by a ticket
        if (ticketEventIds.has(eventId)) continue
        // Skip duplicates
        if (seen.has(eventId)) continue
        seen.add(eventId)

        try {
          const eventSnap = await getDoc(doc(db, 'events', eventId))
          if (!eventSnap.exists()) continue
          rsvpEntries.push({
            key:    `rsvp-${d.id}`,
            eventId,
            event:  { eventId: eventSnap.id, ...eventSnap.data() } as VenueEvent,
            type:   'rsvp',
            rsvpId: d.id,
          })
        } catch {
          continue
        }
      }

      setEntries(prev => {
        const ticketEntries = prev.filter(e => e.type === 'ticket')
        return [...ticketEntries, ...rsvpEntries]
      })
    } catch (err) {
      console.error('Error fetching RSVPs:', err)
    }
  }

  async function handleCancelRsvp(rsvpId: string, eventId: string, currentCount: number) {
    if (!confirm('Cancel your RSVP for this event?')) return
    setCancelling(rsvpId)
    try {
      await deleteDoc(doc(db, 'rsvps', rsvpId))
      await updateDoc(doc(db, 'events', eventId), {
        rsvpCount: Math.max(currentCount - 1, 0),
      })
      setEntries(prev => prev.filter(e => e.rsvpId !== rsvpId))
      toast.success('RSVP cancelled')
    } catch (err) {
      console.error(err)
      toast.error('Failed to cancel RSVP. Please try again.')
    } finally {
      setCancelling(null)
    }
  }

  const now = new Date()

  const upcoming = entries
    .filter(e => e.event?.startTime && toDate(e.event.startTime) >= now)
    .sort((a, b) =>
      toDate(a.event.startTime).getTime() - toDate(b.event.startTime).getTime()
    )

  const past = entries
    .filter(e => e.event?.startTime && toDate(e.event.startTime) < now)
    .sort((a, b) =>
      toDate(b.event.startTime).getTime() - toDate(a.event.startTime).getTime()
    )

  const displayed = tab === 'upcoming' ? upcoming : tab === 'past' ? past : []

  const isEmailAuth       = user?.providerData.some(p => p.providerId === 'password')
  const needsVerification = isEmailAuth && user && !user.emailVerified

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Unverified email banner */}
        {needsVerification && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Verify your email</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Check your inbox for a verification link to unlock RSVPs
              </p>
            </div>
            <button
              onClick={() => router.push('/auth/verify-email')}
              className="text-xs font-semibold text-amber-700 flex-shrink-0"
            >
              Verify →
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              My Dashboard
            </p>
            <h1 className="text-2xl font-bold text-brand-charcoal">
              Hey {userDoc?.firstName ?? 'there'} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Your upcoming events and tickets
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-brand-charcoal hover:border-brand-red hover:text-brand-red transition-colors shadow-sm"
          >
            <UserCircleIcon className="w-4 h-4" />
            Profile
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="w-8 h-8 bg-brand-red-light rounded-xl flex items-center justify-center mb-2">
              <BoltIcon className="w-4 h-4 text-brand-red" />
            </div>
            <p className="text-2xl font-bold text-brand-charcoal">{upcoming.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Upcoming</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
              <CalendarDaysIcon className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-brand-charcoal">{entries.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total events</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center mb-2">
              <TicketIcon className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-brand-charcoal">{tickets.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Tickets</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          <button
            onClick={() => setTab('upcoming')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
              tab === 'upcoming'
                ? 'bg-brand-red text-white'
                : 'text-gray-500 hover:text-brand-charcoal'
            )}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setTab('past')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
              tab === 'past'
                ? 'bg-brand-red text-white'
                : 'text-gray-500 hover:text-brand-charcoal'
            )}
          >
            Past ({past.length})
          </button>
          <button
            onClick={() => setTab('tickets')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5',
              tab === 'tickets'
                ? 'bg-brand-red text-white'
                : 'text-gray-500 hover:text-brand-charcoal'
            )}
          >
            <QrCodeIcon className="w-4 h-4" />
            My Tickets ({tickets.length})
          </button>
        </div>

        {/* ── Upcoming / Past tabs ── */}
        {tab !== 'tickets' && (
          displayed.length > 0 ? (
            <div className="space-y-3">
              {displayed.map(entry => {
                const event      = entry.event
                const startDate  = toDate(event.startTime)
                const isPast     = startDate < now
                const bannerImage = event.bannerImage || event.coverPhoto

                return (
                  <div
                    key={entry.key}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Banner */}
                    <div className="relative h-28 overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-charcoal to-gray-700">
                      {bannerImage ? (
                        <img
                          src={bannerImage}
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="text-4xl">{getSportEmoji(event.sport)}</span>
                      )}

                      {/* Past overlay */}
                      {isPast && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">
                            Past event
                          </span>
                        </div>
                      )}

                      {/* Live badge */}
                      {event.status === 'live' && (
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-brand-red text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE NOW
                        </div>
                      )}

                      {/* Entry type badge */}
                      <div className={clsx(
                        'absolute top-2 right-2 flex items-center gap-1 text-white text-xs font-bold px-2.5 py-1 rounded-full',
                        entry.type === 'ticket' ? 'bg-green-500' : 'bg-blue-500'
                      )}>
                        {entry.type === 'ticket' ? (
                          <>
                            <TicketIcon className="w-3 h-3" />
                            {entry.quantity && entry.quantity > 1
                              ? `${entry.quantity} tickets`
                              : 'Ticket'
                            }
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-3 h-3" />
                            RSVP'd
                          </>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-brand-charcoal text-base leading-tight mb-2">
                        {event.title}
                      </h3>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CalendarDaysIcon className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                          <span>
                            {startDate.toLocaleDateString('en-CA', {
                              weekday: 'short', month: 'short', day: 'numeric',
                            })}
                          </span>
                          <span>·</span>
                          <ClockIcon className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                          <span>{formatTime(event.startTime)}</span>
                        </div>

                        {event.venueName && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPinIcon className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                            <span className="truncate">
                              {event.venueName}
                              {event.venueCity ? ` · ${event.venueCity}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Group ticket indicator */}
                        {entry.type === 'ticket' && entry.quantity && entry.quantity > 1 && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <UserGroupIcon className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                            <span>{entry.quantity} person entry</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <Link
                          href={`/events/${event.eventId}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-brand-red border border-brand-red rounded-xl hover:bg-brand-red-light transition-colors"
                        >
                          View event
                          <ChevronRightIcon className="w-3.5 h-3.5" />
                        </Link>

                        {/* View QR for ticket entries */}
                        {entry.type === 'ticket' && entry.ticketId && (
                          <Link
                            href={`/tickets/${entry.ticketId}`}
                            className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-green-600 border border-green-200 rounded-xl hover:bg-green-50 transition-colors"
                          >
                            <QrCodeIcon className="w-3.5 h-3.5" />
                            QR code
                          </Link>
                        )}

                        {/* Cancel RSVP for free events */}
                        {entry.type === 'rsvp' &&
                          !isPast &&
                          event.status !== 'cancelled' &&
                          entry.rsvpId && (
                          <button
                            onClick={() => handleCancelRsvp(
                              entry.rsvpId!,
                              event.eventId,
                              event.rsvpCount ?? 0
                            )}
                            disabled={cancelling === entry.rsvpId}
                            className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <XCircleIcon className="w-3.5 h-3.5" />
                            {cancelling === entry.rsvpId ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <span className="text-5xl mb-4 block">
                {tab === 'upcoming' ? '📅' : '🏟️'}
              </span>
              <h3 className="text-base font-bold text-brand-charcoal mb-2">
                {tab === 'upcoming' ? 'No upcoming events' : 'No past events yet'}
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                {tab === 'upcoming'
                  ? 'Find a venue showing your favourite sport and RSVP to an event'
                  : 'Your attended events will appear here'
                }
              </p>
              {tab === 'upcoming' && (
                <Button size="md" onClick={() => router.push('/search')}>
                  Find events near me
                </Button>
              )}
            </div>
          )
        )}

        {/* ── My Tickets tab ── */}
        {tab === 'tickets' && (
          tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <Link
                  key={ticket.ticketId}
                  href={`/tickets/${ticket.ticketId}`}
                  className="block"
                >
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand-red transition-colors active:scale-[0.98]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                          ticket.checkedIn ? 'bg-green-50' : 'bg-brand-red-light'
                        )}>
                          {ticket.checkedIn
                            ? <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            : <QrCodeIcon className="w-5 h-5 text-brand-red" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-brand-charcoal text-sm truncate">
                            {ticket.eventTitle}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ticket.venueName}
                            {ticket.quantity > 1 && ` · ${ticket.quantity} persons`}
                          </p>
                          <p className="text-xs text-gray-400">{ticket.eventDate}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={clsx(
                          'text-xs font-bold px-2 py-1 rounded-full',
                          ticket.checkedIn
                            ? 'bg-green-50 text-green-600'
                            : 'bg-brand-red-light text-brand-red'
                        )}>
                          {ticket.checkedIn ? '✓ Used' : 'Valid'}
                        </span>
                        <span className="text-xs text-gray-400">
                          ${((ticket.totalPrice ?? ticket.ticketPrice) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <span className="text-5xl mb-4 block">🎟️</span>
              <h3 className="text-base font-bold text-brand-charcoal mb-2">
                No tickets yet
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Buy tickets to paid events and they'll appear here with your QR code
              </p>
              <Button size="md" onClick={() => router.push('/search')}>
                Find events
              </Button>
            </div>
          )
        )}

      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}