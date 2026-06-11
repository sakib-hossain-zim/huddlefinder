'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Venue } from '@/types/venue'
import { VenueEvent } from '@/types/event'
import VenueCard from '@/components/cards/VenueCard'
import EventCard from '@/components/cards/EventCard'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { STRINGS } from '@/utils/strings'
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  LockClosedIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const CITIES = ['Vancouver', 'Toronto', 'Calgary', 'Montreal']

const SPORTS = [
  { value: 'football',  label: 'Football',  emoji: '⚽' },
  { value: 'nfl',       label: 'NFL',        emoji: '🏈' },
  { value: 'nhl',       label: 'NHL',        emoji: '🏒' },
  { value: 'nba',       label: 'NBA',        emoji: '🏀' },
  { value: 'rugby',     label: 'Rugby',      emoji: '🏉' },
  { value: 'tennis',    label: 'Tennis',     emoji: '🎾' },
  { value: 'f1',        label: 'F1',         emoji: '🏎️' },
  { value: 'cricket',   label: 'Cricket',    emoji: '🏏' },
]

const VENUE_TYPES = [
  { value: 'bar',          label: 'Sports Bar',   emoji: '🍺' },
  { value: 'pub',          label: 'Pub',          emoji: '🍻' },
  { value: 'restaurant',   label: 'Restaurant',   emoji: '🍽️' },
  { value: 'rooftop',      label: 'Rooftop',      emoji: '🏙️' },
  { value: 'open_viewing', label: 'Open Viewing', emoji: '📺' },
]

type TabType = 'venues' | 'events'

function toDate(value: any): Date {
  if (!value) return new Date()
  if (value?.seconds !== undefined) return new Date(value.seconds * 1000)
  if (value instanceof Date) return value
  return new Date(value)
}

function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Skeleton card ─────────────────────────────────────
function VenueCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-36 md:h-44 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="flex gap-1 pt-1">
          <div className="h-5 bg-gray-100 rounded-full w-12" />
          <div className="h-5 bg-gray-100 rounded-full w-12" />
        </div>
      </div>
    </div>
  )
}

function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-32 md:h-40 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
    </div>
  )
}

function SearchContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user }     = useAuth()

  const [city,           setCity]           = useState(searchParams.get('city')  ?? '')
  const [sport,          setSport]          = useState(searchParams.get('sport') ?? '')
  const [venueType,      setVenueType]      = useState('')
  const [searchText,     setSearchText]     = useState('')
  const [tab,            setTab]            = useState<TabType>(
    searchParams.get('tab') === 'events' ? 'events' : 'venues'
  )
  const [showFilters,    setShowFilters]    = useState(false)
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)

  // ── Near me state ─────────────────────────────────────
  const [nearMe,         setNearMe]         = useState(false)
  const [userLocation,   setUserLocation]   = useState<{ lat: number; lng: number } | null>(null)
  const [locating,       setLocating]       = useState(false)
  const [locationError,  setLocationError]  = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  const [venues,  setVenues]  = useState<Venue[]>([])
  const [events,  setEvents]  = useState<VenueEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (dateFrom || dateTo) setDateFilterOpen(true)
  }, [])

  useEffect(() => {
    const urlCity  = searchParams.get('city')  ?? ''
    const urlSport = searchParams.get('sport') ?? ''
    const urlTab   = searchParams.get('tab') === 'events'
      ? 'events' as TabType
      : 'venues' as TabType
    if (urlCity  !== city)  setCity(urlCity)
    if (urlSport !== sport) setSport(urlSport)
    if (urlTab   !== tab)   setTab(urlTab)
  }, [searchParams])

  // ── Handle near me button ─────────────────────────────
  function handleNearMe() {
    if (!user) {
      router.push('/auth/signup')
      return
    }
    if (nearMe) {
      setNearMe(false)
      setUserLocation(null)
      setLocationError('')
      return
    }
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setNearMe(true)
        setCity('')           // clear city when near me is active
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access denied. Please enable location in your browser settings.')
        } else {
          setLocationError('Could not get your location. Please try again.')
        }
      },
      { timeout: 10000 }
    )
  }

  // ── Fetch venues ──────────────────────────────────────
  async function fetchVenues() {
    setLoading(true)
    try {
      let results: Venue[] = []

      if (nearMe && userLocation) {
        // ── Near me: fetch all, filter by distance ────────
        const snap = await getDocs(collection(db, 'venues'))
        results = snap.docs
          .map(d => ({ venueId: d.id, ...d.data() } as Venue))
          .filter(v =>
            v.location?.latitude &&
            v.location?.longitude &&
            getDistanceKm(
              userLocation.lat, userLocation.lng,
              v.location.latitude, v.location.longitude
            ) <= 25
          )
      } else if (city) {
        // ── City selected: Firestore filters server-side ──
        const snap = await getDocs(query(
          collection(db, 'venues'),
          where('city', '==', city)
        ))
        results = snap.docs.map(d => ({ venueId: d.id, ...d.data() } as Venue))
      } else {
        // ── No filter: fetch first 30 sorted by plan ─────
        const snap = await getDocs(query(
          collection(db, 'venues'),
          limit(30)
        ))
        results = snap.docs.map(d => ({ venueId: d.id, ...d.data() } as Venue))
      }

      // Apply remaining client-side filters
      if (venueType)  results = results.filter(v => v.venueType === venueType)
      if (sport)      results = results.filter(v => v.sports?.includes(sport))
      if (searchText) results = results.filter(v =>
        v.name.toLowerCase().includes(searchText.toLowerCase()) ||
        v.address?.toLowerCase().includes(searchText.toLowerCase())
      )

      // Sort by plan priority
      results.sort((a, b) => {
        const planScore = (v: Venue): number => {
          if (v.plan === 'pro'     && v.verified) return 3
          if (v.plan === 'starter' && v.verified) return 2
          return 1
        }
        const planDiff = planScore(b) - planScore(a)
        if (planDiff !== 0) return planDiff
        if (a.goodForWatchingSports && !b.goodForWatchingSports) return -1
        if (!a.goodForWatchingSports && b.goodForWatchingSports) return 1
        return (b.googleRating ?? b.rating ?? 0) - (a.googleRating ?? a.rating ?? 0)
      })

      // ── Near me: sort by distance ─────────────────────
      if (nearMe && userLocation) {
        results.sort((a, b) => {
          const distA = getDistanceKm(
            userLocation.lat, userLocation.lng,
            a.location?.latitude ?? 0, a.location?.longitude ?? 0
          )
          const distB = getDistanceKm(
            userLocation.lat, userLocation.lng,
            b.location?.latitude ?? 0, b.location?.longitude ?? 0
          )
          return distA - distB
        })
      }

      setVenues(results)
    } catch (err) {
      console.error('Error fetching venues:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch events ──────────────────────────────────────
  async function fetchEvents() {
    setLoading(true)
    try {
      const now  = new Date()
      const snap = await getDocs(query(
        collection(db, 'events'),
        where('status', '==', 'upcoming'),
        orderBy('startTime', 'asc'),
        limit(100)
      ))

      let results = snap.docs
        .map(d => ({ eventId: d.id, ...d.data() } as VenueEvent))
        .filter(e => {
          if (toDate(e.startTime) < now) return false
          if (e.private)                 return false
          return true
        })

      if (city)       results = results.filter(e => e.venueCity?.toLowerCase() === city.toLowerCase())
      if (sport)      results = results.filter(e => e.sport === sport)
      if (searchText) {
        const q = searchText.toLowerCase()
        results = results.filter(e =>
          e.title?.toLowerCase().includes(q)     ||
          e.venueName?.toLowerCase().includes(q) ||
          e.league?.toLowerCase().includes(q)
        )
      }
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`)
        results = results.filter(e => toDate(e.startTime) >= from)
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`)
        results = results.filter(e => toDate(e.startTime) <= to)
      }

      results.sort((a, b) => {
        const isFeatured = (e: VenueEvent): boolean => {
          if (e.venuePlan === 'pro')     return !e.private
          if (e.venuePlan === 'starter') return !!e.promoted
          return false
        }
        const aFeatured = isFeatured(a)
        const bFeatured = isFeatured(b)
        if (aFeatured && !bFeatured) return -1
        if (!aFeatured && bFeatured) return 1
        return toDate(a.startTime).getTime() - toDate(b.startTime).getTime()
      })

      setEvents(results)
    } catch (err) {
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'venues') {
      fetchVenues()
    } else {
      fetchEvents()
    }
  }, [city, sport, venueType, searchText, tab, dateFrom, dateTo, nearMe, userLocation])

  useEffect(() => {
    const params = new URLSearchParams()
    if (city)             params.set('city',  city)
    if (sport)            params.set('sport', sport)
    if (tab === 'events') params.set('tab',   'events')
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
    router.replace(newUrl, { scroll: false })
  }, [city, sport, tab])

  useEffect(() => {
    if (tab === 'venues') {
      setDateFrom('')
      setDateTo('')
      setDateFilterOpen(false)
    }
  }, [tab])

  const activeFilterCount = [
    nearMe ? 'nearme' : '',
    city,
    sport,
    venueType,
    tab === 'events' && dateFrom ? dateFrom : '',
    tab === 'events' && dateTo   ? dateTo   : '',
  ].filter(Boolean).length

  function clearFilters() {
    setCity('')
    setSport('')
    setVenueType('')
    setSearchText('')
    setDateFrom('')
    setDateTo('')
    setDateFilterOpen(false)
    setNearMe(false)
    setUserLocation(null)
    setLocationError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">

      {/* ── Sticky search header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-16 md:top-24 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">

          {/* Search input */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={tab === 'events' ? 'Search events...' : 'Search venues...'}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-charcoal"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                showFilters || activeFilterCount > 0
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-white text-brand-charcoal border-gray-200'
              )}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-brand-red text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="pb-3 space-y-3 border-t border-gray-100 pt-3">

              {/* City + Near me */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Location
                  </p>
                  <p className="text-xs text-gray-300 italic">Popular cities</p>
                </div>
                <div className="flex flex-wrap gap-2">

                  {/* Near me button */}
                  <button
                    onClick={handleNearMe}
                    disabled={locating}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all disabled:opacity-50',
                      nearMe
                        ? 'bg-brand-red text-white border-brand-red'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-red'
                    )}
                  >
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {locating ? 'Locating...' : 'Near me'}
                  </button>

                  <div className="w-px h-6 bg-gray-200 self-center" />

                  {CITIES.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setCity(city === c ? '' : c)
                        setNearMe(false)   // clear near me when city selected
                        setUserLocation(null)
                        setLocationError('')
                      }}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all',
                        city === c && !nearMe
                          ? 'bg-brand-red text-white border-brand-red'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-red'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {locationError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <span>⚠️</span> {locationError}
                  </p>
                )}
              </div>

              {/* Sport */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Sport
                </p>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setSport(sport === s.value ? '' : s.value)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all',
                        sport === s.value
                          ? 'bg-brand-red text-white border-brand-red'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-red'
                      )}
                    >
                      <span>{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue type */}
              {tab === 'venues' && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Venue type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VENUE_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setVenueType(venueType === t.value ? '' : t.value)}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all',
                          venueType === t.value
                            ? 'bg-brand-red text-white border-brand-red'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-red'
                        )}
                      >
                        <span>{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-brand-red font-semibold"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-t border-gray-100 pt-3">
            <button
              onClick={() => setTab('venues')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === 'venues'
                  ? 'bg-brand-red text-white'
                  : 'text-gray-500 hover:text-brand-charcoal'
              )}
            >
              <BuildingStorefrontIcon className="w-4 h-4" />
              Venues
              {venues.length > 0 && tab === 'venues' && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                  {venues.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('events')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === 'events'
                  ? 'bg-brand-red text-white'
                  : 'text-gray-500 hover:text-brand-charcoal'
              )}
            >
              <CalendarDaysIcon className="w-4 h-4" />
              Events
              {events.length > 0 && tab === 'events' && user && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                  {events.length}
                </span>
              )}
            </button>
          </div>

          {/* Date filter */}
          {tab === 'events' && user && (
            <div className="border-t border-gray-100 mt-1">
              <button
                onClick={() => setDateFilterOpen(d => !d)}
                className="w-full flex items-center justify-between px-1 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-500">
                    {dateFrom || dateTo
                      ? dateFrom && dateTo
                        ? `${dateFrom} → ${dateTo}`
                        : dateFrom ? `From ${dateFrom}` : `Until ${dateTo}`
                      : 'Filter by date'
                    }
                  </span>
                  {(dateFrom || dateTo) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(dateFrom || dateTo) && (
                    <div
                      role="button"
                      onClick={e => {
                        e.stopPropagation()
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="text-[10px] font-bold text-brand-red hover:underline"
                    >
                      Clear
                    </div>
                  )}
                  <ChevronDownIcon className={clsx(
                    'w-4 h-4 text-gray-400 transition-transform duration-200',
                    dateFilterOpen && 'rotate-180'
                  )} />
                </div>
              </button>

              {dateFilterOpen && (
                <div className="grid grid-cols-2 gap-2 pb-3 px-1">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => {
                        setDateFrom(e.target.value)
                        if (dateTo && e.target.value > dateTo) setDateTo('')
                      }}
                      min={todayStr}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">
                      To <span className="text-gray-300">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      min={dateFrom || todayStr}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-gray-400 font-semibold">Filtering by:</span>

            {nearMe && (
              <span className="flex items-center gap-1 bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <MapPinIcon className="w-3 h-3" />
                Near me
                <button
                  onClick={() => { setNearMe(false); setUserLocation(null) }}
                  className="ml-1 hover:opacity-70"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {city && (
              <span className="flex items-center gap-1 bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <MapPinIcon className="w-3 h-3" />
                {city}
                <button onClick={() => setCity('')} className="ml-1 hover:opacity-70">
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {sport && (
              <span className="flex items-center gap-1 bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {SPORTS.find(s => s.value === sport)?.emoji}{' '}
                {SPORTS.find(s => s.value === sport)?.label}
                <button onClick={() => setSport('')} className="ml-1 hover:opacity-70">
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {venueType && (
              <span className="flex items-center gap-1 bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {VENUE_TYPES.find(t => t.value === venueType)?.emoji}{' '}
                {VENUE_TYPES.find(t => t.value === venueType)?.label}
                <button onClick={() => setVenueType('')} className="ml-1 hover:opacity-70">
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {tab === 'events' && (dateFrom || dateTo) && (
              <span className="flex items-center gap-1 bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <CalendarDaysIcon className="w-3 h-3" />
                {dateFrom && dateTo
                  ? `${dateFrom} → ${dateTo}`
                  : dateFrom ? `From ${dateFrom}` : `Until ${dateTo}`
                }
                <button
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="ml-1 hover:opacity-70"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-brand-red font-semibold hover:underline ml-auto"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>
        )}

        {loading ? (
          // ── Skeleton loaders ────────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tab === 'venues'
              ? [1,2,3,4,5,6,7,8].map(i => <VenueCardSkeleton key={i} />)
              : [1,2,3,4,5,6,7,8].map(i => <EventCardSkeleton key={i} />)
            }
          </div>
        ) : tab === 'venues' ? (
          venues.length > 0 ? (
            <>
              <p className="text-sm text-gray-400 mb-4">
                {venues.length} venue{venues.length !== 1 ? 's' : ''} found
                {nearMe ? ' near you' : city ? ` in ${city}` : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {venues.map(venue => (
                  <VenueCard key={venue.venueId} bar={venue} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              emoji="🏟️"
              title={STRINGS.noVenuesTitle}
              description={STRINGS.noVenuesDesc}
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          )
        ) : (
          !user ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-20 h-20 bg-brand-red-light rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">
                🎟️
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <LockClosedIcon className="w-5 h-5 text-gray-400" />
                  <h3 className="text-xl font-bold text-brand-charcoal">
                    Sign in to explore events
                  </h3>
                </div>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  Create a free account to browse upcoming events, RSVP and
                  buy tickets at venues near you.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button fullWidth size="lg" onClick={() => router.push('/auth/signup')}>
                    Create free account
                  </Button>
                  <Button
                    fullWidth size="lg" variant="secondary"
                    onClick={() => router.push('/auth/login?redirect=/search?tab=events')}
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            </div>
          ) : events.length > 0 ? (
            <>
              <p className="text-sm text-gray-400 mb-4">
                {events.length} event{events.length !== 1 ? 's' : ''} found
                {city  ? ` in ${city}` : ''}
                {sport ? ` · ${SPORTS.find(s => s.value === sport)?.label}` : ''}
                {dateFrom && ` · from ${dateFrom}`}
                {dateTo   && ` · until ${dateTo}`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {events.map(event => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              emoji="📅"
              title={STRINGS.noEventsTitle ?? 'No events found'}
              description={
                dateFrom || dateTo
                  ? 'No events match your date range. Try adjusting the dates.'
                  : STRINGS.noEventsDesc ?? 'Try adjusting your filters'
              }
              actionLabel={dateFrom || dateTo ? 'Clear dates' : 'Browse venues instead'}
              onAction={
                dateFrom || dateTo
                  ? () => { setDateFrom(''); setDateTo('') }
                  : () => setTab('venues')
              }
            />
          )
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <SearchContent />
    </Suspense>
  )
}