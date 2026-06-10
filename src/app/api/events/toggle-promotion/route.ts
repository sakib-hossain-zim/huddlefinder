import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const STARTER_LIMIT = 5
const CYCLE_DAYS    = 30

function isCycleExpired(cycleStart: any): boolean {
  if (!cycleStart) return true
  const start     = cycleStart._seconds
    ? new Date(cycleStart._seconds * 1000)
    : new Date(cycleStart)
  const daysSince = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= CYCLE_DAYS
}

function daysUntilReset(cycleStart: any): number {
  if (!cycleStart) return 0
  const start   = cycleStart._seconds
    ? new Date(cycleStart._seconds * 1000)
    : new Date(cycleStart)
  const elapsed = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(Math.ceil(CYCLE_DAYS - elapsed), 0)
}

export async function POST(req: NextRequest) {
  try {
    const { eventId, userId, action } = await req.json()

    if (!eventId || !userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ── Fetch event ───────────────────────────────────
    const eventRef  = adminDb.collection('events').doc(eventId)
    const eventSnap = await eventRef.get()
    if (!eventSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    const event = eventSnap.data()!

    // ── Fetch venue ───────────────────────────────────
    const venueRef  = adminDb.collection('venues').doc(event.venueId)
    const venueSnap = await venueRef.get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    const venue = venueSnap.data()!

    // ── Verify ownership ──────────────────────────────
    if (venue.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const plan = venue.plan ?? 'free'

    // ── Pro: make private ─────────────────────────────
    if (action === 'make_private') {
      if (plan !== 'pro') {
        return NextResponse.json(
          { error: 'Private events are a Pro feature' },
          { status: 403 }
        )
      }
      await eventRef.update({
        private:   true,
        promoted:  false,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, private: true, promoted: false })
    }

    // ── Pro: make public ──────────────────────────────
    if (action === 'make_public') {
      if (plan !== 'pro') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      await eventRef.update({
        private:   false,
        promoted:  true,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, private: false, promoted: true })
    }

    // ── Starter: unpromote ────────────────────────────
    if (action === 'unpromote') {
      if (plan !== 'starter') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      if (!event.promoted) {
        return NextResponse.json(
          { error: 'Event is not currently promoted' },
          { status: 400 }
        )
      }
      await eventRef.update({
        promoted:  false,
        updatedAt: FieldValue.serverTimestamp(),
      })
      const currentUsed = venue.promotionsUsed ?? 0
      const newUsed     = Math.max(currentUsed - 1, 0)
      await venueRef.update({
        promotionsUsed: newUsed,
        updatedAt:      FieldValue.serverTimestamp(),
      })
      return NextResponse.json({
        success:        true,
        promoted:       false,
        promotionsUsed: newUsed,
        promotionsLeft: STARTER_LIMIT - newUsed,
        daysUntilReset: daysUntilReset(venue.promotionCycleStart),
      })
    }

    // ── Starter: promote ──────────────────────────────
    if (action === 'promote') {
      if (plan === 'free') {
        return NextResponse.json(
          { error: 'Upgrade to Starter or Pro to promote events' },
          { status: 403 }
        )
      }
      if (plan !== 'starter') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Check + reset 30-day cycle
      let promotionsUsed      = venue.promotionsUsed      ?? 0
      let promotionCycleStart = venue.promotionCycleStart ?? null

      if (isCycleExpired(promotionCycleStart)) {
        promotionsUsed = 0
        await venueRef.update({
          promotionsUsed:      0,
          promotionCycleStart: FieldValue.serverTimestamp(),
          updatedAt:           FieldValue.serverTimestamp(),
        })
        promotionCycleStart = new Date()
      }

      // Check limit
      if (promotionsUsed >= STARTER_LIMIT) {
        return NextResponse.json({
          error:          'limit_reached',
          promotionsUsed,
          promotionsLeft: 0,
          daysUntilReset: daysUntilReset(venue.promotionCycleStart),
          limit:          STARTER_LIMIT,
        }, { status: 403 })
      }

      // Promote
      await eventRef.update({
        promoted:  true,
        updatedAt: FieldValue.serverTimestamp(),
      })
      const newUsed = promotionsUsed + 1
      await venueRef.update({
        promotionsUsed: newUsed,
        updatedAt:      FieldValue.serverTimestamp(),
      })
      return NextResponse.json({
        success:        true,
        promoted:       true,
        promotionsUsed: newUsed,
        promotionsLeft: STARTER_LIMIT - newUsed,
        daysUntilReset: daysUntilReset(promotionCycleStart),
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (err) {
    console.error('Toggle promotion error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}