import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { userId, venueId } = await req.json()

    if (!userId || !venueId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ── Fetch venue + user ────────────────────────────
    const venueSnap = await adminDb.collection('venues').doc(venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    const venue = venueSnap.data()!

    const userSnap = await adminDb.collection('users').doc(userId).get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const user = userSnap.data()!

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // ── Get or create Stripe Connect account ──────────
    // Each venue gets their own Express account on Stripe
    // Express = Stripe handles identity verification and KYC
    // The venue owner completes onboarding on Stripe's hosted page
    let stripeAccountId = venue.stripeAccountId

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type:    'express',  // Stripe handles KYC + identity verification
        country: 'CA',       // Canada
        email:   user.email,
        capabilities: {
          card_payments: { requested: true }, // receive card payments
          transfers:     { requested: true }, // receive transfers from us
        },
        business_profile: {
          name: venue.name,
          // Use venue website or their Huddlefinder page
          url: venue.website || `https://huddlefinder.ca/venues/${venue.slug}`,
        },
        metadata: { venueId, userId },
      })

      stripeAccountId = account.id

      // Save account ID to Firestore immediately
      // stripeOnboarded stays false until they complete KYC
      await adminDb.collection('venues').doc(venueId).update({
        stripeAccountId,
        stripeOnboarded: false,
      })
    }

    // ── Create onboarding link ────────────────────────
    // This generates a one-time URL to Stripe's hosted onboarding flow
    // The venue owner fills in their bank details, ID etc on Stripe's page
    // Link expires after a few minutes so we always generate a fresh one
    const accountLink = await stripe.accountLinks.create({
      account:     stripeAccountId,
      // If onboarding fails or link expires, send them back to retry
      refresh_url: `${baseUrl}/venue-dashboard/stripe?refresh=true`,
      // After successful onboarding, Stripe sends them to our return route
      // which verifies completion and updates Firestore
      return_url:  `${baseUrl}/api/stripe/connect-return?venueId=${venueId}`,
      type:        'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })

  } catch (err) {
    console.error('Connect error:', err)
    return NextResponse.json(
      { error: 'Failed to create Connect account' },
      { status: 500 }
    )
  }
}