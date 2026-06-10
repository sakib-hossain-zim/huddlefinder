export interface Subscription {
  venueId:            string
  plan:               'free' | 'starter' | 'pro'
  status:             'active' | 'past_due' | 'cancelled'
  stripeCustomerId:   string
  stripeSubId:        string
  currentPeriodStart: any
  currentPeriodEnd:   any
  boostsUsed:         number
  boostsLimit:        number
  cancelledAt?:       any
  createdAt:          any
  updatedAt:          any
}