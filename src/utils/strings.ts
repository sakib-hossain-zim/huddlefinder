import type { VenueType } from '@/types/venue'

export const STRINGS = {
  // Venue terminology
  venue:         'venue',
  venues:        'venues',
  Venue:         'Venue',
  Venues:        'Venues',
  yourVenue:     'your venue',
  YourVenue:     'Your venue',
  listYourVenue: 'List your venue',
  findAVenue:    'Explore events near you',

  // App
  appName:    'Huddlefinder',
  descriptor: "Canada's Live Sports Finder",
  tagline:    'Find your venue. Show up. Join the huddle.',

  // CTAs
  rsvpFree:  'RSVP free',
  buyTicket: 'Buy ticket',
  viewEvent: 'View event →',
  viewVenue: 'View venue →',
  seeAll:    'See all',

  // Nav
  discover:  'Discover',
  events:    'Events',
  myRsvps:   'RSVPs',
  profile:   'Profile',
  logIn:     'Log in',
  signIn:    'Sign in',
  signOut:   'Sign out',
  dashboard: 'Dashboard',

  // Search
  searchPlaceholder: 'City',
  searchSubtext:     'Find where the game is on',
  anywhere:          'Anywhere',
  anySport:          'Any sport',

  // Empty states
  noEventsTitle: 'No events found',
  noEventsDesc:  'Try adjusting your filters or check back later.',
  noVenuesTitle: 'No venues found',
  noVenuesDesc:  'Be the first venue in your city.',

  // Auth
  signUpFan:   "I'm a fan",
  signUpVenue: 'I own a venue',

  // Onboarding
  claimVenue:      'Claim your venue',
  createVenue:     'Add a new venue',
  completeProfile: 'Complete your venue profile',

  // Venue types
  venueTypes: {
    bar:          { label: 'Sports Bar',   emoji: '🍺' },
    restaurant:   { label: 'Restaurant',   emoji: '🍽️' },
    pub:          { label: 'Pub',          emoji: '🍻' },
    rooftop:      { label: 'Rooftop',      emoji: '🏙️' },
    open_viewing: { label: 'Open Viewing', emoji: '📺' },
    club:         { label: 'Club',         emoji: '🎶' },
    hotel_bar:    { label: 'Hotel Bar',    emoji: '🏨' },
    other:        { label: 'Other Venue',  emoji: '📍' },
  },
} as const

export function getVenueTypeLabel(type?: VenueType): string {
  if (!type) return 'Venue'
  return STRINGS.venueTypes[type]?.label ?? 'Venue'
}

export function getVenueTypeEmoji(type?: VenueType): string {
  if (!type) return '📍'
  return STRINGS.venueTypes[type]?.emoji ?? '📍'
}