'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Stepper from '@/components/ui/Stepper'
import {
  PhotoIcon,
  ClockIcon,
  SparklesIcon,
  XMarkIcon,
  PlusIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const STEPS = [
  { number: 1, label: 'Claim'    },
  { number: 2, label: 'Verify'   },
  { number: 3, label: 'Profile'  },
  { number: 4, label: 'Plan'     },
  { number: 5, label: 'Payments' },
]

const SPORTS = [
  { value: 'football',  label: 'Football',    emoji: '⚽' },
  { value: 'nfl',       label: 'NFL',         emoji: '🏈' },
  { value: 'nhl',       label: 'NHL',         emoji: '🏒' },
  { value: 'nba',       label: 'NBA',         emoji: '🏀' },
  { value: 'rugby',     label: 'Rugby',       emoji: '🏉' },
  { value: 'tennis',    label: 'Tennis',      emoji: '🎾' },
  { value: 'f1',        label: 'Formula 1',   emoji: '🏎️' },
  { value: 'cricket',   label: 'Cricket',     emoji: '🏏' },
  { value: 'world-cup', label: 'World Cup',   emoji: '🏆' },
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
  { value: 'karaoke',        label: 'Karaoke'           },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_HOURS = DAYS.reduce((acc, day) => ({
  ...acc,
  [day]: { open: '11:00', close: '23:00', closed: false }
}), {} as Record<string, { open: string; close: string; closed: boolean }>)

export default function OnboardingProfilePage() {
  const router = useRouter()

  const [venueId,     setVenueId]     = useState('')
  const [description, setDescription] = useState('')
  const [sports,      setSports]      = useState<string[]>([])
  const [amenities,   setAmenities]   = useState<string[]>([])
  const [hours,       setHours]       = useState(DEFAULT_HOURS)
  const [instagram,   setInstagram]   = useState('')
  const [facebook,    setFacebook]    = useState('')
  const [website,     setWebsite]     = useState('')
  const [coverPhoto,  setCoverPhoto]  = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [photos,      setPhotos]      = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    const id = localStorage.getItem('onboarding_venue_id')
    if (!id) { router.replace('/onboarding/claim'); return }
    setVenueId(id)
  }, [router])

  // ── Photo handlers ────────────────────────────────────
  function handleCoverPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverPhoto(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = 9 - photos.length
    const newFiles = files.slice(0, remaining)
    setPhotos(prev => [...prev, ...newFiles])
    setPhotoPreviews(prev => [
      ...prev,
      ...newFiles.map(f => URL.createObjectURL(f))
    ])
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // ── Sport toggle ──────────────────────────────────────
  function toggleSport(sport: string) {
    setSports(prev =>
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    )
  }

  // ── Amenity toggle ────────────────────────────────────
  function toggleAmenity(amenity: string) {
    setAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    )
  }

  // ── Hours ─────────────────────────────────────────────
  function updateHours(day: string, field: 'open' | 'close' | 'closed', value: string | boolean) {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  // ── Upload photos to Firebase Storage ─────────────────
  async function uploadPhotos(venueId: string): Promise<{ cover: string; gallery: string[] }> {
    let coverUrl = ''
    const galleryUrls: string[] = []

    if (coverPhoto) {
      const coverRef = ref(storage, `venues/${venueId}/cover_${Date.now()}`)
      await uploadBytes(coverRef, coverPhoto)
      coverUrl = await getDownloadURL(coverRef)
    }

    for (const photo of photos) {
      const photoRef = ref(storage, `venues/${venueId}/gallery_${Date.now()}_${Math.random()}`)
      await uploadBytes(photoRef, photo)
      const url = await getDownloadURL(photoRef)
      galleryUrls.push(url)
    }

    return { cover: coverUrl, gallery: galleryUrls }
  }

  // ── Submit ────────────────────────────────────────────
  async function handleSave() {
    if (!venueId) return
    if (sports.length === 0) {
      setError('Please select at least one sport')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { cover, gallery } = await uploadPhotos(venueId)

      // Format hours for Firestore
      const formattedHours = Object.entries(hours).reduce((acc, [day, val]) => {
        if (!val.closed) {
          acc[day] = { open: val.open, close: val.close }
        }
        return acc
      }, {} as Record<string, { open: string; close: string }>)

      await updateDoc(doc(db, 'venues', venueId), {
        description: description.trim(),
        sports,
        amenities,
        hours:       formattedHours,
        social: {
          instagram: instagram.trim(),
          facebook:  facebook.trim(),
        },
        website:    website.trim(),
        coverPhoto: cover,
        photos:     gallery,
        updatedAt:  new Date(),
      })

      router.push('/onboarding/plan')
    } catch (err) {
      console.error(err)
      setError('Something went wrong saving your profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Stepper steps={STEPS} currentStep={3} />

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-brand-charcoal transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back
      </button>
      
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-red-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          <SparklesIcon className="w-7 h-7 text-brand-red" />
        </div>
        <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
          Complete your profile
        </h1>
        <p className="text-gray-400 text-sm">
          A complete profile attracts more fans
        </p>
      </div>

      <div className="space-y-5">

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Cover photo ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-brand-charcoal mb-4 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-brand-red" />
            Cover photo
          </h2>

          <label className="block cursor-pointer">
            {coverPreview ? (
              <div className="relative h-48 rounded-xl overflow-hidden">
                <img
                  src={coverPreview}
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
              onChange={handleCoverPhoto}
              className="hidden"
            />
          </label>
        </div>

        {/* ── Gallery photos ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-brand-charcoal mb-1 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-brand-red" />
            Gallery photos
            <span className="text-xs text-gray-400 font-normal">({photos.length}/9)</span>
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Show fans what your venue looks like on match day
          </p>

          <div className="grid grid-cols-3 gap-2">
            {photoPreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <XMarkIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}

            {photos.length < 9 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-red hover:bg-brand-red-light transition-all">
                <PlusIcon className="w-6 h-6 text-gray-300" />
                <span className="text-xs text-gray-300 mt-1">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotos}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* ── Description ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-brand-charcoal mb-4">
            About your venue
          </h2>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell fans what makes your venue the best place to watch sport. What's the atmosphere like? What screens do you have? Any special match day deals?"
            rows={4}
            maxLength={500}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {description.length}/500
          </p>
        </div>

        {/* ── Sports shown ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-brand-charcoal mb-1">
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
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-200 text-left',
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

        {/* ── Amenities ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-brand-charcoal mb-1">
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
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-200 text-left',
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

        {/* ── Opening hours ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-brand-charcoal mb-1 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-brand-red" />
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

        {/* ── Social links ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-brand-charcoal mb-4">
            Social links
            <span className="text-xs text-gray-400 font-normal ml-2">Optional</span>
          </h2>
          <div className="space-y-3">
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
            <Input
              label="Website"
              placeholder="https://yourvenue.com"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              leftIcon={<span className="text-sm">🌐</span>}
            />
          </div>
        </div>

        {/* ── Save button ── */}
        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={handleSave}
        >
          {loading ? 'Saving profile...' : 'Save and continue'}
        </Button>

        <button
          onClick={() => router.push('/onboarding/plan')}
          className="w-full text-center text-sm text-gray-400 hover:text-brand-charcoal transition-colors py-2 mb-8"
        >
          Skip for now — complete later from dashboard
        </button>

      </div>
    </div>
  )
}