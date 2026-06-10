export interface UserDoc {
  userId:         string
  role:           'fan' | 'venue_owner' | 'admin'
  firstName:      string
  lastName:       string
  email:          string
  phone?:         string
  city?:          string
  province?:      string
  favSports?:     string[]
  favTeams?:      string[]
  favVenues?:     string[]
  venueId?:       string
  pendingVenueId?: string   // ← added: set during claim, cleared after verification
  authProviders:  string[]
  emailVerified:  boolean
  avatarUrl?:     string
  fcmTokens?:     string[]
  notifPrefs?:    {
    email: boolean
    push:  boolean
    sms:   boolean
  }
  totalRsvps?:  number
  createdAt?:   any
  lastLoginAt?: any
}