import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { eventId, userId, quantity = 1 } = await req.json()

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate quantity — must be 1-10
    const qty = Math.max(1, Math.min(10, Number(quantity)))

    // ── Fetch event ───────────────────────────────────
    const eventSnap = await adminDb.collection('events').doc(eventId).get()
    if (!eventSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    const event = eventSnap.data()!

    if (event.entryType !== 'paid' || !event.ticketPrice) {
      return NextResponse.json(
        { error: 'This event does not have paid tickets' },
        { status: 400 }
      )
    }

    // ── Check capacity ────────────────────────────────
    if (event.ticketCapacity) {
      const sold      = event.ticketsSold ?? 0
      const available = event.ticketCapacity - sold
      if (available <= 0) {
        return NextResponse.json(
          { error: 'Event is sold out' },
          { status: 400 }
        )
      }
      if (qty > available) {
        return NextResponse.json(
          { error: `Only ${available} ticket${available === 1 ? '' : 's'} remaining` },
          { status: 400 }
        )
      }
    }

    // ── Fetch venue ───────────────────────────────────
    const venueSnap = await adminDb.collection('venues').doc(event.venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    const venue = venueSnap.data()!

    if (!venue.stripeAccountId) {
      return NextResponse.json(
        { error: 'Venue has not connected Stripe yet' },
        { status: 400 }
      )
    }

    // ── Fetch user ────────────────────────────────────
    const userSnap = await adminDb.collection('users').doc(userId).get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const user = userSnap.data()!

    // ── Pricing ───────────────────────────────────────
    // basePrice      = venue's price before tax (in cents)
    // totalPrice     = what fan pays per ticket (base + tax)
    // commission     = taken from base price only, never on tax
    const basePrice  = event.ticketPrice                          // base in cents e.g. 2000 = $20.00
    const totalPrice = event.totalTicketPrice ?? event.ticketPrice // total with tax e.g. 2240 = $22.40
                                                                   // fallback for old events without tax fields

    const commissionRate = venue.plan === 'pro' ? 0.065 : 0.09
    const applicationFee = Math.round(basePrice * commissionRate * qty) // commission on base × qty

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const eventDate = event.startTime?._seconds
      ? new Date(event.startTime._seconds * 1000).toLocaleDateString('en-CA', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'Date TBC'

    // ── Build line item description ───────────────────
    // Show tax label if available so fan knows what they're paying
    const taxLabel    = event.taxLabel  ? ` (incl. ${event.taxLabel})` : ''
    const priceDesc   = event.taxRate
      ? `${venue.name} · ${eventDate} · Price includes ${event.taxLabel} tax`
      : `${venue.name} · ${eventDate}`

    // ── Create Stripe Checkout session ────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      line_items: [
        {
          price_data: {
            currency:    'cad',
            // ← Fan is charged totalPrice (base + tax) per ticket
            unit_amount: totalPrice,
            product_data: {
              name:        event.title,
              description: priceDesc,
            },
          },
          quantity: qty,
        },
      ],
      // ── Commission on base price only, never on tax ──
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: venue.stripeAccountId,
        },
      },
      // ── Webhook metadata ──────────────────────────────
      // Pass both prices so webhook can store correctly
      metadata: {
        type:             'ticket',
        eventId,
        userId,
        venueId:          event.venueId,
        userEmail:        user.email,
        userName:         `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        eventTitle:       event.title,
        venueName:        venue.name,
        eventDate,
        ticketPrice:      basePrice.toString(),       // base price per ticket
        totalTicketPrice: totalPrice.toString(),      // total fan paid per ticket
        taxRate:          (event.taxRate ?? 0).toString(),
        taxLabel:         event.taxLabel ?? '',
        taxAmount:        (event.taxAmount ?? 0).toString(),
        quantity:         qty.toString(),
      },
      customer_email: user.email,
      success_url: `${baseUrl}/tickets/success?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}&userId=${userId}`,
      cancel_url:  `${baseUrl}/events/${eventId}?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('Create ticket checkout error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}