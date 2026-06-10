export interface Ticket {
  ticketId:          string
  userId:            string
  eventId:           string
  venueId:           string
  fanName:           string
  fanEmail:          string
  quantity:          number
  unitPrice:         number
  totalAmount:       number
  platformFee:       number
  venuePayout:       number
  stripePaymentId:   string
  stripeTransferId?: string
  qrCode:            string
  qrScanned:         boolean
  qrScannedAt?:      any
  status:            'pending' | 'paid' | 'refunded' | 'cancelled'
  purchasedAt:       any
}