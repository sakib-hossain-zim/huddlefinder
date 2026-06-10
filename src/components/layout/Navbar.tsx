'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { STRINGS } from '@/utils/strings'
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  PlayCircleIcon,
  CalendarDaysIcon,
  TicketIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  TicketIcon as TicketIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  BuildingStorefrontIcon as BuildingStorefrontIconSolid,
} from '@heroicons/react/24/solid'

export default function Navbar() {
  const { user, userDoc, logOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [city,             setCity]             = useState('')
  const [sport,            setSport]            = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (city)  params.set('city',  city)
    if (sport) params.set('sport', sport)
    router.push(`/search?${params.toString()}`)
    setMobileSearchOpen(false)
    setCity('')
    setSport('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const isActive = (path: string) => pathname === path

  function handleListVenue() {
    if (!user) {
      router.push('/auth/signup?role=venue_owner')
    } else if (userDoc?.role === 'venue_owner') {
      router.push(userDoc.venueId ? '/venue-dashboard' : '/onboarding/claim')
    } else {
      router.push('/auth/signup?role=venue_owner')
    }
  }

  const sports = [
    { value: '',          label: STRINGS.anySport,  emoji: '🏟️' },
    { value: 'football',  label: 'Football',         emoji: '⚽' },
    { value: 'nfl',       label: 'NFL',              emoji: '🏈' },
    { value: 'nhl',       label: 'NHL Hockey',       emoji: '🏒' },
    { value: 'nba',       label: 'NBA Basketball',   emoji: '🏀' },
    { value: 'rugby',     label: 'Rugby',            emoji: '🏉' },
    { value: 'tennis',    label: 'Tennis',           emoji: '🎾' },
    { value: 'f1',        label: 'Formula 1',        emoji: '🏎️' },
    { value: 'cricket',   label: 'Cricket',          emoji: '🏏' },
  ]

  return (
    <>
      <nav className="bg-white shadow-sm sticky top-0 z-50">

        {/* ── DESKTOP navbar — unchanged ── */}
        <div className="hidden md:flex items-center justify-between h-24 px-6 lg:px-12 gap-6">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <img src="/logo.svg" alt={STRINGS.appName} className="h-20 w-auto" />
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-xl">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-2 py-1.5 hover:border-brand-red hover:shadow-md transition-all duration-200">
              <div className="flex items-center flex-1 px-3 gap-2">
                <MapPinIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={STRINGS.searchPlaceholder}
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
                />
              </div>
              <div className="w-px h-5 bg-gray-300 flex-shrink-0" />
              <div className="flex items-center flex-1 px-3 gap-2">
                <PlayCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={sport}
                  onChange={e => setSport(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 outline-none w-full cursor-pointer appearance-none"
                >
                  {sports.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.emoji} {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleSearch} className="btn-primary p-2.5 rounded-full">
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link
              href="/"
              className={`text-sm font-semibold transition-colors ${
                isActive('/') ? 'text-brand-red' : 'text-gray-500 hover:text-brand-red'
              }`}
            >
              Home
            </Link>
            {user ? (
              <>
                <Link
                  href={userDoc?.role === 'venue_owner' ? '/venue-dashboard' : '/dashboard'}
                  className="btn-ghost"
                >
                  {STRINGS.dashboard}
                </Link>
                <button onClick={logOut} className="btn-secondary">
                  {STRINGS.signOut}
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost">{STRINGS.signIn}</Link>
                <button onClick={handleListVenue} className="btn-primary">
                  {STRINGS.listYourVenue}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── MOBILE top bar ── */}
        <div className="md:hidden">
          {!mobileSearchOpen ? (
            // ── Collapsed: search pill only
            // Logo lives in home page hero on mobile
            <div className="px-3 py-2">
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="w-full flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 shadow-sm active:scale-[0.98] transition-transform"
              >
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">
                    {city
                      ? `${city}${sport ? ` · ${sports.find(s => s.value === sport)?.label}` : ''}`
                      : `${STRINGS.anywhere} · ${STRINGS.anySport}`
                    }
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                  {STRINGS.searchSubtext}
                </span>
              </button>
            </div>

          ) : (
            // ── Expanded search panel ──
            <div className="px-3 pt-2 pb-3 bg-white border-b border-gray-100 shadow-md">

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt={STRINGS.appName} className="h-7 w-auto" />
                  <p className="text-sm font-bold text-brand-charcoal">
                    Find where the game is on
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMobileSearchOpen(false)
                    setCity('')
                    setSport('')
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* City input */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-2">
                <MapPinIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Which city? e.g. Vancouver"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
                />
                {city && (
                  <button onClick={() => setCity('')}>
                    <XMarkIcon className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Sport grid */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {sports.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSport(option.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                      sport === option.value
                        ? 'bg-brand-red text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base leading-none">{option.emoji}</span>
                    <span className={`text-xs font-semibold truncate ${
                      sport === option.value ? 'text-white' : 'text-gray-600'
                    }`}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search button */}
              <button
                onClick={handleSearch}
                className="w-full btn-primary py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                Search
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── MOBILE bottom bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
        <div
          className="flex items-center justify-around py-2"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] ${
              isActive('/') ? 'text-brand-red' : 'text-gray-400'
            }`}
          >
            {isActive('/')
              ? <MagnifyingGlassIconSolid className="w-6 h-6" />
              : <MagnifyingGlassIcon className="w-6 h-6" />
            }
            <span className="text-[10px] font-semibold">{STRINGS.discover}</span>
          </Link>

          <Link
            href="/search"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] ${
              isActive('/search') ? 'text-brand-red' : 'text-gray-400'
            }`}
          >
            {isActive('/search')
              ? <CalendarDaysIconSolid className="w-6 h-6" />
              : <CalendarDaysIcon className="w-6 h-6" />
            }
            <span className="text-[10px] font-semibold">{STRINGS.events}</span>
          </Link>

          {user && userDoc?.role === 'fan' && (
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] ${
                isActive('/dashboard') ? 'text-brand-red' : 'text-gray-400'
              }`}
            >
              {isActive('/dashboard')
                ? <TicketIconSolid className="w-6 h-6" />
                : <TicketIcon className="w-6 h-6" />
              }
              <span className="text-[10px] font-semibold">{STRINGS.myRsvps}</span>
            </Link>
          )}

          {(!user || userDoc?.role === 'venue_owner') && (
            <button
              onClick={handleListVenue}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] ${
              (userDoc?.role === 'venue_owner' &&
              pathname.startsWith('/venue-dashboard') &&
              !pathname.includes('/profile'))
              ||
              (!user && (
                pathname === '/auth/signup' ||
                //pathname === '/auth/login' ||
                pathname.startsWith('/onboarding')
              ))
                ? 'text-brand-red'
                : 'text-gray-400'
            }`}
            >
              {(userDoc?.role === 'venue_owner' &&
                  pathname.startsWith('/venue-dashboard') &&
                  !pathname.includes('/profile'))
                ||
                (!user && (
                  pathname === '/auth/signup' ||
                  //pathname === '/auth/login' ||
                  pathname.startsWith('/onboarding')
                ))
                  ? <BuildingStorefrontIconSolid className="w-6 h-6" />
                  : <BuildingStorefrontIcon className="w-6 h-6" />
              }
              <span className="text-[10px] font-semibold whitespace-nowrap">
                {userDoc?.role === 'venue_owner' ? 'My venue' : 'List venue'}
              </span>
            </button>
          )}

          {user ? (
            <Link
              href={userDoc?.role === 'venue_owner' ? '/venue-dashboard/profile' : '/dashboard/profile'}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] ${
                pathname.includes('/profile') ? 'text-brand-red' : 'text-gray-400'
              }`}
            >
              {pathname.includes('/profile')
                ? <UserCircleIconSolid className="w-6 h-6" />
                : <UserCircleIcon className="w-6 h-6" />
              }
              <span className="text-[10px] font-semibold">{STRINGS.profile}</span>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] ${
                isActive('/auth/login') ? 'text-brand-red' : 'text-gray-400'
              }`}
            >
              {isActive('/auth/login')
                ? <UserCircleIconSolid className="w-6 h-6" />
                : <UserCircleIcon className="w-6 h-6" />
              }
              <span className="text-[10px] font-semibold">{STRINGS.logIn}</span>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}