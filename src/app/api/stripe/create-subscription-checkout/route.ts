import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { venueId, userId, plan } = await req.json()

    // ── Validate inputs ───────────────────────────────
    if (!venueId || !userId || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    if (plan !== 'starter' && plan !== 'pro') {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // ── Fetch venue ───────────────────────────────────
    const venueSnap = await adminDb.collection('venues').doc(venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    const venue = venueSnap.data()!

    // ── Fetch user ────────────────────────────────────
    const userSnap = await adminDb.collection('users').doc(userId).get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const user = userSnap.data()!

    // ── Handle existing active subscription ───────────
    // Venue already has a subscription — this is an upgrade or downgrade
    if (venue.stripeSubscriptionId && venue.subscriptionStatus === 'active') {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(
          venue.stripeSubscriptionId
        ) as Stripe.Subscription

        const newPriceId = plan === 'starter'
          ? process.env.STRIPE_STARTER_PRICE_ID!
          : process.env.STRIPE_PRO_PRICE_ID!

        // Detect upgrade vs downgrade by comparing plan prices
        const currentPlanIsStarter = existingSubscription.items.data[0].price.id
          === process.env.STRIPE_STARTER_PRICE_ID
        const currentPlanPrice = currentPlanIsStarter ? 4900 : 9900
        const newPlanPrice     = plan === 'pro' ? 9900 : 4900
        const isUpgrade        = newPlanPrice > currentPlanPrice
        const isDowngrade      = newPlanPrice < currentPlanPrice

        // ── Upgrade (e.g. Starter → Pro) ─────────────
        // Charge prorated difference immediately
        // Venue gets new plan features right away
        if (isUpgrade) {
          await stripe.subscriptions.update(venue.stripeSubscriptionId, {
            items: [
              {
                id:    existingSubscription.items.data[0].id,
                price: newPriceId,
              },
            ],
            // Stripe calculates and charges the difference for remaining days
            proration_behavior: 'create_prorations',
            // Update metadata so future webhooks know the plan
            metadata: { venueId, userId, plan },
          })

          // Update Firestore immediately — upgrade takes effect now
          await adminDb.collection('venues').doc(venueId).update({
            plan,
            featured:           plan === 'pro',
            subscriptionStatus: 'active',
            subscriptionEndsAt: null,
            downgradingTo:      null,
            updatedAt:          FieldValue.serverTimestamp(),
          })

          // Update all venue events with new plan
          const eventsSnap = await adminDb
            .collection('events')
            .where('venueId', '==', venueId)
            .get()

          await Promise.all(eventsSnap.docs.map(eventDoc =>
            eventDoc.ref.update({
              venuePlan: plan,
              // Pro events are promoted by default
              promoted: plan === 'pro' ? true : eventDoc.data().promoted ?? false,
            })
          ))

          // Return upgrade details — frontend shows confirmation modal
          return NextResponse.json({
            upgraded:      true,
            plan,
            nextMonthPrice: newPlanPrice,
          })
        }

        // ── Downgrade (e.g. Pro → Starter) ───────────
        // Switch subscription to new lower price with no proration
        // Venue keeps current plan features until next billing date
        // On next billing date, invoice.payment_succeeded fires
        // and webhook updates the plan to the new lower plan
        if (isDowngrade) {
          await stripe.subscriptions.update(venue.stripeSubscriptionId, {
            items: [
              {
                id:    existingSubscription.items.data[0].id,
                price: newPriceId,
              },
            ],
            // No proration — don't charge or credit the difference
            // They just pay the new lower price starting next cycle
            proration_behavior: 'none',
            // Update metadata for future webhook events
            metadata: { venueId, userId, plan },
          })

          // // // Get current billing period end — when features will change
            const periodEnd       = existingSubscription.items.data[0].current_period_end
            const endsAt          = new Date(periodEnd * 1000)
            const endsAtFormatted = endsAt.toLocaleDateString('en-CA', {
            month: 'long', day: 'numeric', year: 'numeric',
           })

          // Don't change plan in Firestore yet — venue keeps current features
          // downgradingTo tells the webhook what plan to apply on next billing
          await adminDb.collection('venues').doc(venueId).update({
            // plan stays unchanged — they keep current plan features
            subscriptionStatus: 'downgrading',
            downgradingTo:      plan,      // what plan to switch to
            subscriptionEndsAt: endsAt,    // when current features expire
            updatedAt:          FieldValue.serverTimestamp(),
          })

          // Return downgrade details for frontend confirmation message
          return NextResponse.json({
            downgrading:     true,
            plan,
            currentPlan:     venue.plan,  // what they still have till cycle end
            endsAtFormatted,
          })
        }

      } catch (err) {
        console.warn('Could not update existing subscription, creating new checkout:', err)
        // Fall through to create new Stripe Checkout session
      }
    }

    // ── New subscription — Stripe Checkout ────────────
    // First time subscriber — needs to enter card details
    // Get or create Stripe customer
    let stripeCustomerId = venue.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        name:     `${user.firstName} ${user.lastName}`,
        metadata: { venueId, userId },
      })
      stripeCustomerId = customer.id

      // Save customer ID to Firestore for future subscriptions
      await adminDb.collection('venues').doc(venueId).update({
        stripeCustomerId,
      })
    }

    const priceId = plan === 'starter'
      ? process.env.STRIPE_STARTER_PRICE_ID!
      : process.env.STRIPE_PRO_PRICE_ID!

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Create hosted Stripe Checkout session
    // Venue owner enters card on Stripe's secure page
    const session = await stripe.checkout.sessions.create({
      customer:             stripeCustomerId,
      payment_method_types: ['card'],
      mode:                 'subscription',
      line_items:           [{ price: priceId, quantity: 1 }],
      // Metadata passed to webhook after payment
      metadata: {
        venueId,
        userId,
        plan,
        type: 'subscription',
      },
      subscription_data: {
        // Also store on subscription for future webhook events
        metadata: { venueId, userId, plan },
      },
      success_url: `${baseUrl}/venue-dashboard?subscription=success&plan=${plan}`,
      cancel_url:  `${baseUrl}/venue-dashboard/upgrade?cancelled=true`,
      allow_promotion_codes: true,
    })

    // Return URL — frontend redirects to Stripe
    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Create subscription checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}