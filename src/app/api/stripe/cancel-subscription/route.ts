import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId, venueId } = await req.json()

    if (!userId || !venueId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ── Fetch venue ───────────────────────────────────
    const venueSnap = await adminDb.collection('venues').doc(venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    const venue = venueSnap.data()!

    // ── Verify ownership ──────────────────────────────
    if (venue.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!venue.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // ── Cancel at period end ──────────────────────────
    // cancel_at_period_end = true means:
    // - Subscription stays ACTIVE until billing period ends
    // - No refund — venue keeps all features until end date
    // - On period end Stripe fires customer.subscription.deleted
    // - Our webhook then sets plan: 'free'
    const subscription = await stripe.subscriptions.update(
      venue.stripeSubscriptionId,
      { cancel_at_period_end: true }
    )

    // When benefits actually expire
    const endsAt          = new Date(subscription.items.data[0].current_period_end * 1000)
    const endsAtFormatted = endsAt.toLocaleDateString('en-CA', {
      month: 'long', day: 'numeric', year: 'numeric',
    })

    // ── Update Firestore ──────────────────────────────
    // plan stays the same — they keep current benefits
    // subscriptionStatus changes to 'cancelling'
    // downgradingTo: 'free' — webhook uses this to know target plan
    await adminDb.collection('venues').doc(venueId).update({
      subscriptionStatus: 'cancelling',  // not renewing, still active
      downgradingTo:      'free',        // webhook will set plan to this
      subscriptionEndsAt: endsAt,        // exact date benefits expire
      updatedAt:          FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success:       true,
      endsAt:        endsAt.toISOString(),
      endsAtFormatted,
      plan:          venue.plan,  // still on current plan until end date
    })

  } catch (err) {
    console.error('Cancel subscription error:', err)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}