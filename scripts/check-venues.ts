import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    }),
  })
}

const db = admin.firestore()

async function main() {
  console.log('🏟️  Huddlefinder — Venue Check\n')

  // Total count
  const all = await db.collection('venues').get()
  console.log(`Total venues: ${all.size}`)

  // By city
  const cities = ['Vancouver', 'Toronto', 'Calgary', 'Montreal']
  for (const city of cities) {
    const snap = await db.collection('venues').where('city', '==', city).get()
    console.log(`  ${city}: ${snap.size}`)
  }

  // By status
  const unclaimed = await db.collection('venues').where('status', '==', 'unclaimed').get()
  console.log(`\nUnclaimed: ${unclaimed.size}`)

  // Sports venues
  const sports = await db.collection('venues').where('goodForWatchingSports', '==', true).get()
  console.log(`Good for watching sports: ${sports.size}`)

  // High rated
  const highRated = await db.collection('venues').where('googleRating', '>=', 4.5).get()
  console.log(`Rating >= 4.5: ${highRated.size}`)

  // Sample — print first 3 venues
  console.log('\n📋 Sample venues:')
  all.docs.slice(0, 3).forEach(doc => {
    const v = doc.data()
    console.log(`\n  ${v.name} (${v.city})`)
    console.log(`    Rating:      ★${v.googleRating} (${v.googleReviewCount} reviews)`)
    console.log(`    Type:        ${v.venueType}`)
    console.log(`    Status:      ${v.status}`)
    console.log(`    Sports:      ${v.goodForWatchingSports}`)
    console.log(`    Amenities:   ${v.amenities?.join(', ')}`)
    console.log(`    Hours set:   ${Object.keys(v.hours ?? {}).length > 0}`)
    console.log(`    Location:    ${v.location?.latitude}, ${v.location?.longitude}`)
  })
}

main().catch(console.error)