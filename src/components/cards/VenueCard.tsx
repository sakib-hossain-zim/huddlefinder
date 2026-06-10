import Link from 'next/link'
import { Venue } from '@/types/venue'
import SportPill from '@/components/ui/SportPill'
import { STRINGS, getVenueTypeEmoji } from '@/utils/strings'
import { clsx } from 'clsx'
import {
  CalendarDaysIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface VenueCardProps {
  bar:      Venue
  variant?: 'default' | 'compact'
}

function safeRating(rating?: number, reviewCount?: number): React.ReactNode {
  if (!rating || rating <= 0) return null
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <StarIconSolid className="w-3.5 h-3.5 text-yellow-400" />
      <span className="text-sm font-bold text-brand-charcoal">
        {rating.toFixed(1)}
      </span>
      {reviewCount != null && reviewCount > 0 && (
        <span className="text-xs text-gray-400 ml-0.5">({reviewCount})</span>
      )}
    </div>
  )
}

function safeEventCount(totalEvents?: number): string {
  if (!totalEvents || totalEvents <= 0) return 'New venue'
  return `${totalEvents} events hosted`
}

function safeAddress(address?: string, city?: string): string {
  const parts = [address, city].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Address not available'
}

function safeSports(sports?: string[]): string[] {
  if (!sports || !Array.isArray(sports)) return []
  return sports.filter(Boolean)
}

function isPro(bar: Venue): boolean {
  return bar.plan === 'pro' && !!bar.verified
}

function isStarter(bar: Venue): boolean {
  return bar.plan === 'starter' && !!bar.verified
}

export default function VenueCard({ bar, variant = 'default' }: VenueCardProps) {
  if (!bar) return null

  const slug       = bar.slug    ?? bar.venueId ?? ''
  const name       = bar.name    ?? 'Unknown Venue'
  const sports     = safeSports(bar.sports)
  const address    = safeAddress(bar.address, bar.city)
  const venueEmoji = bar.venueType ? getVenueTypeEmoji(bar.venueType) : '🍺'

  // ── Compact variant — unchanged ──────────────────────
  if (variant === 'compact') {
    return (
      <Link href={`/venues/${slug}`}>
        <div className={clsx(
          'flex items-center gap-3 p-3 rounded-2xl transition-colors active:scale-[0.98]',
          isPro(bar)
            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100'
            : isStarter(bar)
              ? 'hover:bg-brand-red-light'
              : 'hover:bg-gray-50'
        )}>
          <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
            {bar.coverPhoto ? (
              <img src={bar.coverPhoto} alt={name} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl bg-brand-charcoal-light">
                {venueEmoji}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-semibold text-brand-charcoal truncate">{name}</p>
              {isPro(bar) && (
                <span className="text-xs bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">⭐</span>
              )}
              {isStarter(bar) && (
                <span className="text-xs bg-brand-red text-white px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">↑</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {bar.city ?? 'Location unknown'}
              {sports.length > 0 && ` · ${sports.slice(0, 2).join(', ')}`}
            </p>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
        </div>
      </Link>
    )
  }

  // ── Pro card ─────────────────────────────────────────
  if (isPro(bar)) {
    return (
      <Link href={`/venues/${slug}`} className="block h-full">
        <div className="relative h-full rounded-2xl p-[2px] bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-300 shadow-lg shadow-yellow-200/60 hover:shadow-xl hover:shadow-yellow-300/60 transition-all duration-300 active:scale-[0.98]">
          <div className="bg-white rounded-[14px] overflow-hidden flex flex-col h-full group">

            {/* ── Image: h-36 mobile, h-44 desktop ── */}
            <div className="relative h-36 md:h-44 bg-gradient-to-br from-brand-charcoal to-gray-600 overflow-hidden flex-shrink-0">
              {bar.coverPhoto ? (
                <img src={bar.coverPhoto} alt={name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-brand-charcoal-light">
                  {venueEmoji}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              {bar.venueType && (
                <div className="absolute top-3 left-3 bg-white/90 text-brand-charcoal text-xs font-bold px-2.5 py-1 rounded-full">
                  {venueEmoji} {STRINGS.venueTypes[bar.venueType]?.label ?? STRINGS.Venue}
                </div>
              )}
              <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                ⭐ Featured
              </div>
              <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-xs font-bold tracking-wider uppercase opacity-90">
                  ✦ Huddlefinder Featured Venue
                </p>
              </div>
            </div>

            {/* ── Body: p-3 mobile, p-4 desktop ── */}
            <div className="p-3 md:p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-1">
                {/* ── Name: no min-h mobile, has min-h desktop ── */}
                <h3 className="font-bold text-brand-charcoal text-sm md:text-base leading-snug line-clamp-2 md:min-h-[2.75rem] flex-1 group-hover:text-amber-600 transition-colors">
                  {name}
                </h3>
                {safeRating(bar.rating, bar.reviewCount)}
              </div>

              {/* ── Address: text-xs mobile, text-sm desktop ── */}
              <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3 truncate">{address}</p>

              {/* ── Sports: 2 on mobile, 3 on desktop ── */}
              <div className="flex flex-wrap gap-1 md:gap-1.5 mb-2 md:mb-3 md:min-h-[1.75rem]">
                {sports.slice(0, 2).map(sport => (
                  <SportPill key={sport} sport={sport} size="sm" />
                ))}
                {/* Show 3rd pill only on desktop */}
                {sports.length > 2 && (
                  <span className="hidden md:inline">
                    <SportPill sport={sports[2]} size="sm" />
                  </span>
                )}
                {sports.length > 3 && (
                  <span className="text-xs text-gray-400 self-center hidden md:inline">
                    +{sports.length - 3} more
                  </span>
                )}
                {sports.length > 2 && (
                  <span className="text-xs text-gray-400 self-center md:hidden">
                    +{sports.length - 2} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-yellow-100 mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  <span>{safeEventCount(bar.totalEvents)}</span>
                </div>
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  View venue →
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // ── Starter card ─────────────────────────────────────
  if (isStarter(bar)) {
    return (
      <Link href={`/venues/${slug}`} className="block h-full">
        <div className="relative h-full rounded-2xl p-[1.5px] bg-gradient-to-br from-brand-red/60 to-brand-red/30 shadow-md shadow-red-100/60 hover:shadow-lg hover:shadow-red-200/60 transition-all duration-300 active:scale-[0.98]">
          <div className="bg-white rounded-[14px] overflow-hidden flex flex-col h-full group">

            <div className="relative h-36 md:h-44 bg-gradient-to-br from-brand-charcoal to-gray-600 overflow-hidden flex-shrink-0">
              {bar.coverPhoto ? (
                <img src={bar.coverPhoto} alt={name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-brand-charcoal-light">
                  {venueEmoji}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              {bar.venueType && (
                <div className="absolute top-3 left-3 bg-white/90 text-brand-charcoal text-xs font-bold px-2.5 py-1 rounded-full">
                  {venueEmoji} {STRINGS.venueTypes[bar.venueType]?.label ?? STRINGS.Venue}
                </div>
              )}
              <div className="absolute top-3 right-3 bg-brand-red text-white text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                ↑ Priority
              </div>
            </div>

            <div className="p-3 md:p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-brand-charcoal text-sm md:text-base leading-snug line-clamp-2 md:min-h-[2.75rem] flex-1 group-hover:text-brand-red transition-colors">
                  {name}
                </h3>
                {safeRating(bar.rating, bar.reviewCount)}
              </div>
              <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3 truncate">{address}</p>
              <div className="flex flex-wrap gap-1 md:gap-1.5 mb-2 md:mb-3 md:min-h-[1.75rem]">
                {sports.slice(0, 2).map(sport => (
                  <SportPill key={sport} sport={sport} size="sm" />
                ))}
                {sports.length > 2 && (
                  <span className="hidden md:inline">
                    <SportPill sport={sports[2]} size="sm" />
                  </span>
                )}
                {sports.length > 3 && (
                  <span className="text-xs text-gray-400 self-center hidden md:inline">
                    +{sports.length - 3} more
                  </span>
                )}
                {sports.length > 2 && (
                  <span className="text-xs text-gray-400 self-center md:hidden">
                    +{sports.length - 2} more
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-red-50 mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  <span>{safeEventCount(bar.totalEvents)}</span>
                </div>
                <span className="text-xs font-bold text-brand-red">
                  {STRINGS.viewVenue}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // ── Free / Default card ───────────────────────────────
  return (
    <Link href={`/venues/${slug}`} className="block h-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-red transition-all duration-200 active:scale-[0.98] overflow-hidden flex flex-col h-full group">

        <div className="relative h-36 md:h-44 bg-gradient-to-br from-brand-charcoal to-gray-600 overflow-hidden flex-shrink-0">
          {bar.coverPhoto ? (
            <img src={bar.coverPhoto} alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-brand-charcoal-light">
              {venueEmoji}
            </div>
          )}
          {bar.venueType && (
            <div className="absolute top-3 left-3 bg-white/90 text-brand-charcoal text-xs font-bold px-2.5 py-1 rounded-full">
              {venueEmoji} {STRINGS.venueTypes[bar.venueType]?.label ?? STRINGS.Venue}
            </div>
          )}
        </div>

        <div className="p-3 md:p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-brand-charcoal text-sm md:text-base leading-snug line-clamp-2 md:min-h-[2.75rem] flex-1 group-hover:text-brand-red transition-colors">
              {name}
            </h3>
            {safeRating(bar.rating, bar.reviewCount)}
          </div>
          <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3 truncate">{address}</p>
          <div className="flex flex-wrap gap-1 md:gap-1.5 mb-2 md:mb-3 md:min-h-[1.75rem]">
            {sports.slice(0, 2).map(sport => (
              <SportPill key={sport} sport={sport} size="sm" />
            ))}
            {sports.length > 2 && (
              <span className="hidden md:inline">
                <SportPill sport={sports[2]} size="sm" />
              </span>
            )}
            {sports.length > 3 && (
              <span className="text-xs text-gray-400 self-center hidden md:inline">
                +{sports.length - 3} more
              </span>
            )}
            {sports.length > 2 && (
              <span className="text-xs text-gray-400 self-center md:hidden">
                +{sports.length - 2} more
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-50 mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <CalendarDaysIcon className="w-3.5 h-3.5" />
              <span>{safeEventCount(bar.totalEvents)}</span>
            </div>
            <span className="text-xs font-semibold text-brand-red">
              {STRINGS.viewVenue}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}