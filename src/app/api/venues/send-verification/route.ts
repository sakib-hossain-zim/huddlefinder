import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return phone
  return `+1 *** *** **${digits.slice(-2)}`
}

function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10) digits = `1${digits}`
  return `+${digits}`
}

export async function POST(req: NextRequest) {
  try {
    const { venueId } = await req.json()
    if (!venueId) {
      return NextResponse.json({ error: 'venueId is required' }, { status: 400 })
    }

    const venueSnap = await adminDb.collection('venues').doc(venueId).get()
    if (!venueSnap.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    const venue = venueSnap.data()!
    const phone = venue.phone

    if (!phone) {
      return NextResponse.json(
        { error: 'No phone number on file for this venue' },
        { status: 400 }
      )
    }

    // Rate limit — 60 seconds between sends
    const lastSent = venue.verificationLastSent?.toDate?.() ?? null
    if (lastSent) {
      const secondsSince = (Date.now() - lastSent.getTime()) / 1000
      if (secondsSince < 60) {
        return NextResponse.json(
          { error: `Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting another code` },
          { status: 429 }
        )
      }
    }

    const pin    = generatePin()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    // Store PIN
    await adminDb.collection('venues').doc(venueId).update({
      verificationPin:      pin,
      verificationExpiry:   expiry,
      verificationLastSent: new Date(),
      verificationAttempts: 0,
    })

    const formattedPhone = formatPhone(phone)
    console.log(`Sending SMS to: ${formattedPhone} (raw: ${phone})`)

    await twilioClient.messages.create({
      body: `Your Huddlefinder verification code is: ${pin}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to:   formattedPhone,
    })

    return NextResponse.json({
      success:     true,
      maskedPhone: maskPhone(phone),
    })

  } catch (err: any) {
    console.error('Send verification error:', err)
    if (err.code === 21211) {
      return NextResponse.json({ error: 'Invalid phone number on file for this venue' }, { status: 400 })
    }
    if (err.code === 21608) {
      return NextResponse.json({ error: 'This phone number cannot receive SMS messages' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 500 })
  }
}