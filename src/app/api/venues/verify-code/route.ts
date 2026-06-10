import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const { venueId, code, userId } = await req.json()

    if (!venueId || !code || !userId) {
      return NextResponse.json(
        { error: 'venueId, code and userId are required' },
        { status: 400 }
      )
    }

    const venueRef  = adminDb.collection('venues').doc(venueId)
    const venueSnap = await venueRef.get()

    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    const venue = venueSnap.data()!

    // Check attempts
    const attempts = venue.verificationAttempts ?? 0
    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 429 }
      )
    }

    // Check expiry
    const expiry = venue.verificationExpiry?.toDate?.()
    if (!expiry || expiry < new Date()) {
      return NextResponse.json(
        { error: 'This code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check PIN
    if (venue.verificationPin !== code.trim()) {
      await venueRef.update({
        verificationAttempts: FieldValue.increment(1),
      })
      const remaining = MAX_ATTEMPTS - attempts - 1
      return NextResponse.json(
        { error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
        { status: 400 }
      )
    }

    // ✅ Code correct — NOW commit everything
    await venueRef.update({
      ownerId:              userId,
      status:               'active',
      verified:             true,
      verifiedAt:           new Date(),
      claimedBy:            userId,
      claimedAt:            new Date(),
      dataSource:           FieldValue.delete(), // will be set below based on existing value
      verificationPin:      FieldValue.delete(),
      verificationExpiry:   FieldValue.delete(),
      verificationAttempts: FieldValue.delete(),
      verificationLastSent: FieldValue.delete(),
    })

    // Update dataSource to 'claimed' if it was google_places
    const currentSource = venue.dataSource
    await venueRef.update({
      dataSource: currentSource === 'google_places' ? 'claimed' : currentSource,
    })

    // ✅ Move pendingVenueId → venueId on userDoc
    await adminDb.collection('users').doc(userId).update({
      venueId:        venueId,
      pendingVenueId: FieldValue.delete(),
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Verify code error:', err)
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    )
  }
}