export type VenueType =
  | 'bar'
  | 'restaurant'
  | 'pub'
  | 'rooftop'
  | 'open_viewing'
  | 'club'
  | 'hotel_bar'
  | 'other'

export type VenueStatus =
  | 'unclaimed'
  | 'pending'
  | 'active'
  | 'suspended'

export type VenueDataSource =
  | 'google_places'
  | 'manual'
  | 'claimed'

export interface Venue {
  venueId:          string
  name:             string
  slug:             string
  ownerId?:         string
  status:           VenueStatus
  verified:         boolean
  plan:             'free' | 'starter' | 'pro'
  venueType:        VenueType
  dataSource:       VenueDataSource

  // Location
  address:          string
  shortAddress?:    string
  city:             string
  province:         string
  postalCode?:      string
  location:         { latitude: number; longitude: number }

  // Contact
  phone:            string
  email:            string
  website?:         string

  // Profile
  description:      string
  sports:           string[]
  amenities:        string[]
  photos:           string[]
  coverPhoto:       string
  hours:            Record<string, { open: string; close: string }>
  social:           { instagram?: string; facebook?: string; twitter?: string }

  // Google Places data
  googlePlaceId?:           string
  googleRating?:            number
  googleReviewCount?:       number
  goodForWatchingSports?:   boolean
  priceLevel?:              'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE'

  // Venue attributes
  outdoorSeating?:  boolean
  goodForGroups?:   boolean
  reservable?:      boolean
  servesBeer?:      boolean
  servesCocktails?: boolean
  takeout?:         boolean
  delivery?:        boolean

  // Claim tracking
  claimedBy?:       string
  claimedAt?:       any

  // Stripe
  stripeAccountId?: string
  stripeOnboarded:  boolean

  // Stats
  totalRsvps:       number
  totalEvents:      number
  rating:           number
  reviewCount:      number
  featured:         boolean

  createdAt:        any
  updatedAt:        any
}