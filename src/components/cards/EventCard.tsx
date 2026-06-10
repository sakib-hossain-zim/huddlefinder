import Link from 'next/link'
import { VenueEvent } from '@/types/event'
import SportPill from '@/components/ui/SportPill'
import { formatEventDateShort, formatTime } from '@/utils/formatDate'
import { formatCurrencyShort } from '@/utils/formatCurrency'
import { STRINGS } from '@/utils/strings'
import { clsx } from 'clsx'
import { UserGroupIcon } from '@heroicons/react/24/outline'

interface EventCardProps {
  event:    VenueEvent
  variant?: 'default' | 'compact'
}

function getSportEmoji(sport?: string): string {
  if (!sport) return '🏟️'
  const emojis: Record<string, string> = {
    football: '⚽', nfl: '🏈', nhl: '🏒', nba: '🏀',
    rugby: '🏉', tennis: '🎾', f1: '🏎️', cricket: '🏏', 'world-cup': '🏆',
  }
  return emojis[sport] ?? '🏟️'
}

function safeRsvpCount(count?: number): string {
  if (!count || count <= 0) return 'Be the first to RSVP'
  return `${count} going`
}

function safePriceBadge(entryType?: string, ticketPrice?: number): string {
  if (entryType === 'free') return 'Free entry'
  if (ticketPrice && ticketPrice > 0) return formatCurrencyShort(ticketPrice)
  return 'Free entry'
}

function isEventFeatured(event: VenueEvent): boolean {
  if (event.venuePlan === 'pro')     return !event.private
  if (event.venuePlan === 'starter') return !!event.promoted
  return false
}

export default function EventCard({ event, variant = 'default' }: EventCardProps) {
  if (!event) return null

  const isLive     = event.status === 'live'
  const isFree     = event.entryType === 'free' || !event.ticketPrice
  const isSoldOut  = event.ticketCapacity != null && event.ticketCapacity > 0
    ? (event.ticketsSold ?? 0) >= event.ticketCapacity
    : false
  const isFeatured = isEventFeatured(event)

  const eventId   = event.eventId   ?? ''
  const title     = event.title     ?? 'Untitled Event'
  const venueName = event.venueName ?? 'Unknown Venue'
  const venueCity = event.venueCity ?? ''
  const sport     = event.sport     ?? ''
  const bannerImage = event.bannerImage || event.coverPhoto || null

  // ── Compact variant — unchanged ──────────────────────
  if (variant === 'compact') {
    return (
      <Link href={`/events/${eventId}`}>
        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors active:scale-[0.98]">
          <div className="w-12 h-12 rounded-xl bg-brand-red-light flex items-center justify-center flex-shrink-0 overflow-hidden">
            {bannerImage ? (
              <img src={bannerImage} alt={title} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <span className="text-xl">{getSportEmoji(sport)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-semibold text-brand-charcoal truncate">{title}</p>
              {isFeatured && <span className="text-xs text-brand-red font-bold flex-shrink-0">⭐</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {venueName}{venueCity ? ` · ${venueCity}` : ''} ·{' '}
              {event.startTime ? formatEventDateShort(event.startTime) : 'Date TBC'}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-red">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="text-sm font-semibold text-brand-charcoal">
                {safePriceBadge(event.entryType, event.ticketPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // ── Featured card ─────────────────────────────────────
  if (isFeatured && !isLive) {
    return (
      <Link href={`/events/${eventId}`} className="block h-full">
        <div className="relative h-full rounded-2xl p-[2px] bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-300 shadow-lg shadow-yellow-200/60 hover:shadow-xl hover:shadow-yellow-300/60 transition-all duration-300 active:scale-[0.98]">
          <div className="bg-white rounded-[14px] overflow-hidden flex flex-col h-full group">

            {/* ── Image: h-32 mobile, h-40 desktop ── */}
            <div className="relative h-32 md:h-40 bg-gradient-to-br from-brand-charcoal to-gray-700 overflow-hidden flex-shrink-0">
              {bannerImage ? (
                <img src={bannerImage} alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">
                  {getSportEmoji(sport)}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                ⭐ Featured
              </div>
              <div className="absolute top-3 right-3">
                {isSoldOut ? (
                  <span className="bg-gray-800/80 text-white text-xs font-bold px-2.5 py-1 rounded-full">Sold out</span>
                ) : (
                  <span className={clsx(
                    'text-xs font-bold px-2.5 py-1 rounded-full',
                    isFree ? 'bg-green-500 text-white' : 'bg-white text-brand-charcoal'
                  )}>
                    {safePriceBadge(event.entryType, event.ticketPrice)}
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-xs font-bold tracking-wider uppercase opacity-90">
                  ✦ Huddlefinder Featured Event
                </p>
              </div>
            </div>

            {/* ── Body: p-3 mobile, p-4 desktop ── */}
            <div className="p-3 md:p-4 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2">
                {sport ? <SportPill sport={sport} size="sm" /> : <span />}
                <span className="text-xs text-gray-400 font-medium">
                  {event.startTime
                    ? `${formatEventDateShort(event.startTime)} · ${formatTime(event.startTime)}`
                    : 'Date TBC'}
                </span>
              </div>
              <h3 className="font-bold text-brand-charcoal text-sm md:text-base leading-snug mb-1 line-clamp-2 md:min-h-[2.75rem] group-hover:text-amber-600 transition-colors">
                {title}
              </h3>
              <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3 truncate">
                {venueName}{venueCity ? ` · ${venueCity}` : ''}
              </p>
              <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-yellow-100 mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <UserGroupIcon className="w-3.5 h-3.5" />
                  <span>{safeRsvpCount(event.rsvpCount)}</span>
                </div>
                <span className="text-xs font-bold text-amber-600">View event →</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // ── Live card ─────────────────────────────────────────
  if (isLive) {
    return (
      <Link href={`/events/${eventId}`} className="block h-full">
        <div className="bg-white rounded-2xl border-transparent ring-2 ring-brand-red ring-offset-1 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden flex flex-col h-full group">
          <div className="relative h-32 md:h-40 bg-gradient-to-br from-brand-charcoal to-gray-700 overflow-hidden flex-shrink-0">
            {bannerImage ? (
              <img src={bannerImage} alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">
                {getSportEmoji(sport)}
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-brand-red text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE NOW
            </div>
            <div className="absolute top-3 right-3">
              {isSoldOut ? (
                <span className="bg-gray-800/80 text-white text-xs font-bold px-2.5 py-1 rounded-full">Sold out</span>
              ) : (
                <span className={clsx(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  isFree ? 'bg-green-500 text-white' : 'bg-white text-brand-charcoal'
                )}>
                  {safePriceBadge(event.entryType, event.ticketPrice)}
                </span>
              )}
            </div>
            {bannerImage && (
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
            )}
          </div>
          <div className="p-3 md:p-4 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              {sport ? <SportPill sport={sport} size="sm" /> : <span />}
              <span className="text-xs text-gray-400 font-medium">
                {event.startTime
                  ? `${formatEventDateShort(event.startTime)} · ${formatTime(event.startTime)}`
                  : 'Date TBC'}
              </span>
            </div>
            <h3 className="font-bold text-brand-charcoal text-sm md:text-base leading-snug mb-1 line-clamp-2 md:min-h-[2.75rem] group-hover:text-brand-red transition-colors">
              {title}
            </h3>
            <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3 truncate">
              {venueName}{venueCity ? ` · ${venueCity}` : ''}
            </p>
            <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-50 mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <UserGroupIcon className="w-3.5 h-3.5" />
                <span>{safeRsvpCount(event.rsvpCount)}</span>
              </div>
              <span className="text-xs font-semibold text-brand-red">{STRINGS.viewEvent}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // ── Default card ──────────────────────────────────────
  return (
    <Link href={`/events/${eventId}`} className="block h-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-red transition-all duration-200 active:scale-[0.98] overflow-hidden flex flex-col h-full group">
        <div className="relative h-32 md:h-40 bg-gradient-to-br from-brand-charcoal to-gray-700 overflow-hidden flex-shrink-0">
          {bannerImage ? (
            <img src={bannerImage} alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {getSportEmoji(sport)}
            </div>
          )}
          <div className="absolute top-3 right-3">
            {isSoldOut ? (
              <span className="bg-gray-800/80 text-white text-xs font-bold px-2.5 py-1 rounded-full">Sold out</span>
            ) : (
              <span className={clsx(
                'text-xs font-bold px-2.5 py-1 rounded-full',
                isFree ? 'bg-green-500 text-white' : 'bg-white text-brand-charcoal'
              )}>
                {safePriceBadge(event.entryType, event.ticketPrice)}
              </span>
            )}
          </div>
          {bannerImage && (
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          )}
        </div>
        <div className="p-3 md:p-4 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-2">
            {sport ? <SportPill sport={sport} size="sm" /> : <span />}
            <span className="text-xs text-gray-400 font-medium">
              {event.startTime
                ? `${formatEventDateShort(event.startTime)} · ${formatTime(event.startTime)}`
                : 'Date TBC'}
            </span>
          </div>
          <h3 className="font-bold text-brand-charcoal text-sm md:text-base leading-snug mb-1 line-clamp-2 md:min-h-[2.75rem] group-hover:text-brand-red transition-colors">
            {title}
          </h3>
          <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3 truncate">
            {venueName}{venueCity ? ` · ${venueCity}` : ''}
          </p>
          <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-50 mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <UserGroupIcon className="w-3.5 h-3.5" />
              <span>{safeRsvpCount(event.rsvpCount)}</span>
            </div>
            <span className="text-xs font-semibold text-brand-red">{STRINGS.viewEvent}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}