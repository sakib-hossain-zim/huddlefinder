import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

if (!GOOGLE_API_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local')
  process.exit(1)
}

// ── Config ────────────────────────────────────────────────
const CITIES = [
  { name: 'Vancouver', lat: 49.2838, lng: -123.1193, province: 'BC', radius: 2500 },
  { name: 'Toronto',   lat: 43.6515, lng: -79.3835,  province: 'ON', radius: 2500 },
  { name: 'Calgary',   lat: 51.0430, lng: -114.0687, province: 'AB', radius: 2500 },
  { name: 'Montreal',  lat: 45.5017, lng: -73.5673,  province: 'QC', radius: 2500 },
]

const SEARCH_QUERIES = [
  'sports bar',
  'sports pub live screening',
  'bar big screen sports',
  'pub watching football hockey basketball',
]

const MIN_RATING       = 4.0
const MIN_REVIEW_COUNT = 50
const MAX_PER_CITY     = 20

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.internationalPhoneNumber',
  'places.location',
  'places.addressComponents',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.regularOpeningHours',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'places.priceLevel',
  'places.goodForWatchingSports',
  'places.goodForGroups',
  'places.outdoorSeating',
  'places.liveMusic',
  'places.servesBeer',
  'places.servesCocktails',
  'places.reservable',
  'places.takeout',
  'places.delivery',
  'places.restroom',
  'places.accessibilityOptions',
  'places.parkingOptions',
  'places.paymentOptions',
].join(',')

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
]

// ── Helpers ───────────────────────────────────────────────
function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapVenueType(primaryType?: string): string {
  const mapping: Record<string, string> = {
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

function extractComponent(components: any[], type: string, key = 'longText'): string {
  return components?.find((c: any) => c.types?.includes(type))?.[key] ?? ''
}

function qualityScore(place: any): number {
  const rating      = place.rating ?? 0
  const reviewCount = place.userRatingCount ?? 0
  const sportBonus  = place.goodForWatchingSports ? 3   : 0
  const typeBonus   = place.primaryType === 'sports_bar' ? 2 : 0
  const groupBonus  = place.goodForGroups ? 0.5 : 0
  const reviewScore = Math.log10(reviewCount + 1)
  return (rating * reviewScore) + sportBonus + typeBonus + groupBonus
}

function isRelevantVenue(place: any): boolean {
  const name        = (place.displayName?.text ?? '').toLowerCase()
  const primaryType = place.primaryType ?? ''

  // Must be one of these primary types
  const allowedTypes = [
    'sports_bar', 'bar', 'pub', 'restaurant',
    'night_club', 'bar_and_grill',
  ]
  if (!allowedTypes.includes(primaryType)) return false

  // Exclude by name keywords
  const excludeKeywords = [
    'golf', 'simulator', 'bowling',
    'casino', 'bingo', 'theatre', 'theater',
    'cinema', 'gym', 'fitness', 'yoga',
    'spa','motel', 'coffee', 'cafe', 'bakery', 'pizza',
    'sushi', 'ramen', 'pho', 'thai',
  ]
  if (excludeKeywords.some(kw => name.includes(kw))) return false

  // Must serve beer
  if (!place.servesBeer) return false

  return true
}

// ── API call ──────────────────────────────────────────────
async function searchPlaces(
  city: typeof CITIES[0],
  query: string
): Promise<any[]> {
  try {
    const res = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   GOOGLE_API_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery:      `${query} ${city.name}`,
          regionCode:     'CA',
          languageCode:   'en',
          maxResultCount: 20,
          locationBias: {
            circle: {
              center: { latitude: city.lat, longitude: city.lng },
              radius: city.radius,
            },
          },
        }),
      }
    )

    const data = await res.json()

    if (data.error) {
      console.error(`    API error: ${data.error.message}`)
      return []
    }

    return data.places ?? []
  } catch (err) {
    console.error(`    Fetch error:`, err)
    return []
  }
}

// ── Transform ─────────────────────────────────────────────
function transformPlace(place: any, city: typeof CITIES[0]): any {
  const components = place.addressComponents ?? []

  return {
    name:         place.displayName?.text ?? '',
    slug:         slugify(`${place.displayName?.text ?? ''} ${city.name}`),
    status:       'unclaimed',
    verified:     false,
    plan:         'free',
    venueType:    mapVenueType(place.primaryType),
    dataSource:   'google_places',

    address:      place.formattedAddress ?? '',
    shortAddress: place.shortFormattedAddress ?? '',
    city:         city.name,
    province:     city.province,
    postalCode:   extractComponent(components, 'postal_code'),
    location: {
      latitude:  place.location?.latitude  ?? city.lat,
      longitude: place.location?.longitude ?? city.lng,
    },

    phone:        place.internationalPhoneNumber ?? '',
    email:        '',
    website:      place.websiteUri ?? '',

    description:  '',
    sports:       [],
    amenities:    mapAmenities(place),
    photos:       [],
    coverPhoto:   '',
    hours:        convertHours(place.regularOpeningHours?.periods),
    social:       {},

    googlePlaceId:         place.id,
    googleRating:          place.rating ?? 0,
    googleReviewCount:     place.userRatingCount ?? 0,
    goodForWatchingSports: place.goodForWatchingSports ?? false,
    priceLevel:            place.priceLevel ?? '',
    outdoorSeating:        place.outdoorSeating ?? false,
    goodForGroups:         place.goodForGroups ?? false,
    reservable:            place.reservable ?? false,
    servesBeer:            place.servesBeer ?? false,
    servesCocktails:       place.servesCocktails ?? false,
    takeout:               place.takeout ?? false,
    delivery:              place.delivery ?? false,

    stripeOnboarded: false,
    totalRsvps:      0,
    totalEvents:     0,
    rating:          place.rating ?? 0,
    reviewCount:     place.userRatingCount ?? 0,
    featured:        false,

    // Internal — stripped before saving
    _score:       qualityScore(place),
    _primaryType: place.primaryType,
    _sportVenue:  place.goodForWatchingSports ?? false,
  }
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log('🏟️  Huddlefinder — Venue Import Script')
  console.log('=====================================\n')

  const allVenues:   any[] = []
  const seenPlaceIds       = new Set<string>()

  for (const city of CITIES) {
    console.log(`\n📍 ${city.name} (${city.lat}, ${city.lng})`)
    console.log(`   Radius: ${city.radius}m | Min rating: ${MIN_RATING} | Min reviews: ${MIN_REVIEW_COUNT}`)

    const cityVenues: any[] = []

    for (const query of SEARCH_QUERIES) {
      process.stdout.write(`   Searching: "${query}"... `)

      const places = await searchPlaces(city, query)
      let added = 0

      for (const place of places) {
        if (seenPlaceIds.has(place.id))                       continue
        if (place.businessStatus === 'CLOSED_PERMANENTLY')    continue
        if ((place.rating ?? 0) < MIN_RATING)                continue
        if ((place.userRatingCount ?? 0) < MIN_REVIEW_COUNT) continue
        if (!isRelevantVenue(place))                          continue

        seenPlaceIds.add(place.id)
        cityVenues.push(transformPlace(place, city))
        added++
      }

      console.log(`${places.length} found, ${added} passed filters`)
      await new Promise(r => setTimeout(r, 300))
    }

    // Sort by quality score
    cityVenues.sort((a, b) => b._score - a._score)

    // Log all qualifying venues
    console.log(`\n   📊 ${cityVenues.length} qualifying venues sorted by quality:`)
    cityVenues.forEach((v, i) => {
      const sport = v._sportVenue ? '📺' : '  '
      console.log(
        `   ${String(i + 1).padStart(2)}. ${sport} [${v._score.toFixed(1)}] ${v.name} ` +
        `★${v.googleRating} (${v.googleReviewCount} reviews) — ${v._primaryType}`
      )
    })

    // Take top 20 and strip internal fields
    const top = cityVenues
      .slice(0, MAX_PER_CITY)
      .map(({ _score, _primaryType, _sportVenue, ...venue }) => venue)

    console.log(`\n   ✓ Selected top ${top.length} for ${city.name}`)
    allVenues.push(...top)
  }

  // Save to JSON
  const outputPath = path.join(process.cwd(), 'scripts', 'venues-to-import.json')
  fs.writeFileSync(outputPath, JSON.stringify(allVenues, null, 2))

  console.log('\n=====================================')
  console.log(`✅ Done! ${allVenues.length} venues saved to scripts/venues-to-import.json`)
  console.log('\nNext steps:')
  console.log('  1. Open scripts/venues-to-import.json and review')
  console.log('  2. Remove any irrelevant venues')
  console.log('  3. Run: npm run import:to-db')
}

main().catch(err => {
  console.error('\n❌ Script failed:', err)
  process.exit(1)
})