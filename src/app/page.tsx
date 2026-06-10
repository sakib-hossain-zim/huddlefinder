'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Venue } from '@/types/venue'
import { VenueEvent } from '@/types/event'
import VenueCard from '@/components/cards/VenueCard'
import EventCard from '@/components/cards/EventCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { STRINGS } from '@/utils/strings'
import { MapPinIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const CITIES = ['Vancouver', 'Toronto', 'Calgary', 'Montreal']

const SPORTS = [
  { value: 'football', label: 'Football', emoji: '⚽' },
  { value: 'nfl',      label: 'NFL',      emoji: '🏈' },
  { value: 'nhl',      label: 'NHL',      emoji: '🏒' },
  { value: 'nba',      label: 'NBA',      emoji: '🏀' },
  { value: 'rugby',    label: 'Rugby',    emoji: '🏉' },
  { value: 'tennis',   label: 'Tennis',   emoji: '🎾' },
  { value: 'f1',       label: 'F1',       emoji: '🏎️' },
  { value: 'cricket',  label: 'Cricket',  emoji: '🏏' },
]

// ── Structured data for Google ─────────────────────────
const structuredData = {
  '@context':   'https://schema.org',
  '@type':      'WebSite',
  name:         'HuddleFinder',
  url:          'https://www.huddlefinder.ca',
  description:  'Find the best sports bars and watch parties in Canada. World Cup, NHL, NBA, NFL and more.',
  potentialAction: {
    '@type':       'SearchAction',
    target:        'https://www.huddlefinder.ca/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
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

export default function HomePage() {
  const router                         = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [venues,        setVenues]       = useState<Venue[]>([])
  const [events,        setEvents]       = useState<VenueEvent[]>([])
  const [loadingData,   setLoadingData]  = useState(true)
  const [selectedCity,  setSelectedCity] = useState('Vancouver')
  const [nearMe,        setNearMe]       = useState(false)
  const [locating,      setLocating]     = useState(false)
  const [userLocation,  setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [error,         setError]        = useState('')

  useEffect(() => {
    if (nearMe && userLocation) {
      fetchNearbyVenues()
    } else if (!nearMe) {
      fetchData()
    }
  }, [selectedCity, nearMe, userLocation])

  async function fetchData() {
    setLoadingData(true)
    setError('')
    try {
      const snap    = await getDocs(collection(db, 'venues'))
      const results = snap.docs
        .map(d => ({ venueId: d.id, ...d.data() } as Venue))
        .filter(v => v.city === selectedCity)

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
      setVenues(results)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingData(false)
    }
  }

  async function fetchNearbyVenues() {
    if (!userLocation) return
    setLoadingData(true)
    setError('')
    try {
      const snap    = await getDocs(collection(db, 'venues'))
      const results = snap.docs
        .map(d => ({ venueId: d.id, ...d.data() } as Venue))
        .filter(v =>
          v.location?.latitude &&
          v.location?.longitude &&
          getDistanceKm(
            userLocation.lat, userLocation.lng,
            v.location.latitude, v.location.longitude
          ) <= 25
        )
        .sort((a, b) => {
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
      setVenues(results)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingData(false)
    }
  }

  function handleNearMe() {
    if (!user) {
      router.push('/auth/signup?redirect=near-me')
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

  function handleCitySelect(city: string) {
    setSelectedCity(city)
    setNearMe(false)
    setLocationError('')
  }

  if (authLoading) return <LoadingSpinner fullPage />

  return (
    <main className="pb-24 md:pb-8">

      {/* ── Structured data for Google ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* ── DESKTOP hero — unchanged ── */}
      <div className="hidden md:block bg-brand-red px-6 py-24 text-center">
        <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-3">
          {STRINGS.descriptor}
        </p>
        <h1 className="text-white text-5xl font-bold mb-4 leading-tight">
          Find where the <br />game is on
        </h1>
        <p className="text-white/80 text-lg mb-8">{STRINGS.tagline}</p>
        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              if (!user) router.push('/auth/signup')
              else router.push('/search')
            }}
          >
            {STRINGS.findAVenue}
          </Button>
          {!user && (
            <Button
              size="lg"
              onClick={() => router.push('/auth/signup?role=venue_owner')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/40 border"
            >
              {STRINGS.listYourVenue}
            </Button>
          )}
        </div>
      </div>

      {/* ── MOBILE hero ── */}
      <div className="md:hidden bg-brand-red px-6 py-6 text-center">
        <div className="h-20 w-20 rounded-full bg-white mx-auto mb-3 flex items-center justify-center shadow-lg shadow-black/20 p-3">
          <img
            src="/logo.svg"
            alt="HuddleFinder"
            className="h-full w-full object-contain"
          />
        </div>
        <p className="text-white text-sm font-medium leading-relaxed tracking-wide">
          Find your venue. Show up. Join the huddle.
        </p>
      </div>

      {/* ── Sport filter strip ── */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-center gap-1 px-4 py-2 md:py-3 min-w-max mx-auto">
          {SPORTS.map(sport => (
            <button
              key={sport.value}
              onClick={() => router.push(`/search?sport=${sport.value}`)}
              className="flex flex-col items-center gap-0.5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0 group"
            >
              <span className="text-xl md:text-2xl">{sport.emoji}</span>
              <span className="text-[10px] md:text-xs font-semibold text-gray-500 group-hover:text-brand-red transition-colors">
                {sport.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── City selector ── */}
      <div className="max-w-7xl mx-auto px-4 pt-5 md:pt-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Popular cities
          </p>
          <p className="text-xs text-gray-300 italic">More in search</p>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1">
          <button
            onClick={handleNearMe}
            disabled={locating}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold border flex-shrink-0 transition-all ${
              nearMe
                ? 'bg-brand-red text-white border-brand-red'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-red'
            } disabled:opacity-50`}
          >
            <MapPinIcon className="w-3 h-3 md:w-3.5 md:h-3.5" />
            {locating ? 'Locating...' : 'Near me'}
          </button>

          <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

          {CITIES.map(city => (
            <button
              key={city}
              onClick={() => handleCitySelect(city)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold border flex-shrink-0 transition-all ${
                selectedCity === city && !nearMe
                  ? 'bg-brand-charcoal text-white border-brand-charcoal'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-charcoal'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {locationError && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <span>⚠️</span> {locationError}
          </p>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4 md:mt-6">
          <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {/* ── Upcoming events ── */}
      {events.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6 md:mt-8">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-base md:text-lg font-bold text-brand-charcoal">
              Upcoming events {nearMe ? 'near you' : `in ${selectedCity}`}
            </h2>
            <button
              onClick={() => router.push(`/search?city=${selectedCity}`)}
              className="flex items-center gap-1 text-xs md:text-sm font-semibold text-brand-red"
            >
              {STRINGS.seeAll}
              <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {events.map(event => (
              <EventCard key={event.eventId} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* ── Venues ── */}
      <div className="max-w-7xl mx-auto px-4 mt-6 md:mt-8">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-base md:text-lg font-bold text-brand-charcoal">
            {loadingData
              ? 'Loading venues...'
              : nearMe
                ? `Venues near you (${venues.length})`
                : `Venues in ${selectedCity} (${venues.length})`
            }
          </h2>
          <button
            onClick={() => router.push(`/search?city=${selectedCity}`)}
            className="flex items-center gap-1 text-xs md:text-sm font-semibold text-brand-red"
          >
            {STRINGS.seeAll}
            <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        {loadingData ? (
          <LoadingSpinner />
        ) : venues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {venues.map(venue => (
              <VenueCard key={venue.venueId} bar={venue} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 text-gray-400 text-sm">
            {nearMe
              ? 'No venues found within 25km of your location.'
              : `No venues found in ${selectedCity} yet.`
            }
          </div>
        )}
      </div>

      {/* ── How it works ── */}
      <div className="bg-white px-6 py-10 md:py-16 mt-8 md:mt-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-3xl font-bold text-brand-charcoal text-center mb-2 md:mb-3">
            How it works
          </h2>
          <p className="text-gray-400 text-center mb-8 md:mb-12 text-sm">
            Three steps to never miss a game again
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step:  '01',
                emoji: '🔍',
                title: 'Find a venue',
                desc:  'Search by city, sport, or team. Filter by venue type — bars, restaurants, pubs and more.',
              },
              {
                step:  '02',
                emoji: '📋',
                title: 'RSVP or buy a ticket',
                desc:  'Reserve your spot for free events or buy a ticket for premium match nights.',
              },
              {
                step:  '03',
                emoji: '📺',
                title: 'Show up & enjoy',
                desc:  'Walk in, get scanned at the door, and watch live sport with fellow fans.',
              },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-red-light rounded-2xl flex items-center justify-center text-2xl md:text-3xl mx-auto mb-3 md:mb-4">
                  {item.emoji}
                </div>
                <p className="text-xs font-bold text-brand-red tracking-widest mb-1 md:mb-2">
                  {item.step}
                </p>
                <h3 className="text-base md:text-lg font-bold text-brand-charcoal mb-1 md:mb-2">
                  {item.title}
                </h3>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Venue owner CTA ── */}
      {!user && (
        <div className="bg-brand-charcoal px-6 py-10 md:py-16 text-center">
          <h2 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3">
            Own a venue?
          </h2>
          <p className="text-white/60 text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto">
            List your venue on Huddlefinder and connect with thousands of sports fans
            looking for a place to watch the game.
          </p>
          <Button
            size="md"
            onClick={() => router.push('/auth/signup?role=venue_owner')}
          >
            {STRINGS.listYourVenue}
          </Button>
        </div>
      )}

    </main>
  )
}