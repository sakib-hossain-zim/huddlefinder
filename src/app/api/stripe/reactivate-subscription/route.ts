import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import Stripe from 'stripe'

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

    const status = venue.subscriptionStatus

    // ── Revert a cancellation ─────────────────────────
    // Venue had cancel_at_period_end = true set
    // We simply turn it off — subscription continues normally
    if (status === 'cancelling') {
      await stripe.subscriptions.update(venue.stripeSubscriptionId, {
        cancel_at_period_end: false,
      })

      await adminDb.collection('venues').doc(venueId).update({
        subscriptionStatus: 'active',
        downgradingTo:      null,
        subscriptionEndsAt: null,
        updatedAt:          FieldValue.serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        plan:    venue.plan,
        message: `${venue.plan.charAt(0).toUpperCase() + venue.plan.slice(1)} plan reactivated`,
      })
    }

    // ── Revert a downgrade ────────────────────────────
    // Venue switched subscription to lower price
    // We switch it back to current (higher) plan price
    if (status === 'downgrading') {
      // Fetch current subscription to get item ID
      const existingSubscription = await stripe.subscriptions.retrieve(
        venue.stripeSubscriptionId
      ) as Stripe.Subscription

      // Get price ID for the current plan (the one they want to keep)
      const priceId = venue.plan === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID!
        : process.env.STRIPE_STARTER_PRICE_ID!

      // Switch subscription back to current plan price
      // No proration — they're just staying on the same plan
      await stripe.subscriptions.update(venue.stripeSubscriptionId, {
        items: [
          {
            id:    existingSubscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: 'none',
        // Update metadata to reflect no pending change
        metadata: {
          venueId,
          userId,
          plan: venue.plan,
        },
      })

      await adminDb.collection('venues').doc(venueId).update({
        subscriptionStatus: 'active',
        downgradingTo:      null,
        subscriptionEndsAt: null,
        updatedAt:          FieldValue.serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        plan:    venue.plan,
        message: `Kept on ${venue.plan.charAt(0).toUpperCase() + venue.plan.slice(1)} plan`,
      })
    }

    return NextResponse.json(
      { error: 'Subscription is not in a cancellable or downgrading state' },
      { status: 400 }
    )

  } catch (err) {
    console.error('Reactivate subscription error:', err)
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}