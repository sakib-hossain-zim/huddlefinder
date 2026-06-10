import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

// This is called by Stripe after venue owner completes Connect onboarding
// It's a GET route because Stripe redirects the browser here
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const venueId          = searchParams.get('venueId')

    if (!venueId) {
      return NextResponse.redirect(new URL('/venue-dashboard', req.url))
    }

    // ── Fetch venue ───────────────────────────────────
    const venueSnap = await adminDb.collection('venues').doc(venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.redirect(new URL('/venue-dashboard', req.url))
    }
    const venue = venueSnap.data()!

    // ── Verify onboarding completion ──────────────────
    // Just because they returned doesn't mean they finished
    // We check Stripe directly to confirm details were submitted
    if (venue.stripeAccountId) {
      const account = await stripe.accounts.retrieve(venue.stripeAccountId)

      if (account.details_submitted) {
        // Venue fully completed onboarding — mark as ready to receive payments
        await adminDb.collection('venues').doc(venueId).update({
          stripeOnboarded: true,
          updatedAt:       new Date(),
        })
      }
      // If details not submitted they just closed the tab early
      // stripeOnboarded stays false, Stripe warning on dashboard remains
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Redirect back to dashboard with success param
    // Dashboard shows a "Stripe connected!" toast
    return NextResponse.redirect(
      new URL('/venue-dashboard?connected=true', baseUrl)
    )

  } catch (err) {
    console.error('Connect return error:', err)
    return NextResponse.redirect(new URL('/venue-dashboard', req.url))
  }
}