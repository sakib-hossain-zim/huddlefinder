import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { eventId, userId } = await req.json()

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ── Fetch event ───────────────────────────────────
    const eventSnap = await adminDb.collection('events').doc(eventId).get()
    if (!eventSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    const event = eventSnap.data()!

    // ── Fetch venue + verify ownership ────────────────
    const venueSnap = await adminDb.collection('venues').doc(event.venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    const venue = venueSnap.data()!

    // Only the venue owner can buy promotion for their events
    if (venue.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // ── Create one-time $5 checkout ───────────────────
    // This is a simple one-time payment — money goes to Huddlefinder
    // No Connect needed since venue is paying us, not the other way around
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment', // one-time payment
      line_items: [
        {
          price_data: {
            currency:    'cad',
            unit_amount: 500, // $5.00 in cents
            product_data: {
              name:        'Event Promotion',
              description: `Feature "${event.title}" in search results`,
            },
          },
          quantity: 1,
        },
      ],
      // Metadata tells the webhook which event to promote after payment
      metadata: {
        type:    'promotion', // webhook uses this to identify payment type
        eventId,
        userId,
        venueId: event.venueId,
      },
      // Redirect back to event management page after payment
      success_url: `${baseUrl}/venue-dashboard/events/${eventId}?promotion=success`,
      cancel_url:  `${baseUrl}/venue-dashboard/events/${eventId}?promotion=cancelled`,
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Create promotion checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}