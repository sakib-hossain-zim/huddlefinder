'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Venue } from '@/types/venue'
import type { VenueEvent } from '@/types/event'
import { useAuth } from '@/hooks/useAuth'
import { getVenueTypeLabel, getVenueTypeEmoji } from '@/utils/strings'
import SportPill from '@/components/ui/SportPill'
import EventCard from '@/components/cards/EventCard'
import Button from '@/components/ui/Button'
import {
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  ClockIcon,
  ChevronLeftIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ShareIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { clsx } from 'clsx'

const DAYS = [
  'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday', 'Sunday',
]

const AMENITY_LABELS: Record<string, { label: string; emoji: string }> = {
  group_friendly: { label: 'Good for groups',      emoji: '👥' },
  patio:          { label: 'Patio / outdoor',       emoji: '🌿' },
  live_dj:        { label: 'Live music',            emoji: '🎵' },
  restroom:       { label: 'Restrooms',             emoji: '🚻' },
  wheelchair:     { label: 'Wheelchair accessible', emoji: '♿' },
  parking:        { label: 'Parking available',     emoji: '🅿️' },
  cocktails:      { label: 'Cocktails',             emoji: '🍹' },
  reservations:   { label: 'Reservations',          emoji: '📋' },
  takeout:        { label: 'Takeout',               emoji: '🥡' },
  delivery:       { label: 'Delivery',              emoji: '🛵' },
  big_screens:    { label: 'Big screens',           emoji: '📺' },
  kitchen:        { label: 'Full kitchen',          emoji: '🍳' },
  pool_table:     { label: 'Pool table',            emoji: '🎱' },
  happy_hour:     { label: 'Happy hour',            emoji: '🍺' },
}

interface Props {
  venue:  Venue
  events: VenueEvent[]
}

export default function VenueProfileClient({ venue, events }: Props) {
  const router            = useRouter()
  const { user, userDoc } = useAuth()

  const [photoIndex,     setPhotoIndex]     = useState(0)
  const [copied,         setCopied]         = useState(false)
  const [alreadyHasVenue, setAlreadyHasVenue] = useState(false)

  const allPhotos = [
    ...(venue.coverPhoto ? [venue.coverPhoto] : []),
    ...(venue.photos?.filter(p => p !== venue.coverPhoto) ?? []),
  ]

  const hasPhotos   = allPhotos.length > 0
  const venueEmoji  = getVenueTypeEmoji(venue.venueType)
  const venueLabel  = getVenueTypeLabel(venue.venueType)
  const isUnclaimed = !venue.verified

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: venue.name, url })
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleClaim() {
    if (!user) {
      router.push('/auth/signup?role=venue_owner')
    } else if (userDoc?.role === 'venue_owner' && userDoc?.venueId) {
      setAlreadyHasVenue(true)
    } else if (userDoc?.role === 'venue_owner') {
      router.push('/onboarding/claim')
    } else {
      router.push('/auth/signup?role=venue_owner')
    }
  }

  function formatHours(day: string): string {
    const h = venue.hours?.[day]
    if (!h) return 'Closed'
    return `${h.open} — ${h.close}`
  }

  function isOpenNow(): boolean {
    const now     = new Date()
    const dayIdx  = now.getDay() === 0 ? 6 : now.getDay() - 1
    const dayName = DAYS[dayIdx]
    const h       = venue.hours?.[dayName]
    if (!h) return false

    const [oh, om] = h.open.split(':').map(Number)
    const [ch, cm] = h.close.split(':').map(Number)
    const current  = now.getHours() * 60 + now.getMinutes()
    const open     = oh * 60 + om
    const close    = ch * 60 + cm

    if (close < open) return current >= open || current <= close
    return current >= open && current <= close
  }

  const openNow = isOpenNow()

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">

      {/* Back bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-16 md:top-24 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Cover photo */}
        <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-brand-charcoal to-gray-700">
          {hasPhotos ? (
            <div className="relative">
              <img
                src={allPhotos[photoIndex]}
                alt={venue.name}
                className="w-full h-64 md:h-96 object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              {allPhotos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allPhotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={clsx(
                        'h-2 rounded-full transition-all bg-white',
                        i === photoIndex ? 'w-4' : 'w-2 opacity-50'
                      )}
                    />
                  ))}
                </div>
              )}
              {allPhotos.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {photoIndex + 1} / {allPhotos.length}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-64 md:h-80 flex items-center justify-center text-7xl">
              {venueEmoji}
            </div>
          )}
          {venue.featured && (
            <div className="absolute top-3 left-3 bg-brand-red text-white text-xs font-bold px-2.5 py-1 rounded-full">
              ⭐ Featured
            </div>
          )}
        </div>

        {/* Venue header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-lg">{venueEmoji}</span>
                <span className="text-xs font-semibold text-gray-400">{venueLabel}</span>
                {venue.verified && (
                  <CheckBadgeIcon className="w-4 h-4 text-blue-500" />
                )}
                {venue.goodForWatchingSports && (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    📺 Sports venue
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-brand-charcoal">{venue.name}</h1>
            </div>

            {(venue.googleRating ?? venue.rating ?? 0) > 0 && (
              <div className="flex flex-col items-center bg-brand-red-light rounded-xl p-2.5 flex-shrink-0">
                <StarIconSolid className="w-4 h-4 text-yellow-500" />
                <span className="text-lg font-bold text-brand-charcoal leading-tight">
                  {(venue.googleRating ?? venue.rating ?? 0).toFixed(1)}
                </span>
                {(venue.googleReviewCount ?? 0) > 0 && (
                  <span className="text-xs text-gray-400">
                    {(venue.googleReviewCount ?? 0).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 text-sm text-gray-500 mb-2">
            <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-red" />
            <span>{venue.shortAddress || venue.address}</span>
          </div>

          {Object.keys(venue.hours ?? {}).length > 0 && (
            <div className="flex items-center gap-2 text-sm mb-3">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              <span className={clsx(
                'font-semibold',
                openNow ? 'text-green-600' : 'text-red-500'
              )}>
                {openNow ? 'Open now' : 'Closed now'}
              </span>
            </div>
          )}

          {venue.sports && venue.sports.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {venue.sports.map(sport => (
                <SportPill key={sport} sport={sport} size="sm" />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {/* ── View events button — requires signup ── */}
            {events.length > 0 ? (
              <Button
                fullWidth
                size="md"
                onClick={() => {
                  if (!user) {
                    // Gate behind signup
                    router.push(`/auth/signup?redirect=/venues/${venue.slug}`)
                    return
                  }
                  document
                    .getElementById('events-section')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <CalendarDaysIcon className="w-4 h-4 mr-1.5" />
                {!user
                  ? `Sign in to view ${events.length} event${events.length !== 1 ? 's' : ''}`
                  : `View ${events.length} event${events.length !== 1 ? 's' : ''}`
                }
              </Button>
            ) : (
              <Button fullWidth size="md" variant="secondary" disabled>
                No upcoming events
              </Button>
            )}
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-4 py-2.5 flex items-center gap-1.5 rounded-full text-sm font-semibold flex-shrink-0"
              >
                <GlobeAltIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Website</span>
              </a>
            )}
          </div>

          {/* Claim banner */}
          {isUnclaimed && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <BuildingStorefrontIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {alreadyHasVenue ? (
                    <>
                      <p className="text-xs font-semibold text-red-600">Cannot claim this venue</p>
                      <p className="text-xs text-red-500 mt-0.5">
                        Your account already has a venue linked. Each account can only manage one venue.
                        Please create a separate account to claim this listing.
                      </p>
                      <button
                        onClick={() => setAlreadyHasVenue(false)}
                        className="text-xs font-bold text-red-600 underline mt-1 block"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-amber-700">Is this your venue?</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Claim this listing to add events, sell tickets and connect with fans.
                      </p>
                      <button
                        onClick={handleClaim}
                        className="text-xs font-bold text-amber-700 underline mt-1 block hover:text-amber-900 transition-colors"
                      >
                        Claim this venue →
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        {venue.description && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="text-base font-bold text-brand-charcoal mb-2">About</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{venue.description}</p>
          </div>
        )}

        {/* ── Upcoming events — gated behind signup ── */}
        <div id="events-section" className="mb-4">
          <h2 className="text-lg font-bold text-brand-charcoal mb-3">
            Upcoming events
          </h2>

          {!user ? (
            // ── Signup gate ─────────────────────────────
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-brand-red-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarDaysIcon className="w-8 h-8 text-brand-red" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <LockClosedIcon className="w-4 h-4 text-gray-400" />
                <h3 className="text-base font-bold text-brand-charcoal">
                  Sign in to see events
                </h3>
              </div>
              <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto leading-relaxed">
                Create a free account to view upcoming events, RSVP and buy
                tickets at {venue.name}.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  size="md"
                  onClick={() => router.push(`/auth/signup?redirect=/venues/${venue.slug}`)}
                >
                  Create free account
                </Button>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => router.push(`/auth/login?redirect=/venues/${venue.slug}`)}
                >
                  Sign in
                </Button>
              </div>
            </div>
          ) : events.length > 0 ? (
            // ── Events grid ─────────────────────────────
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.map(event => (
                <EventCard key={event.eventId} event={event} />
              ))}
            </div>
          ) : (
            // ── No events ───────────────────────────────
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <span className="text-4xl mb-3 block">📅</span>
              <p className="text-sm font-semibold text-brand-charcoal mb-1">
                No upcoming events
              </p>
              <p className="text-xs text-gray-400">
                {isUnclaimed
                  ? 'Claim this venue to start posting events'
                  : 'Check back soon for upcoming events'
                }
              </p>
            </div>
          )}
        </div>

        {/* Amenities */}
        {venue.amenities && venue.amenities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="text-base font-bold text-brand-charcoal mb-3">Amenities</h2>
            <div className="grid grid-cols-2 gap-2">
              {venue.amenities.map(amenity => {
                const info = AMENITY_LABELS[amenity]
                if (!info) return null
                return (
                  <div key={amenity} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-base">{info.emoji}</span>
                    <span>{info.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Opening hours */}
        {Object.keys(venue.hours ?? {}).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="text-base font-bold text-brand-charcoal mb-3 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-brand-red" />
              Opening hours
            </h2>
            <div className="space-y-2">
              {DAYS.map(day => {
                const now      = new Date()
                const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1
                const isToday  = DAYS[todayIdx] === day
                return (
                  <div
                    key={day}
                    className={clsx(
                      'flex items-center justify-between text-sm py-1',
                      isToday && 'font-bold'
                    )}
                  >
                    <span className={clsx(
                      'w-28',
                      isToday ? 'text-brand-red' : 'text-gray-500'
                    )}>
                      {day.slice(0, 3)}{isToday ? ' (today)' : ''}
                    </span>
                    <span className={venue.hours?.[day] ? 'text-gray-700' : 'text-gray-400'}>
                      {formatHours(day)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="text-base font-bold text-brand-charcoal mb-3">Contact</h2>
          <div className="space-y-2.5">
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-brand-red transition-colors"
              >
                <PhoneIcon className="w-4 h-4 text-gray-400" />
                {venue.phone}
              </a>
            )}
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-brand-red transition-colors"
              >
                <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                {venue.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {venue.social?.instagram && (
              <a
                href={`https://instagram.com/${venue.social.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-brand-red transition-colors"
              >
                <span className="text-base">📸</span>
                {venue.social.instagram}
              </a>
            )}
            {venue.social?.facebook && (
              <a
                href={venue.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-brand-red transition-colors"
              >
                <span className="text-base">👥</span>
                Facebook
              </a>
            )}
          </div>
        </div>

        {/* Google Maps */}
        {(venue.location?.latitude ?? 0) !== 0 && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 hover:border-brand-red transition-colors"
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
    </div>
  )
}