import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // ── Find venue by owner ───────────────────────────
    const venuesSnap = await adminDb
      .collection('venues')
      .where('ownerId', '==', userId)
      .limit(1)
      .get()

    if (venuesSnap.empty) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    const venue = venuesSnap.docs[0].data()

    // Venue must have a Stripe customer to access the portal
    // (they need to have subscribed at least once)
    if (!venue.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found — subscribe first' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // ── Create Stripe Billing Portal session ──────────
    // This is Stripe's hosted page where venue owners can:
    // - Cancel their subscription
    // - Update their payment method
    // - View billing history
    // We don't build any of this ourselves — Stripe handles it all
    const session = await stripe.billingPortal.sessions.create({
      customer:   venue.stripeCustomerId,
      return_url: `${baseUrl}/venue-dashboard`, // where to go after portal
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}