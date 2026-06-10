'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { Venue, VenueType } from '@/types/venue'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  ChevronLeftIcon,
  PhotoIcon,
  ClockIcon,
  SparklesIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

const SPORTS = [
  { value: 'football',  label: 'Football',  emoji: '⚽' },
  { value: 'nfl',       label: 'NFL',        emoji: '🏈' },
  { value: 'nhl',       label: 'NHL',        emoji: '🏒' },
  { value: 'nba',       label: 'NBA',        emoji: '🏀' },
  { value: 'rugby',     label: 'Rugby',      emoji: '🏉' },
  { value: 'tennis',    label: 'Tennis',     emoji: '🎾' },
  { value: 'f1',        label: 'Formula 1',  emoji: '🏎️' },
  { value: 'cricket',   label: 'Cricket',    emoji: '🏏' },
  { value: 'world-cup', label: 'World Cup',  emoji: '🏆' },
]

const AMENITIES = [
  { value: 'big_screens',    label: 'Big screens'       },
  { value: 'patio',          label: 'Patio / outdoor'   },
  { value: 'kitchen',        label: 'Full kitchen'      },
  { value: 'pool_table',     label: 'Pool table'        },
  { value: 'private_rooms',  label: 'Private rooms'     },
  { value: 'wheelchair',     label: 'Wheelchair access' },
  { value: 'parking',        label: 'Parking available' },
  { value: 'happy_hour',     label: 'Happy hour deals'  },
  { value: 'live_dj',        label: 'Live DJ'           },
  { value: 'group_friendly', label: 'Good for groups'   },
  { value: 'cocktails',      label: 'Cocktails'         },
  { value: 'reservations',   label: 'Reservations'      },
  { value: 'takeout',        label: 'Takeout'           },
  { value: 'delivery',       label: 'Delivery'          },
]

const VENUE_TYPES = [
  { value: 'bar',          label: 'Sports Bar',   emoji: '🍺' },
  { value: 'restaurant',   label: 'Restaurant',   emoji: '🍽️' },
  { value: 'pub',          label: 'Pub',          emoji: '🍻' },
  { value: 'rooftop',      label: 'Rooftop',      emoji: '🏙️' },
  { value: 'open_viewing', label: 'Open Viewing', emoji: '📺' },
  { value: 'club',         label: 'Club',         emoji: '🎶' },
  { value: 'hotel_bar',    label: 'Hotel Bar',    emoji: '🏨' },
  { value: 'other',        label: 'Other',        emoji: '📍' },
]

const DAYS = [
  'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday', 'Sunday',
]

const DEFAULT_HOURS = DAYS.reduce((acc, day) => ({
  ...acc,
  [day]: { open: '11:00', close: '23:00', closed: false }
}), {} as Record<string, { open: string; close: string; closed: boolean }>)

type TabType = 'profile' | 'photos' | 'hours' | 'contact'

export default function VenueSettingsPage() {
  const router      = useRouter()
  const { userDoc } = useAuth()

  const [venue,   setVenue]   = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState<TabType>('profile')

  const { toasts, toast, closeToast } = useToast()

  // Profile fields
  const [venueName,   setVenueName]   = useState('')
  const [venueType,   setVenueType]   = useState<VenueType | ''>('')
  const [description, setDescription] = useState('')
  const [sports,      setSports]      = useState<string[]>([])
  const [amenities,   setAmenities]   = useState<string[]>([])

  // Contact fields
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [website,   setWebsite]   = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook,  setFacebook]  = useState('')

  // Hours
  const [hours, setHours] = useState(DEFAULT_HOURS)

  // Photos
  const [coverPhoto,    setCoverPhoto]    = useState('')
  const [photos,        setPhotos]        = useState<string[]>([])
  const [coverFile,     setCoverFile]     = useState<File | null>(null)
  const [coverPreview,  setCoverPreview]  = useState('')
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  useEffect(() => {
    if (userDoc?.venueId) fetchVenue(userDoc.venueId)
  }, [userDoc])

  async function fetchVenue(venueId: string) {
    setLoading(false)
    try {
      const snap = await getDoc(doc(db, 'venues', venueId))
      if (!snap.exists()) return
      const data = { venueId: snap.id, ...snap.data() } as Venue
      setVenue(data)

      // Populate fields
      setVenueName(data.name ?? '')
      setVenueType(data.venueType ?? '')
      setDescription(data.description ?? '')
      setSports(data.sports ?? [])
      setAmenities(data.amenities ?? [])
      setPhone(data.phone ?? '')
      setEmail(data.email ?? '')
      setWebsite(data.website ?? '')
      setInstagram(data.social?.instagram ?? '')
      setFacebook(data.social?.facebook ?? '')
      setCoverPhoto(data.coverPhoto ?? '')
      setPhotos(data.photos ?? [])

      // Build hours state from existing data
      const existingHours = data.hours ?? {}
      const builtHours    = DAYS.reduce((acc, day) => ({
        ...acc,
        [day]: existingHours[day]
          ? { open: existingHours[day].open, close: existingHours[day].close, closed: false }
          : { open: '11:00', close: '23:00', closed: true }
      }), {} as Record<string, { open: string; close: string; closed: boolean }>)
      setHours(builtHours)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Photo handlers ────────────────────────────────────
  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function handleNewPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files    = Array.from(e.target.files ?? [])
    const maxNew   = 5 - photos.length - newPhotoFiles.length
    const accepted = files.slice(0, maxNew)
    setNewPhotoFiles(prev => [...prev, ...accepted])
    setNewPhotoPreviews(prev => [
      ...prev,
      ...accepted.map(f => URL.createObjectURL(f)),
    ])
  }

  function removeExistingPhoto(url: string) {
    setPhotos(prev => prev.filter(p => p !== url))
    if (url === coverPhoto) setCoverPhoto('')
  }

  function removeNewPhoto(index: number) {
    setNewPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setNewPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  function setAsCover(url: string) {
    setCoverPhoto(url)
  }

  async function uploadPhotos(venueId: string): Promise<{ cover: string; gallery: string[] }> {
    let coverUrl = coverPhoto

    // Upload new cover if changed
    if (coverFile) {
      const coverRef = ref(storage, `venues/${venueId}/cover_${Date.now()}`)
      await uploadBytes(coverRef, coverFile)
      coverUrl = await getDownloadURL(coverRef)
    }

    // Upload new gallery photos
    const newUrls: string[] = []
    for (const file of newPhotoFiles) {
      const photoRef = ref(storage, `venues/${venueId}/gallery_${Date.now()}_${Math.random()}`)
      await uploadBytes(photoRef, file)
      const url = await getDownloadURL(photoRef)
      newUrls.push(url)
    }

    return {
      cover:   coverUrl,
      gallery: [...photos, ...newUrls],
    }
  }

  // ── Save ─────────────────────────────────────────────
  async function handleSave() {
    if (!venue || !userDoc?.venueId) return
    if (!venueName.trim()) { setError('Venue name is required'); return }

    setSaving(true)
    setError('')

    try {
      // Upload photos if any
      setUploadingPhotos(true)
      const { cover, gallery } = await uploadPhotos(venue.venueId)
      setUploadingPhotos(false)

      // Build hours for Firestore — only include open days
      const formattedHours = DAYS.reduce((acc, day) => {
        if (!hours[day]?.closed) {
          acc[day] = { open: hours[day].open, close: hours[day].close }
        }
        return acc
      }, {} as Record<string, { open: string; close: string }>)

      await updateDoc(doc(db, 'venues', venue.venueId), {
        name:        venueName.trim(),
        venueType,
        description: description.trim(),
        sports,
        amenities,
        phone:       phone.trim(),
        email:       email.trim(),
        website:     website.trim(),
        social: {
          instagram: instagram.trim(),
          facebook:  facebook.trim(),
        },
        hours:       formattedHours,
        coverPhoto:  cover,
        photos:      gallery,
        updatedAt:   new Date(),
      })

      // Update local state
      setCoverPhoto(cover)
      setPhotos(gallery)
      setCoverFile(null)
      setCoverPreview('')
      setNewPhotoFiles([])
      setNewPhotoPreviews([])

     // setSaved(true)
     // setTimeout(() => setSaved(false), 3000)
     toast.success('Changes saved successfully')
    } catch (err) {
      console.error(err)
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
      setUploadingPhotos(false)
    }
  }

  function updateHours(
    day: string,
    field: 'open' | 'close' | 'closed',
    value: string | boolean
  ) {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  function toggleSport(sport: string) {
    setSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    )
  }

  function toggleAmenity(amenity: string) {
    setAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const TABS: { key: TabType; label: string }[] = [
    { key: 'profile', label: 'Profile'  },
    { key: 'photos',  label: 'Photos'   },
    { key: 'hours',   label: 'Hours'    },
    { key: 'contact', label: 'Contact'  },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/venue-dashboard')}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-charcoal">Venue settings</h1>
            <p className="text-sm text-gray-400 mt-1">{venue?.name}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0',
                tab === t.key
                  ? 'bg-brand-red text-white'
                  : 'text-gray-500 hover:text-brand-charcoal'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <div className="space-y-4">

            {/* Venue name */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-brand-charcoal mb-4">
                Basic info
              </h2>
              <div className="space-y-4">
                <Input
                  label="Venue name"
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  placeholder="e.g. The Blarney Stone"
                />

                {/* Venue type */}
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                    Venue type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VENUE_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setVenueType(type.value as VenueType)}
                        className={clsx(
                          'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                          venueType === type.value
                            ? 'border-brand-red bg-brand-red-light'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <span className="text-xl">{type.emoji}</span>
                        <span className={clsx(
                          'text-xs font-semibold text-center',
                          venueType === type.value ? 'text-brand-red' : 'text-gray-600'
                        )}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                    About your venue
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell fans what makes your venue the best place to watch sport..."
                    rows={4}
                    maxLength={500}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">
                    {description.length}/500
                  </p>
                </div>
              </div>
            </div>

            {/* Sports */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-brand-charcoal mb-1">
                Sports shown
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Select all sports you regularly show
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPORTS.map(sport => (
                  <button
                    key={sport.value}
                    onClick={() => toggleSport(sport.value)}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left',
                      sports.includes(sport.value)
                        ? 'border-brand-red bg-brand-red-light'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-lg">{sport.emoji}</span>
                    <span className={clsx(
                      'text-sm font-semibold',
                      sports.includes(sport.value) ? 'text-brand-red' : 'text-gray-600'
                    )}>
                      {sport.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-brand-charcoal mb-1">
                Amenities
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                What does your venue offer?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map(amenity => (
                  <button
                    key={amenity.value}
                    onClick={() => toggleAmenity(amenity.value)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left',
                      amenities.includes(amenity.value)
                        ? 'border-brand-red bg-brand-red-light'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={clsx(
                      'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                      amenities.includes(amenity.value)
                        ? 'border-brand-red bg-brand-red'
                        : 'border-gray-300'
                    )}>
                      {amenities.includes(amenity.value) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={clsx(
                      'text-sm font-medium',
                      amenities.includes(amenity.value) ? 'text-brand-red' : 'text-gray-600'
                    )}>
                      {amenity.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Photos tab ── */}
        {tab === 'photos' && (
          <div className="space-y-4">

            {/* Cover photo */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-brand-charcoal mb-1 flex items-center gap-2">
                <PhotoIcon className="w-4 h-4 text-brand-red" />
                Cover photo
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                This is the main photo fans see on your venue card
              </p>
              <label className="block cursor-pointer">
                {coverPreview || coverPhoto ? (
                  <div className="relative h-48 rounded-xl overflow-hidden">
                    <img
                      src={coverPreview || coverPhoto}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-semibold">Change photo</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-brand-red hover:bg-brand-red-light transition-all">
                    <PhotoIcon className="w-8 h-8 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-400">Upload cover photo</p>
                    <p className="text-xs text-gray-300">JPG or PNG, max 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Gallery */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-brand-charcoal mb-1 flex items-center gap-2">
                <PhotoIcon className="w-4 h-4 text-brand-red" />
                Gallery
                <span className="text-xs text-gray-400 font-normal">
                  ({photos.length + newPhotoFiles.length}/5)
                </span>
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Show fans what your venue looks like on match day. Tap ★ to set as cover.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {/* Existing photos */}
                {photos.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={() => setAsCover(url)}
                        className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold"
                        title="Set as cover"
                      >
                        ★
                      </button>
                    </div>
                    <button
                      onClick={() => removeExistingPhoto(url)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <XMarkIcon className="w-4 h-4 text-white" />
                    </button>
                    {url === coverPhoto && (
                      <div className="absolute bottom-1 left-1 bg-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                        Cover
                      </div>
                    )}
                  </div>
                ))}

                {/* New photo previews */}
                {newPhotoPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      New
                    </div>
                    <button
                      onClick={() => removeNewPhoto(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <XMarkIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}

                {/* Add photo button */}
                {(photos.length + newPhotoFiles.length) < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-red hover:bg-brand-red-light transition-all">
                    <PlusIcon className="w-6 h-6 text-gray-300" />
                    <span className="text-xs text-gray-300 mt-1">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleNewPhotos}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Hours tab ── */}
        {tab === 'hours' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-brand-charcoal mb-1 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-brand-red" />
              Opening hours
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Toggle days you are closed
            </p>
            <div className="space-y-3">
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-brand-charcoal w-24 flex-shrink-0">
                    {day.slice(0, 3)}
                  </span>

                  {hours[day]?.closed ? (
                    <span className="text-sm text-gray-400 flex-1">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={hours[day]?.open ?? '11:00'}
                        onChange={e => updateHours(day, 'open', e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-brand-red min-w-0"
                      />
                      <span className="text-gray-400 text-xs flex-shrink-0">to</span>
                      <input
                        type="time"
                        value={hours[day]?.close ?? '23:00'}
                        onChange={e => updateHours(day, 'close', e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-brand-red min-w-0"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => updateHours(day, 'closed', !hours[day]?.closed)}
                    className={clsx(
                      'text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0',
                      hours[day]?.closed
                        ? 'border-brand-red text-brand-red bg-brand-red-light'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    )}
                  >
                    {hours[day]?.closed ? 'Closed' : 'Open'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Contact tab ── */}
        {tab === 'contact' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-brand-charcoal">
                Contact details
              </h2>
              <Input
                label="Phone number"
                type="tel"
                placeholder="e.g. +1 604 555 0123"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                leftIcon={<PhoneIcon className="w-4 h-4" />}
              />
              <Input
                label="Venue email"
                type="email"
                placeholder="e.g. info@yourvenue.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                hint="Shown publicly to fans"
              />
              <Input
                label="Website"
                placeholder="https://yourvenue.com"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                leftIcon={<GlobeAltIcon className="w-4 h-4" />}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-brand-charcoal">
                Social links
              </h2>
              <Input
                label="Instagram"
                placeholder="@yourvenue"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                leftIcon={<span className="text-sm">📸</span>}
              />
              <Input
                label="Facebook"
                placeholder="facebook.com/yourvenue"
                value={facebook}
                onChange={e => setFacebook(e.target.value)}
                leftIcon={<span className="text-sm">👥</span>}
              />
            </div>
          </div>
        )}

        {/* ── Save button ── */}
        <div className="mt-6">
          <Button
            fullWidth
            size="lg"
            loading={saving}
            onClick={handleSave}
          >
            {uploadingPhotos
              ? 'Uploading photos...'
              : saving
              ? 'Saving...'
              : saved
              ? '✓ Saved'
              : 'Save changes'}
          </Button>
        </div>

        {/* ── Save toast ── */}
        {/* {saved && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <div className="flex items-center gap-2.5 bg-brand-charcoal text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
              Changes saved successfully
            </div>
          </div>
        )} */}
        <ToastContainer toasts={toasts} onClose={closeToast} />

      </div>
    </div>
  )
}