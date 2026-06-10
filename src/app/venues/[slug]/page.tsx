import { notFound } from 'next/navigation'
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Venue } from '@/types/venue'
import type { VenueEvent } from '@/types/event'
import type { Metadata } from 'next'
import VenueProfileClient from './VenueProfileClient'

// ── Data fetching ─────────────────────────────────────────
async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const snap = await getDocs(query(
    collection(db, 'venues'),
    where('slug', '==', slug),
    limit(1)
  ))
  if (snap.empty) return null
  return { venueId: snap.docs[0].id, ...snap.docs[0].data() } as Venue
}

async function getVenueEvents(venueId: string): Promise<VenueEvent[]> {
  try {
    const snap = await getDocs(query(
      collection(db, 'events'),
      where('venueId', '==', venueId),
      where('status', '==', 'upcoming'),
      orderBy('startTime', 'asc'),
      limit(10)
    ))
    return snap.docs.map(d => ({ eventId: d.id, ...d.data() } as VenueEvent))
  } catch {
    return []
  }
}

// ── Metadata ──────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const venue    = await getVenueBySlug(slug)

  if (!venue) {
    return { title: 'Venue not found | Huddlefinder' }
  }

  return {
    title:       `${venue.name} — Watch Live Sport | Huddlefinder`,
    description: venue.description ||
      `Watch live sport at ${venue.name} in ${venue.city}. Find upcoming events, RSVP and buy tickets on Huddlefinder.`,
    openGraph: {
      title:  venue.name,
      images: venue.coverPhoto ? [venue.coverPhoto] : [],
    },
  }
}

// ── Page ──────────────────────────────────────────────────
export default async function VenuePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const venue    = await getVenueBySlug(slug)
  if (!venue) notFound()

  const events = await getVenueEvents(venue.venueId)

  // Serialize — convert Firestore Timestamps to plain values
  const serializedVenue = JSON.parse(JSON.stringify(venue))
  const serializedEvents = JSON.parse(JSON.stringify(events))

  return (
    <VenueProfileClient
      venue={serializedVenue}
      events={serializedEvents}
    />
  )
}