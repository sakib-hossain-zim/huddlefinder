import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook received')

  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('❌ No stripe-signature header')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  // ── Verify webhook is genuinely from Stripe ───────
  // Prevents anyone from faking a payment by hitting our endpoint
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('✅ Webhook verified:', event.type)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {

      // ── Checkout session completed ─────────────────
      // Fires when any Stripe Checkout session is paid
      // We use metadata.type to know what was purchased
      case 'checkout.session.completed': {
        const session  = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata ?? {}
        const type     = metadata.type

        console.log('📦 Checkout completed, type:', type)

        // ── New subscription payment ──
        // Venue owner paid $49 or $99 for the first time
        if (type === 'subscription') {
          const { venueId, plan } = metadata
          if (!venueId || !plan) {
            console.error('❌ Missing venueId or plan in metadata')
            break
          }

          console.log('🏟️ New subscription for venue:', venueId, 'plan:', plan)

          await adminDb.collection('venues').doc(venueId).update({
            plan,
            featured:             plan === 'pro',
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId:     session.customer as string,
            subscriptionStatus:   'active',
            subscriptionEndsAt:   null,
            downgradingTo:        null,
            // Reset promotion cycle on new subscription
            promotionsUsed:       0,
            promotionCycleStart:  FieldValue.serverTimestamp(),
            updatedAt:            FieldValue.serverTimestamp(),
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

          console.log('✅ Venue plan updated to:', plan)
        }

        // ── Ticket purchase ──
        // Fan paid for a ticket to an event
        // ── Ticket purchase ──
        if (type === 'ticket') {
          const {
            eventId, userId, venueId,
            userEmail, userName,
            eventTitle, venueName,
            eventDate, ticketPrice,
            quantity: quantityStr,
          } = metadata

          if (!eventId || !userId) {
            console.error('❌ Missing eventId or userId')
            break
          }

          // Parse quantity — defaults to 1 for backwards compatibility
          const quantity = parseInt(quantityStr ?? '1', 10)

          console.log('🎟️ Creating ticket for event:', eventId, 'qty:', quantity, 'user:', userId)

          // Create ONE ticket document
          // quantity field tells scanner how many people this QR admits
          const ticketRef = adminDb.collection('tickets').doc()
          await ticketRef.set({
            ticketId:            ticketRef.id,
            eventId,
            venueId,
            userId,
            userEmail,
            userName,
            eventTitle,
            venueName,
            eventDate,
            ticketPrice:         Number(ticketPrice),    // per ticket price in cents
            quantity,                                     // number of people this admits
            totalPrice:          Number(ticketPrice) * quantity, // total paid in cents
            stripeSessionId:     session.id,
            stripePaymentIntent: session.payment_intent as string,
            qrData:              ticketRef.id,            // QR encodes ticketId
            checkedIn:           false,
            checkedInAt:         null,
            purchasedAt:         FieldValue.serverTimestamp(),
          })

          // Increment BOTH ticketsSold AND rsvpCount by quantity
          // rsvpCount reflects total people attending (free RSVPs + ticket buyers)
          await adminDb.collection('events').doc(eventId).update({
            ticketsSold: FieldValue.increment(quantity),
            rsvpCount:   FieldValue.increment(quantity),
          })

          console.log('✅ Ticket created:', ticketRef.id, '| qty:', quantity, '| rsvpCount +', quantity)
        }

        // ── Event promotion purchase ──
        // Starter venue paid $5 for an extra promotion slot
        if (type === 'promotion') {
          const { eventId } = metadata
          if (!eventId) {
            console.error('❌ Missing eventId in promotion metadata')
            break
          }

          // Mark event as promoted
          // Does NOT count against the monthly free promotion limit
          await adminDb.collection('events').doc(eventId).update({
            promoted:  true,
            updatedAt: FieldValue.serverTimestamp(),
          })

          console.log('✅ Event promoted:', eventId)
        }

        break
      }

      // ── Invoice paid ───────────────────────────────
      // Fires at the start of every new billing period
      // We use this to detect when a Pro → Starter downgrade takes effect
      // On next billing date Stripe charges the new lower price
      // and this event fires — we then update the plan in Firestore
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        // In newer Stripe API, subscription ID is nested under parent
        // invoice.subscription no longer exists directly on the Invoice object
        const subscriptionId = (invoice.parent as any)
          ?.subscription_details
          ?.subscription as string

        if (!subscriptionId) {
          console.log('ℹ️ No subscription on invoice — skipping')
          break
        }

        // Fetch subscription to get our venue metadata
        const sub     = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
        const venueId = sub.metadata?.venueId
        if (!venueId) {
          console.log('ℹ️ No venueId in subscription metadata — skipping')
          break
        }

        // Fetch venue from Firestore
        const venueSnap = await adminDb.collection('venues').doc(venueId).get()
        if (!venueSnap.exists) {
          console.error('❌ Venue not found:', venueId)
          break
        }
        const venueData = venueSnap.data()!

        // Only act if venue is in 'downgrading' state
        // This means we switched the subscription price but kept the old plan
        // until this billing cycle turned over
        // Normal monthly renewals are ignored here
        if (venueData.subscriptionStatus !== 'downgrading') {
          console.log('ℹ️ Venue not downgrading — skipping invoice event')
          break
        }

        const targetPlan = venueData.downgradingTo
        if (!targetPlan) {
          console.error('❌ No downgradingTo field on venue')
          break
        }

        console.log('📉 Downgrade taking effect for venue:', venueId, '→', targetPlan)

        // Downgrade has taken effect — update plan in Firestore
        // Billing cycle has turned over so old plan benefits have ended
        await adminDb.collection('venues').doc(venueId).update({
          plan:               targetPlan,
          featured:           targetPlan === 'pro',
          subscriptionStatus: 'active',    // still subscribed, just lower plan
          downgradingTo:      null,         // clear downgrade flag
          subscriptionEndsAt: null,
          // Reset promotion cycle for new plan
          promotionsUsed:      0,
          promotionCycleStart: FieldValue.serverTimestamp(),
          updatedAt:           FieldValue.serverTimestamp(),
        })

        // Update all venue events with new plan
        const eventsSnap = await adminDb
          .collection('events')
          .where('venueId', '==', venueId)
          .get()

        await Promise.all(eventsSnap.docs.map(eventDoc =>
          eventDoc.ref.update({
            venuePlan: targetPlan,
            // Remove promotions only if dropping to free
            // Starter keeps their existing promoted events
            promoted: targetPlan === 'free'
              ? false
              : eventDoc.data().promoted ?? false,
          })
        ))

        console.log('✅ Downgrade applied, venue now on:', targetPlan)
        break
      }

      // ── Subscription updated via Stripe portal ─────
      // Fires when subscription changes via Stripe billing portal
      // We skip this if we're handling a downgrade or cancellation
      // since those are managed by invoice.payment_succeeded
      // and customer.subscription.deleted respectively
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const venueId      = subscription.metadata?.venueId
        if (!venueId) {
          console.log('ℹ️ No venueId in subscription metadata — skipping')
          break
        }

        // Fetch venue to check current status
        const venueSnap = await adminDb.collection('venues').doc(venueId).get()
        if (!venueSnap.exists) break
        const venueData = venueSnap.data()!

        // Skip if we're managing the state change ourselves
        // downgrading → handled by invoice.payment_succeeded
        // cancelling  → handled by customer.subscription.deleted
        if (
          venueData.subscriptionStatus === 'downgrading' ||
          venueData.subscriptionStatus === 'cancelling'
        ) {
          console.log('ℹ️ Skipping subscription.updated — state managed separately')
          break
        }

        const plan = subscription.metadata?.plan ?? 'free'
        console.log('🔄 Subscription updated for venue:', venueId, 'plan:', plan)

        await adminDb.collection('venues').doc(venueId).update({
          plan,
          featured:           plan === 'pro',
          subscriptionStatus: subscription.status,
          updatedAt:          FieldValue.serverTimestamp(),
        })
        break
      }

      // ── Subscription cancelled or ended ───────────
      // Fires when:
      // 1. Billing period ends after cancel_at_period_end = true
      //    (Starter→Free or Pro→Free cancellations)
      // 2. Payment fails repeatedly (Stripe dunning)
      //
      // NOTE: Pro→Starter does NOT fire this event
      // That downgrade keeps the subscription active (just lower price)
      // and is handled by invoice.payment_succeeded above
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const venueId      = subscription.metadata?.venueId
        if (!venueId) {
          console.log('ℹ️ No venueId in subscription metadata — skipping')
          break
        }

        // Fetch venue to read downgradingTo
        // For cancellations this is always 'free' (set by cancel-subscription API)
        const venueSnap = await adminDb.collection('venues').doc(venueId).get()
        if (!venueSnap.exists) {
          console.error('❌ Venue not found:', venueId)
          break
        }
        const venueData  = venueSnap.data()!
        const targetPlan = venueData?.downgradingTo ?? 'free'

        console.log('🔴 Subscription deleted for venue:', venueId, '→', targetPlan)

        // Downgrade the plan — venue has had their benefits until today
        await adminDb.collection('venues').doc(venueId).update({
          plan:                 targetPlan,
          featured:             false,
          stripeSubscriptionId: null,    // no longer has active subscription
          subscriptionStatus:   'cancelled',
          downgradingTo:        null,
          updatedAt:            FieldValue.serverTimestamp(),
        })

        // Remove promotions from all venue events
        const eventsSnap = await adminDb
          .collection('events')
          .where('venueId', '==', venueId)
          .get()

        await Promise.all(eventsSnap.docs.map(eventDoc =>
          eventDoc.ref.update({
            venuePlan: targetPlan,
            promoted:  false,  // no promotions on cancelled/free plan
          })
        ))

        console.log('✅ Venue downgraded to:', targetPlan)
        break
      }

      // ── Stripe Connect account updated ────────────
      // Fires when venue owner completes Connect onboarding
      // We check details_submitted to confirm they fully completed it
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (!account.metadata?.venueId) {
          console.log('ℹ️ No venueId in account metadata — skipping')
          break
        }

        // Only mark as onboarded if they fully submitted their details
        // They might have started but closed the tab before finishing
        if (account.details_submitted) {
          console.log('✅ Stripe Connect onboarded for venue:', account.metadata.venueId)
          await adminDb
            .collection('venues')
            .doc(account.metadata.venueId)
            .update({
              stripeOnboarded: true,
              updatedAt:       FieldValue.serverTimestamp(),
            })
        }
        break
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type)
    }

    // Always return 200 — if we return error Stripe retries the webhook
    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('❌ Webhook handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}