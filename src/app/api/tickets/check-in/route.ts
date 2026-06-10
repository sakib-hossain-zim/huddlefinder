import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { ticketId, venueId, userId, enteringNow } = await req.json()

    if (!ticketId || !venueId || !userId || !enteringNow) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ── Verify user owns the venue ────────────────────
    const venueSnap = await adminDb.collection('venues').doc(venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    if (venueSnap.data()?.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // ── Fetch ticket ──────────────────────────────────
    const ticketSnap = await adminDb.collection('tickets').doc(ticketId).get()
    if (!ticketSnap.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    const ticket = ticketSnap.data()!

    // ── Verify ticket belongs to this venue ───────────
    if (ticket.venueId !== venueId) {
      return NextResponse.json(
        { error: 'This ticket is for a different venue' },
        { status: 403 }
      )
    }

    const prevCount    = ticket.checkedInCount ?? 0
    const quantity     = ticket.quantity ?? 1
    const remaining    = quantity - prevCount
    const isFirstEntry = prevCount === 0

    // ── Validate entering count ───────────────────────
    if (enteringNow < 1 || enteringNow > remaining) {
      return NextResponse.json(
        { error: `Can only check in between 1 and ${remaining} people` },
        { status: 400 }
      )
    }

    const newCount = prevCount + enteringNow

    // ── Update ticket ─────────────────────────────────
    const update: any = {
      checkedInCount:  newCount,
      checkedIn:       true,
      lastCheckedInAt: FieldValue.serverTimestamp(),
      updatedAt:       FieldValue.serverTimestamp(),
    }

    // Only set checkedInAt on first entry
    if (isFirstEntry) {
      update.checkedInAt = FieldValue.serverTimestamp()
    }

    await adminDb.collection('tickets').doc(ticketId).update(update)

    return NextResponse.json({
      success:        true,
      checkedInCount: newCount,
      quantity,
      remaining:      quantity - newCount,
      fullyCheckedIn: newCount >= quantity,
    })

  } catch (err: any) {
    console.error('Check-in error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to check in' },
      { status: 500 }
    )
  }
}