export interface VenueEvent {
  eventId:          string
  venueId:          string
  venueName:        string
  venueCity:        string
  venueLocation?:   { latitude: number; longitude: number }
  venueCoverPhoto?: string
  venuePlan?:       'free' | 'starter' | 'pro'
  title:            string
  sport:            string
  teams:            string[]
  league:           string
  startTime:        any
  doorsOpen?:       any
  entryType:        'free' | 'paid'
  ticketPrice?:     number   // base price in cents (before tax)
  totalTicketPrice?: number  // ← NEW: total fan pays in cents (base + tax)
  taxRate?:         number   // ← NEW: tax rate % e.g. 12 for BC
  taxLabel?:        string   // ← NEW: tax label e.g. "GST + PST"
  taxAmount?:       number   // ← NEW: tax amount in cents
  province?:        string   // ← NEW: province code e.g. "BC"
  ticketCapacity?:  number
  ticketsSold:      number
  rsvpCount:        number
  rsvpLimit?:       number
  description?:     string
  coverPhoto?:      string
  bannerImage?:     string
  status:           'upcoming' | 'live' | 'completed' | 'cancelled'
  featured:         boolean
  promoted?:        boolean
  private?:         boolean
  boostExpiresAt?:  any
  createdAt:        any
  updatedAt:        any
}