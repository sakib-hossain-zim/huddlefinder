'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection, addDoc, serverTimestamp,
  doc, getDoc, updateDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Venue } from '@/types/venue'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import {
  PhotoIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  TicketIcon,
  UserGroupIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

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
  football:    ['World Cup', 'Premier League', 'Champions League', 'La Liga', 'Serie A', 'Bundesliga', 'MLS', 'Other'],
  nfl:         ['NFL Regular Season', 'NFL Playoffs', 'Super Bowl', 'Other'],
  nhl:         ['NHL Regular Season', 'NHL Playoffs', 'Stanley Cup', 'Other'],
  nba:         ['NBA Regular Season', 'NBA Playoffs', 'NBA Finals', 'Other'],
  rugby:       ['Rugby World Cup', 'Six Nations', 'Super Rugby', 'Other'],
  tennis:      ['Wimbledon', 'US Open', 'Australian Open', 'French Open', 'Other'],
  f1:          ['Formula 1', 'Other'],
  cricket:     ['World Cup', 'Test Cricket', 'IPL', 'Other'],
  'world-cup': ['World Cup'],
}

const TAX_RATES: Record<string, { label: string; rate: number }> = {
  BC: { label: 'GST + PST', rate: 12      },
  AB: { label: 'GST',       rate: 5       },
  ON: { label: 'HST',       rate: 13      },
  QC: { label: 'GST + QST', rate: 14.975  },
  MB: { label: 'GST + PST', rate: 12      },
  SK: { label: 'GST + PST', rate: 11      },
  NS: { label: 'HST',       rate: 15      },
  NB: { label: 'HST',       rate: 15      },
  NL: { label: 'HST',       rate: 15      },
  PE: { label: 'HST',       rate: 15      },
  YT: { label: 'GST',       rate: 5       },
  NT: { label: 'GST',       rate: 5       },
  NU: { label: 'GST',       rate: 5       },
}

export default function CreateEventPage() {
  const router            = useRouter()
  const { user, userDoc } = useAuth()

  const [venue,         setVenue]         = useState<Venue | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [bannerFile,    setBannerFile]    = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [uploading,     setUploading]     = useState(false)

  const [sport,       setSport]       = useState('')
  const [league,      setLeague]      = useState('')
  const [title,       setTitle]       = useState('')
  const [team1,       setTeam1]       = useState('')
  const [team2,       setTeam2]       = useState('')
  const [date,        setDate]        = useState('')
  const [time,        setTime]        = useState('')
  const [doorsTime,   setDoorsTime]   = useState('')
  const [entryType,   setEntryType]   = useState<'free' | 'paid'>('free')
  const [ticketPrice, setTicketPrice] = useState('')
  const [province,    setProvince]    = useState('')
  const [capacity,    setCapacity]    = useState('')
  const [rsvpLimit,   setRsvpLimit]   = useState('')
  const [description, setDescription] = useState('')
  const [makePrivate, setMakePrivate] = useState(false)

  useEffect(() => {
    if (userDoc?.venueId) {
      getDoc(doc(db, 'venues', userDoc.venueId)).then(snap => {
        if (snap.exists()) {
          const venueData = { venueId: snap.id, ...snap.data() } as Venue
          setVenue(venueData)
          if ((venueData as any).province) {
            setProvince((venueData as any).province)
          }
        }
      })
    }
  }, [userDoc])

  useEffect(() => {
    if (team1 && team2) setTitle(`${team1} vs ${team2}`)
  }, [team1, team2])

  const todayStr = new Date().toISOString().split('T')[0]

  // ── Stripe Connect check ──────────────────────────────
  const venueStripeOnboarded = (venue as any)?.stripeOnboarded ?? false

  // ── Derived tax values ────────────────────────────────
  const basePrice      = Number(ticketPrice) || 0
  const taxInfo        = province ? TAX_RATES[province] : null
  const taxAmount      = taxInfo ? basePrice * taxInfo.rate / 100 : 0
  const totalFanPays   = basePrice + taxAmount
  const commissionRate = venue?.plan === 'pro' ? 0.065 : 0.09
  const commission     = basePrice * commissionRate
  const venueReceives  = basePrice - commission + taxAmount

  function validate(): string {
    if (!sport) return 'Please select a sport'
    if (!title) return 'Event title is required'
    if (!date)  return 'Date is required'
    if (!time)  return 'Kickoff time is required'

    const eventDateTime = new Date(`${date}T${time}:00`)
    if (eventDateTime <= new Date()) {
      return 'Event date and time must be in the future'
    }

    // ── Fix: block paid events if Stripe not connected ──
    if (entryType === 'paid' && !venueStripeOnboarded) {
      return 'You must connect Stripe before creating paid events'
    }

    if (entryType === 'paid' && !ticketPrice)               return 'Ticket price is required'
    if (entryType === 'paid' && isNaN(Number(ticketPrice))) return 'Ticket price must be a number'
    if (entryType === 'paid' && Number(ticketPrice) <= 0)   return 'Ticket price must be greater than $0'
    if (entryType === 'paid' && !province)                  return 'Please select your province for tax calculation'
    return ''
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function uploadBanner(eventId: string): Promise<string> {
    if (!bannerFile) return ''
    const bannerRef = ref(storage, `events/${eventId}/banner_${Date.now()}`)
    await uploadBytes(bannerRef, bannerFile)
    return await getDownloadURL(bannerRef)
  }

  async function handleCreate() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!user || !venue) return

    setError('')
    setLoading(true)

    try {
      const startTime = new Date(`${date}T${time}:00`)
      const isPro     = venue.plan === 'pro'
      const promoted  = isPro ? !makePrivate : false
      const isPrivate = isPro ? makePrivate  : false

      const eventData: any = {
        venueId:       venue.venueId,
        venueName:     venue.name,
        venueCity:     venue.city,
        venueLocation: venue.location,
        venuePlan:     venue.plan ?? 'free',
        title:         title.trim(),
        sport,
        league:        league || 'Other',
        teams:         [team1.trim(), team2.trim()].filter(Boolean),
        startTime,
        entryType,
        ticketsSold:   0,
        rsvpCount:     0,
        status:        'upcoming',
        featured:      false,
        promoted,
        private:       isPrivate,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      }

      if (doorsTime)   eventData.doorsOpen   = new Date(`${date}T${doorsTime}:00`)
      if (description) eventData.description = description.trim()
      if (rsvpLimit)   eventData.rsvpLimit   = Number(rsvpLimit)

      if (entryType === 'paid') {
        eventData.ticketPrice      = Math.round(basePrice * 100)
        eventData.province         = province
        eventData.taxRate          = taxInfo?.rate ?? 0
        eventData.taxLabel         = taxInfo?.label ?? ''
        eventData.taxAmount        = Math.round(taxAmount * 100)
        eventData.totalTicketPrice = Math.round(totalFanPays * 100)
        eventData.ticketCapacity   = capacity ? Number(capacity) : null
      }

      const eventRef = await addDoc(collection(db, 'events'), eventData)

      if (bannerFile) {
        setUploading(true)
        const bannerUrl = await uploadBanner(eventRef.id)
        await updateDoc(doc(db, 'events', eventRef.id), { bannerImage: bannerUrl })
      }

      router.push('/venue-dashboard')
    } catch (err: any) {
      console.error('Create event error:', err)
      setError('Something went wrong. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-charcoal">Create event</h1>
          {venue && (
            <p className="text-sm text-gray-400 mt-1">Posting at {venue.name}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">

          {/* ── Sport ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-brand-charcoal">Sport</h2>
              <span className="text-xs font-bold text-brand-red">* Required</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Select the sport so fans can find this event when filtering
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

          {/* ── League ── */}
          {sport && LEAGUES[sport] && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-brand-charcoal mb-3">
                Competition / League
              </h2>
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

          {/* ── Teams + Title ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-brand-charcoal">Match details</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Home team"
                placeholder="e.g. Canada"
                value={team1}
                onChange={e => setTeam1(e.target.value)}
              />
              <Input
                label="Away team"
                placeholder="e.g. Morocco"
                value={team2}
                onChange={e => setTeam2(e.target.value)}
              />
            </div>
            <Input
              label="Event title"
              placeholder="e.g. Canada vs Morocco — World Cup"
              value={title}
              onChange={e => setTitle(e.target.value)}
              hint="Auto-filled from teams — edit if needed"
            />
          </div>

          {/* ── Date + Time ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4 text-brand-red" />
              Date & time
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={todayStr}
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
                Doors open
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="time"
                value={doorsTime}
                onChange={e => setDoorsTime(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all min-h-[48px]"
              />
            </div>
            <p className="text-xs text-gray-400">
              Events must be scheduled for a future date and time.
            </p>
          </div>

          {/* ── Entry type ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-brand-charcoal mb-3 flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-brand-red" />
              Entry
            </h2>

            {/* Free / Paid toggle */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setEntryType('free')}
                className={clsx(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  entryType === 'free'
                    ? 'border-brand-red bg-brand-red-light'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className={clsx(
                  'font-bold text-sm',
                  entryType === 'free' ? 'text-brand-red' : 'text-brand-charcoal'
                )}>
                  Free entry
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Fans RSVP at no cost</p>
              </button>

              <button
                onClick={() => setEntryType('paid')}
                disabled={venue?.plan === 'free'}
                className={clsx(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  entryType === 'paid'
                    ? 'border-brand-red bg-brand-red-light'
                    : 'border-gray-200 hover:border-gray-300',
                  venue?.plan === 'free' && 'opacity-50 cursor-not-allowed'
                )}
              >
                <p className={clsx(
                  'font-bold text-sm',
                  entryType === 'paid' ? 'text-brand-red' : 'text-brand-charcoal'
                )}>
                  Paid tickets
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {venue?.plan === 'free'
                    ? 'Upgrade to sell tickets'
                    : 'Charge fans per ticket'
                  }
                </p>
              </button>
            </div>

            {/* ── Fix: Stripe Connect warning — shown when paid selected without Stripe ── */}
            {entryType === 'paid' && !venueStripeOnboarded && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-700">
                    Stripe Connect required
                  </p>
                  <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                    You need to connect your Stripe account before you can sell
                    tickets. Set up Stripe first, then come back to create this
                    event.
                  </p>
                  <button
                    onClick={() => router.push('/venue-dashboard/stripe')}
                    className="mt-2 text-xs font-bold text-amber-700 underline hover:text-amber-900 transition-colors"
                  >
                    Connect Stripe now →
                  </button>
                </div>
              </div>
            )}

            {/* ── Paid ticket pricing section
                Only shown when Stripe is connected                 ── */}
            {entryType === 'paid' && venueStripeOnboarded && (
              <div className="space-y-4">

                {/* Province selector */}
                <div>
                  <label className="block text-sm font-bold text-brand-charcoal mb-1.5">
                    Province
                    <span className="text-xs font-normal text-gray-400 ml-2">
                      Determines applicable tax rate
                    </span>
                  </label>
                  <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all"
                  >
                    <option value="">Select your province</option>
                    <option value="BC">British Columbia — GST + PST (12%)</option>
                    <option value="AB">Alberta — GST only (5%)</option>
                    <option value="ON">Ontario — HST (13%)</option>
                    <option value="QC">Quebec — GST + QST (14.975%)</option>
                    <option value="MB">Manitoba — GST + PST (12%)</option>
                    <option value="SK">Saskatchewan — GST + PST (11%)</option>
                    <option value="NS">Nova Scotia — HST (15%)</option>
                    <option value="NB">New Brunswick — HST (15%)</option>
                    <option value="NL">Newfoundland — HST (15%)</option>
                    <option value="PE">PEI — HST (15%)</option>
                    <option value="YT">Yukon — GST only (5%)</option>
                    <option value="NT">Northwest Territories — GST only (5%)</option>
                    <option value="NU">Nunavut — GST only (5%)</option>
                  </select>
                </div>

                {/* Base ticket price */}
                <div>
                  <label className="block text-sm font-bold text-brand-charcoal mb-1.5">
                    Base ticket price (CAD)
                    <span className="text-xs font-normal text-gray-400 ml-2">
                      Your price before tax
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={ticketPrice}
                      onChange={e => setTicketPrice(e.target.value)}
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all"
                    />
                  </div>
                </div>

                {/* Capacity */}
                <Input
                  label="Ticket capacity"
                  placeholder="e.g. 100 — leave blank for unlimited"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  type="number"
                  hint="Maximum number of tickets available"
                />

                {/* Price breakdown */}
                {basePrice > 0 && province && taxInfo && (
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Price breakdown per ticket
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Base price</span>
                      <span className="font-semibold text-brand-charcoal">
                        ${basePrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between text-sm">
                      <div>
                        <span className="text-gray-500">
                          Tax ({taxInfo.label} {taxInfo.rate}%)
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Collected from fans and paid out to you
                        </p>
                      </div>
                      <span className="font-semibold text-brand-charcoal">
                        ${taxAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-2.5 flex items-center justify-between">
                      <span className="font-bold text-brand-charcoal text-sm">Fan pays</span>
                      <span className="font-bold text-brand-charcoal text-lg">
                        ${totalFanPays.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-2.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          HuddleFinder commission ({venue?.plan === 'pro' ? '6.5' : '9'}% of base price)
                        </span>
                        <span className="text-gray-500 font-semibold">
                          −${commission.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-green-700">You receive</span>
                        <span className="font-bold text-green-700 text-base">
                          ${venueReceives.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        * You receive base price minus commission plus tax.
                        The tax portion (${taxAmount.toFixed(2)}) is included in your Stripe payout.
                      </p>
                    </div>
                  </div>
                )}

                {/* Province not selected yet */}
                {basePrice > 0 && !province && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                    <InformationCircleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-amber-700">
                      Select your province above to see the full price breakdown
                    </p>
                  </div>
                )}

                {/* Tax responsibility notice */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                  <InformationCircleIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-700 mb-0.5">Tax notice</p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      Tax is collected from fans and paid out to you via Stripe
                      along with your ticket revenue. Commission is calculated
                      on the base price only — never on the tax amount.
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ── RSVP limit ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-brand-charcoal mb-3 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-brand-red" />
              RSVP limit
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </h2>
            <Input
              placeholder="e.g. 50 — leave blank for unlimited"
              value={rsvpLimit}
              onChange={e => setRsvpLimit(e.target.value)}
              type="number"
              hint="Cap the number of RSVPs for free events"
            />
          </div>

          {/* ── Description ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-brand-charcoal mb-1">
              What's on offer
              <span className="text-gray-400 font-normal ml-1 text-xs">(optional)</span>
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Tell fans about drink specials, reserved seating, food deals,
              big screen setup, giveaways etc. A good description gets more RSVPs.
            </p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 2-for-1 pints during the first half. Reserved seating for groups of 6+. Free nachos with every ticket. 4 big screens showing the game."
              rows={4}
              maxLength={300}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {description.length}/300
            </p>
          </div>

          {/* ── Banner image ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-brand-charcoal mb-3 flex items-center gap-2">
              <PhotoIcon className="w-4 h-4 text-brand-red" />
              Event banner
              <span className="text-gray-400 font-normal">(optional)</span>
            </h2>
            <label className="block cursor-pointer">
              {bannerPreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-semibold">Change banner</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      setBannerFile(null)
                      setBannerPreview('')
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <XMarkIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="h-48 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-brand-red hover:bg-brand-red-light transition-all">
                  <PhotoIcon className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-400">Upload event banner</p>
                  <p className="text-xs text-gray-300">JPG or PNG · Recommended 1200×630px</p>
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

          {/* ── Visibility toggle — Pro only ── */}
          {venue?.plan === 'pro' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-brand-charcoal mb-1">
                    Event visibility
                  </h2>
                  <p className="text-xs text-gray-400">
                    {makePrivate
                      ? 'This event will not be featured or promoted in search results'
                      : 'This event will be Featured in search results and the homepage'
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMakePrivate(p => !p)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                    makePrivate ? 'bg-gray-300' : 'bg-brand-red'
                  )}
                >
                  <span className={clsx(
                    'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
                    makePrivate ? 'translate-x-0' : 'translate-x-5'
                  )} />
                </button>
              </div>
              <div className="mt-3">
                {makePrivate ? (
                  <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2.5 py-1 rounded-full">
                    Not promoted
                  </span>
                ) : (
                  <span className="text-xs text-white font-semibold bg-brand-red px-2.5 py-1 rounded-full">
                    ⭐ Featured
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Starter promotion info ── */}
          {venue?.plan === 'starter' && (
            <div className="bg-brand-red-light border border-brand-red/20 rounded-2xl p-4">
              <p className="text-sm font-bold text-brand-red mb-1">Event promotions</p>
              <p className="text-xs text-brand-red/70">
                As a Starter venue you can feature up to 5 events per 30-day cycle.
                Manage which events are featured from the event management page after publishing.
              </p>
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            loading={loading || uploading}
            onClick={handleCreate}
          >
            {uploading ? 'Uploading banner...' : 'Publish event'}
          </Button>

          <p className="text-center text-xs text-gray-400 pb-4">
            Fans can find and RSVP to your event immediately after publishing
          </p>

        </div>
      </div>
    </div>
  )
}