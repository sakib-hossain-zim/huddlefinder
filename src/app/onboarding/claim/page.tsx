'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { slugify } from '@/utils/slugify'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Stepper from '@/components/ui/Stepper'
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import type { Venue, VenueType } from '@/types/venue'


const STEPS = [
  { number: 1, label: 'Claim'    },
  { number: 2, label: 'Verify'   },
  { number: 3, label: 'Profile'  },
  { number: 4, label: 'Plan'     },
  { number: 5, label: 'Payments' },
]

const VENUE_TYPES = [
  { value: 'bar',          label: 'Sports Bar',   emoji: '🍺' },
  { value: 'restaurant',   label: 'Restaurant',   emoji: '🍽️' },
  { value: 'pub',          label: 'Pub',          emoji: '🍻' },
  { value: 'rooftop',      label: 'Rooftop',      emoji: '🏙️' },
  { value: 'open_viewing', label: 'Open Viewing', emoji: '📺' },
  { value: 'club',         label: 'Club',         emoji: '🎶' },
  { value: 'hotel_bar',    label: 'Hotel Bar',    emoji: '🏨' },
  { value: 'other',        label: 'Other',        emoji: '📍' },
]

const CANADIAN_CITIES = [
  'Vancouver', 'Toronto', 'Calgary', 'Montreal',
  'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City',
  'Hamilton', 'Victoria',
]

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
]

type ClaimMode =
  | 'search_ours'
  | 'not_found'
  | 'google_places'
  | 'manual'
  | 'confirm_existing'

// ── Helpers ───────────────────────────────────────────────
function mapVenueType(primaryType?: string): VenueType {
  const mapping: Record<string, VenueType> = {
    sports_bar:  'bar',
    bar:         'bar',
    pub:         'pub',
    restaurant:  'restaurant',
    night_club:  'club',
    hotel:       'hotel_bar',
  }
  return mapping[primaryType ?? ''] ?? 'bar'
}

function mapAmenities(place: any): string[] {
  const amenities: string[] = []
  if (place.goodForGroups)                                        amenities.push('group_friendly')
  if (place.outdoorSeating)                                       amenities.push('patio')
  if (place.liveMusic)                                            amenities.push('live_dj')
  if (place.restroom)                                             amenities.push('restroom')
  if (place.accessibilityOptions?.wheelchairAccessibleEntrance)   amenities.push('wheelchair')
  if (place.parkingOptions?.paidParkingLot ||
      place.parkingOptions?.freeStreetParking)                    amenities.push('parking')
  if (place.servesCocktails)                                      amenities.push('cocktails')
  if (place.reservable)                                           amenities.push('reservations')
  if (place.takeout)                                              amenities.push('takeout')
  if (place.delivery)                                             amenities.push('delivery')
  return amenities
}

function convertHours(periods?: any[]): Record<string, { open: string; close: string }> {
  if (!periods?.length) return {}
  const hours: Record<string, { open: string; close: string }> = {}
  for (const period of periods) {
    const day = DAY_NAMES[period.open?.day]
    if (!day) continue
    const open  = `${String(period.open.hour).padStart(2, '0')}:${String(period.open.minute).padStart(2, '0')}`
    const close = `${String(period.close?.hour ?? 23).padStart(2, '0')}:${String(period.close?.minute ?? 0).padStart(2, '0')}`
    hours[day] = { open, close }
  }
  return hours
}

function extractCity(addressComponents?: any[]): string {
  return addressComponents?.find((c: any) =>
    c.types?.includes('locality')
  )?.longText ?? ''
}

function extractProvince(addressComponents?: any[]): string {
  return addressComponents?.find((c: any) =>
    c.types?.includes('administrative_area_level_1')
  )?.shortText ?? ''
}

function extractPostalCode(addressComponents?: any[]): string {
  return addressComponents?.find((c: any) =>
    c.types?.includes('postal_code')
  )?.longText ?? ''
}

// ── Component ─────────────────────────────────────────────
export default function ClaimPage() {
  const router = useRouter()
  const { user,userDoc, refreshUserDoc } = useAuth()

  const [mode,          setMode]          = useState<ClaimMode>('search_ours')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<Venue[]>([])
  const [searching,     setSearching]     = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [googleResults, setGoogleResults] = useState<any[]>([])
  const [googleSearching, setGoogleSearching] = useState(false)
  const [googleQuery,   setGoogleQuery]   = useState('')

  // Manual form state
  const [venueName,  setVenueName]  = useState('')
  const [venueType,  setVenueType]  = useState<VenueType | ''>('')
  const [address,    setAddress]    = useState('')
  const [city,       setCity]       = useState('')
  const [province,   setProvince]   = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone,      setPhone]      = useState('')
  const [email,      setEmail]      = useState('')
  const [website,    setWebsite]    = useState('')
  const [lat,        setLat]        = useState(0)
  const [lng,        setLng]        = useState(0)

  // Google Places extra fields
  const [googlePlaceId,         setGooglePlaceId]         = useState('')
  const [googleRating,          setGoogleRating]          = useState(0)
  const [googleReviewCount,     setGoogleReviewCount]     = useState(0)
  const [goodForWatchingSports, setGoodForWatchingSports] = useState(false)
  const [priceLevel,            setPriceLevel]            = useState('')
  const [outdoorSeating,        setOutdoorSeating]        = useState(false)
  const [goodForGroups,         setGoodForGroups]         = useState(false)
  const [reservable,            setReservable]            = useState(false)
  const [servesBeer,            setServesBeer]            = useState(false)
  const [servesCocktails,       setServesCocktails]       = useState(false)
  const [takeout,               setTakeout]               = useState(false)
  const [delivery,              setDelivery]              = useState(false)
  const [mappedAmenities,       setMappedAmenities]       = useState<string[]>([])
  const [mappedHours,           setMappedHours]           = useState<Record<string, { open: string; close: string }>>({})
  const [shortAddress,          setShortAddress]          = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')




  // Redirect if already has a verified venue
 useEffect(() => {
  if (!userDoc) return
  if (userDoc.venueId) {
    router.replace('/venue-dashboard')
  }
}, [userDoc, router])

// // Already has a venue — show message instead of claim form
// if (userDoc?.venueId) {
//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
//       <div className="w-full max-w-md">
//         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
//           <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
//             <BuildingStorefrontIcon className="w-7 h-7 text-amber-500" />
//           </div>
//           <h1 className="text-xl font-bold text-brand-charcoal mb-2">
//             You already have a venue
//           </h1>
//           <p className="text-sm text-gray-400 leading-relaxed mb-6">
//             Each account can only have one venue linked. If you need to
//             manage a second venue, please create a separate account.
//           </p>
//           <div className="space-y-3">
//             <Button fullWidth onClick={() => router.push('/venue-dashboard')}>
//               Go to my venue dashboard
//             </Button>
//             <Button
//               onClick={() => router.push('/venue-dashboard/settings')}
//               className="w-full py-3 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
//             >
//               Edit my existing venue
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

  // ── Search our database ─────────────────────────────────
  async function handleSearchOurs() {
    if (!searchQuery.trim() || searchQuery.length < 2) return
    setSearching(true)
    setError('')
    try {
      const snap = await getDocs(query(
        collection(db, 'venues'),
        where('status', 'in', ['unclaimed', 'active', 'pending']),
      ))
      const all      = snap.docs.map(d => ({ venueId: d.id, ...d.data() } as Venue))
      const filtered = all.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setSearchResults(filtered)
    } catch (err) {
      console.error(err)
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // ── Select existing venue ───────────────────────────────
  function handleSelectVenue(venue: Venue) {
    // Only block if truly verified — not just because ownerId exists
    if (venue.verified) {
      setError('This venue has already been claimed. Contact support if you believe this is an error.')
      return
    }
    setSelectedVenue(venue)
    setMode('confirm_existing')
    setError('')
  }

  // ── Claim existing — ONLY write pendingVenueId ──────────
  async function handleClaimExisting() {
    if (!selectedVenue || !user) return
    setLoading(true)
    setError('')
    try {
      // ✅ Do NOT touch the venue document
      // Only store intent on userDoc
      await updateDoc(doc(db, 'users', user.uid), {
        pendingVenueId: selectedVenue.venueId,
      })
      await refreshUserDoc()
      router.push('/onboarding/verify')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Search Google Places ────────────────────────────────
  async function handleSearchGoogle() {
    if (!googleQuery.trim()) return
    setGoogleSearching(true)
    setError('')
    try {
      const res  = await fetch(`/api/venues/google-search?q=${encodeURIComponent(googleQuery)}`)
      const data = await res.json()
      setGoogleResults(data.results ?? [])
      if (!data.results?.length) {
        setError('No results found. Try a different search or fill in manually.')
      }
    } catch {
      setError('Google Places search failed. Try filling in manually instead.')
    } finally {
      setGoogleSearching(false)
    }
  }

  // ── Select Google Places result ─────────────────────────
  function handleSelectGooglePlace(place: any) {
    setVenueName(place.displayName?.text ?? '')
    setAddress(place.formattedAddress ?? '')
    setShortAddress(place.shortFormattedAddress ?? '')
    setPhone(place.internationalPhoneNumber ?? '')
    setWebsite(place.websiteUri ?? '')
    setLat(place.location?.latitude ?? 0)
    setLng(place.location?.longitude ?? 0)
    setCity(extractCity(place.addressComponents))
    setProvince(extractProvince(place.addressComponents))
    setPostalCode(extractPostalCode(place.addressComponents))
    setVenueType(mapVenueType(place.primaryType))
    setGooglePlaceId(place.id ?? '')
    setGoogleRating(place.rating ?? 0)
    setGoogleReviewCount(place.userRatingCount ?? 0)
    setGoodForWatchingSports(place.goodForWatchingSports ?? false)
    setPriceLevel(place.priceLevel ?? '')
    setOutdoorSeating(place.outdoorSeating ?? false)
    setGoodForGroups(place.goodForGroups ?? false)
    setReservable(place.reservable ?? false)
    setServesBeer(place.servesBeer ?? false)
    setServesCocktails(place.servesCocktails ?? false)
    setTakeout(place.takeout ?? false)
    setDelivery(place.delivery ?? false)
    setMappedAmenities(mapAmenities(place))
    setMappedHours(convertHours(place.regularOpeningHours?.periods))
    setMode('manual')
    setError('')
  }

  // ── Validate manual form ────────────────────────────────
  function validateManual(): string {
    if (!venueName.trim()) return 'Venue name is required'
    if (!venueType)        return 'Please select a venue type'
    if (!address.trim())   return 'Address is required'
    if (!city.trim())      return 'City is required'
    if (!province.trim())  return 'Province is required'
    if (!phone.trim())     return 'Phone number is required'
    if (!email.trim())     return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email'
    return ''
  }

  // ── Submit manual form ──────────────────────────────────
  async function handleSubmit() {
    const validationError = validateManual()
    if (validationError) { setError(validationError); return }
    if (!user) return

    setError('')
    setLoading(true)

    try {
      const slug     = slugify(`${venueName} ${city}`)
      const isGoogle = !!googlePlaceId

      const venueData: any = {
        name:         venueName.trim(),
        slug,
        // ✅ No ownerId — don't commit until verified
        status:       'unclaimed',
        verified:     false,
        plan:         'free',
        venueType,
        dataSource:   isGoogle ? 'google_places' : 'manual',
        address:      address.trim(),
        shortAddress: shortAddress || address.trim(),
        city:         city.trim(),
        province:     province.trim(),
        postalCode:   postalCode.trim(),
        location:     { latitude: lat, longitude: lng },
        phone:        phone.trim(),
        email:        email.trim(),
        website:      website.trim(),
        description:  '',
        sports:       [],
        amenities:    mappedAmenities,
        photos:       [],
        coverPhoto:   '',
        hours:        mappedHours,
        social:       {},
        stripeOnboarded: false,
        totalRsvps:   0,
        totalEvents:  0,
        rating:       googleRating,
        reviewCount:  googleReviewCount,
        featured:     false,
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
      }

      if (isGoogle) {
        venueData.googlePlaceId          = googlePlaceId
        venueData.googleRating           = googleRating
        venueData.googleReviewCount      = googleReviewCount
        venueData.goodForWatchingSports  = goodForWatchingSports
        venueData.priceLevel             = priceLevel
        venueData.outdoorSeating         = outdoorSeating
        venueData.goodForGroups          = goodForGroups
        venueData.reservable             = reservable
        venueData.servesBeer             = servesBeer
        venueData.servesCocktails        = servesCocktails
        venueData.takeout                = takeout
        venueData.delivery               = delivery
      }

      const venueRef = await addDoc(collection(db, 'venues'), venueData)

      // ✅ Only write pendingVenueId — don't commit venueId until verified
      await updateDoc(doc(db, 'users', user.uid), {
        pendingVenueId: venueRef.id,
      })

      await refreshUserDoc()
      router.push('/onboarding/verify')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div>
      <Stepper steps={STEPS} currentStep={1} />

      {/* ── Search our database ── */}
      {mode === 'search_ours' && (
        <div>
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-brand-red-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BuildingStorefrontIcon className="w-7 h-7 text-brand-red" />
            </div>
            <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
              Find your venue
            </h1>
            <p className="text-gray-400 text-sm">
              Search to see if your venue is already on Huddlefinder
            </p>
            {/* ── Search first nudge ── */}
            <div className="mt-4 inline-flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-sm mx-auto">
              <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
              <p className="text-xs text-amber-700 text-left leading-relaxed">
                <span className="font-bold">Always search first.</span>{' '}
                Many Canadian venues are already on HuddleFinder and ready to claim.
                Please check if your venue already exists.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Type your venue name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchOurs()}
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                />
              </div>
              <Button onClick={handleSearchOurs} loading={searching} size="md">
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {searchResults.length} venue{searchResults.length !== 1 ? 's' : ''} found
                </p>
                {searchResults.map(venue => (
                  <button
                    key={venue.venueId}
                    onClick={() => handleSelectVenue(venue)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      venue.verified
                        ? 'border-gray-100 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-brand-red hover:bg-brand-red-light'
                    )}
                  >
                    <div className="w-10 h-10 bg-brand-charcoal-light rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                      {VENUE_TYPES.find(t => t.value === venue.venueType)?.emoji ?? '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-charcoal text-sm truncate">
                        {venue.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {venue.shortAddress || venue.address} · {venue.city}
                      </p>
                      {(venue.googleRating ?? 0) > 0 && (
                        <p className="text-xs text-yellow-500 mt-0.5">
                          ★ {venue.googleRating} ({venue.googleReviewCount} reviews)
                        </p>
                      )}
                    </div>
                    {venue.verified ? (
                      <span className="text-xs text-gray-400 font-semibold flex-shrink-0">
                        Claimed
                      </span>
                    ) : (
                      <span className="text-xs text-brand-red font-semibold flex-shrink-0">
                        Claim →
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <div className="text-center py-4 mb-2">
                <p className="text-sm text-gray-400">
                  No venues found matching "{searchQuery}"
                </p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 mt-2">
              <button
                onClick={() => { setMode('not_found'); setError('') }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Can't find your venue? Add it manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Not found — choose method ── */}
      {mode === 'not_found' && (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
              Add your venue
            </h1>
            <p className="text-gray-400 text-sm">
              How would you like to add your venue?
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { setMode('google_places'); setError('') }}
              className="w-full flex items-start gap-4 p-5 bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-red hover:bg-brand-red-light transition-all text-left"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MagnifyingGlassIcon className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-brand-charcoal">Search Google Places</p>
                <p className="text-sm text-gray-400 mt-1">
                  Find your venue on Google to auto-fill address, phone, hours and more
                </p>
                <p className="text-xs text-blue-500 font-semibold mt-2">
                  Recommended for bars, restaurants and pubs
                </p>
              </div>
            </button>

            <button
              onClick={() => { setMode('manual'); setError('') }}
              className="w-full flex items-start gap-4 p-5 bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-red hover:bg-brand-red-light transition-all text-left"
            >
              <div className="w-12 h-12 bg-brand-red-light rounded-xl flex items-center justify-center flex-shrink-0">
                <BuildingStorefrontIcon className="w-6 h-6 text-brand-red" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-brand-charcoal">Fill in manually</p>
                <p className="text-sm text-gray-400 mt-1">
                  Enter all your venue details yourself
                </p>
                <p className="text-xs text-brand-red font-semibold mt-2">
                  For outdoor viewings, fan zones and venues not on Google
                </p>
              </div>
            </button>

            <button
              onClick={() => { setMode('search_ours'); setError('') }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-brand-charcoal transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to search
            </button>
          </div>
        </div>
      )}

      {/* ── Google Places search ── */}
      {mode === 'google_places' && (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
              Search Google Places
            </h1>
            <p className="text-gray-400 text-sm">
              Search for your venue to auto-fill details
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="e.g. Shark Club Vancouver"
                  value={googleQuery}
                  onChange={e => setGoogleQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchGoogle()}
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                />
              </div>
              <Button onClick={handleSearchGoogle} loading={googleSearching} size="md">
                Search
              </Button>
            </div>

            {googleResults.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Select your venue
                </p>
                {googleResults.map((place, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectGooglePlace(place)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-red hover:bg-brand-red-light text-left transition-all"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-charcoal text-sm truncate">
                        {place.displayName?.text}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {place.shortFormattedAddress || place.formattedAddress}
                      </p>
                      {place.rating && (
                        <p className="text-xs text-yellow-500 mt-0.5">
                          ★ {place.rating} · {place.primaryTypeDisplayName?.text}
                          {place.goodForWatchingSports && (
                            <span className="text-green-600 ml-2">📺 Sports venue</span>
                          )}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <button
                onClick={() => { setMode('not_found'); setError('') }}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-charcoal transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => { setMode('manual'); setError('') }}
                className="text-sm text-brand-red font-semibold hover:underline"
              >
                Fill in manually instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual form ── */}
      {mode === 'manual' && (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
              {googlePlaceId ? 'Confirm venue details' : 'Add your venue'}
            </h1>
            <p className="text-gray-400 text-sm">
              {googlePlaceId
                ? 'Review and complete the details below'
                : 'Fill in your venue details'}
            </p>
          </div>

          {googlePlaceId && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-start gap-2">
              <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
              Details auto-filled from Google Places. Review and correct anything that's wrong.
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <Input
              label="Venue name"
              placeholder="e.g. The Blarney Stone"
              value={venueName}
              onChange={e => setVenueName(e.target.value)}
              leftIcon={<BuildingStorefrontIcon className="w-4 h-4" />}
            />

            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Venue type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VENUE_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setVenueType(type.value as VenueType)}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200',
                      venueType === type.value
                        ? 'border-brand-red bg-brand-red-light'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <span className="text-2xl">{type.emoji}</span>
                    <span className={clsx(
                      'text-xs font-semibold text-center',
                      venueType === type.value ? 'text-brand-red' : 'text-gray-600'
                    )}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Street address"
              placeholder="e.g. 180 W Georgia St"
              value={address}
              onChange={e => setAddress(e.target.value)}
              leftIcon={<MapPinIcon className="w-4 h-4" />}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                  City
                </label>
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all min-h-[48px]"
                >
                  <option value="">Select city</option>
                  {CANADIAN_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              <Input
                label="Province"
                placeholder="e.g. BC"
                value={province}
                onChange={e => setProvince(e.target.value)}
              />
            </div>

            <Input
              label="Postal code"
              placeholder="e.g. V6B 4P4"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
            />

            <Input
              label="Phone number"
              type="tel"
              placeholder="e.g. +1 604 687 4275"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              leftIcon={<PhoneIcon className="w-4 h-4" />}
            />

            <Input
              label="Venue email"
              type="email"
              placeholder="e.g. info@thehuddle.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              leftIcon={<EnvelopeIcon className="w-4 h-4" />}
              hint="Public contact email shown to fans"
            />

            <Input
              label="Website"
              placeholder="e.g. https://thehuddle.com"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              hint="Optional"
            />

            {googlePlaceId && mappedAmenities.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Auto-detected amenities from Google
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mappedAmenities.map(a => (
                    <span
                      key={a}
                      className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 text-gray-600 font-medium capitalize"
                    >
                      {a.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  You can update these in the next step
                </p>
              </div>
            )}

            {googlePlaceId && Object.keys(mappedHours).length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Opening hours from Google
                </p>
                <div className="space-y-1">
                  {Object.entries(mappedHours).map(([day, h]) => (
                    <div key={day} className="flex justify-between text-xs text-gray-600">
                      <span className="font-medium w-24">{day.slice(0, 3)}</span>
                      <span>{h.open} — {h.close}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  You can update these in the next step
                </p>
              </div>
            )}

            <Button fullWidth size="lg" loading={loading} onClick={handleSubmit}>
              Continue
            </Button>

            <button
              onClick={() => { setMode('not_found'); setError('') }}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-brand-charcoal transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm existing venue ── */}
      {mode === 'confirm_existing' && selectedVenue && (
        <div>
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
              Is this your venue?
            </h1>
            <p className="text-gray-400 text-sm">
              Confirm the details to proceed to verification
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {VENUE_TYPES.find(t => t.value === selectedVenue.venueType)?.emoji ?? '📍'}
                </span>
                <div>
                  <p className="font-bold text-brand-charcoal">{selectedVenue.name}</p>
                  <p className="text-xs text-gray-400">
                    {VENUE_TYPES.find(t => t.value === selectedVenue.venueType)?.label}
                  </p>
                </div>
              </div>

              {selectedVenue.address && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPinIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{selectedVenue.shortAddress || selectedVenue.address}, {selectedVenue.city}</span>
                </div>
              )}

              {selectedVenue.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <PhoneIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{selectedVenue.phone}</span>
                </div>
              )}

              {(selectedVenue.googleRating ?? 0) > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span className="text-gray-600">
                    {selectedVenue.googleRating} on Google
                    {selectedVenue.googleReviewCount
                      ? ` (${selectedVenue.googleReviewCount} reviews)`
                      : ''}
                  </span>
                </div>
              )}

              {selectedVenue.goodForWatchingSports && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                  <span>📺</span>
                  <span>Good for watching sports</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                fullWidth size="lg" loading={loading}
                onClick={handleClaimExisting}
              >
                Yes, this is my venue — continue to verify
              </Button>

              <Button
                fullWidth size="md" variant="secondary"
                onClick={() => {
                  setSelectedVenue(null)
                  setMode('search_ours')
                  setSearchResults([])
                  setError('')
                }}
              >
                No, search again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}