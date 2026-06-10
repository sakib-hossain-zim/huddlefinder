export interface Rsvp {
  rsvpId:       string
  userId:       string
  eventId:      string
  venueId:      string
  fanName:      string
  fanEmail:     string
  status:       'confirmed' | 'cancelled' | 'attended'
  checkedIn:    boolean
  checkedInAt?: any
  createdAt:    any
}