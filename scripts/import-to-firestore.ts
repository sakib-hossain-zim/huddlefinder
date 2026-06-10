import * as path from 'path'
import * as dotenv from 'dotenv'

// Load env first before anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Debug — confirm vars are loaded
console.log('Project ID:', process.env.FIREBASE_ADMIN_PROJECT_ID)
console.log('Client Email:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
console.log('Private Key exists:', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY)

import * as admin from 'firebase-admin'
import * as fs from 'fs'

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
  const filePath = path.join(process.cwd(), 'scripts', 'test-venues.json')

  if (!fs.existsSync(filePath)) {
    console.error('❌ venues-to-import.json not found. Run npm run import:venues first.')
    process.exit(1)
  }

  const venues = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  console.log('\n🏟️  Huddlefinder — Firestore Import')
  console.log('=====================================')
  console.log(`Importing ${venues.length} venues...\n`)

  let imported = 0
  let skipped  = 0
  let errors   = 0

  for (const venue of venues) {
    try {
      // Check for duplicate googlePlaceId
      if (venue.googlePlaceId) {
        const existing = await db
          .collection('venues')
          .where('googlePlaceId', '==', venue.googlePlaceId)
          .limit(1)
          .get()

        if (!existing.empty) {
          console.log(`  ⏭  Skipping duplicate: ${venue.name} (${venue.city})`)
          skipped++
          continue
        }
      }

      // Check for duplicate slug and resolve collision
      const slugCheck = await db
        .collection('venues')
        .where('slug', '==', venue.slug)
        .limit(1)
        .get()

      if (!slugCheck.empty) {
        venue.slug = `${venue.slug}-2`
      }

      await db.collection('venues').add({
        ...venue,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      const sport = venue.goodForWatchingSports ? '📺' : '  '
      console.log(
        `  ✓ ${sport} ${venue.name} (${venue.city}) ` +
        `★${venue.googleRating} (${venue.googleReviewCount} reviews) — ${venue.venueType}`
      )
      imported++

      // Small delay to avoid Firestore rate limits
      await new Promise(r => setTimeout(r, 150))

    } catch (err) {
      console.error(`  ✗  Failed: ${venue.name}`, err)
      errors++
    }
  }

  console.log('\n=====================================')
  console.log(`✅ Import complete`)
  console.log(`   Imported: ${imported}`)
  console.log(`   Skipped:  ${skipped} (duplicates)`)
  console.log(`   Errors:   ${errors}`)
}

main().catch(err => {
  console.error('\n❌ Import failed:', err)
  process.exit(1)
})