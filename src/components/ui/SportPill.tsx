import { clsx } from 'clsx'

const SPORTS: Record<string, { label: string; emoji: string; color: string }> = {
  football:      { label: 'Football',     emoji: '⚽', color: 'bg-green-50  text-green-700  border-green-200'  },
  nfl:           { label: 'NFL',          emoji: '🏈', color: 'bg-blue-50   text-blue-800   border-blue-200'   },
  nhl:           { label: 'NHL',          emoji: '🏒', color: 'bg-blue-50   text-blue-700   border-blue-200'   },
  nba:           { label: 'NBA',          emoji: '🏀', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  rugby:         { label: 'Rugby',        emoji: '🏉', color: 'bg-brown-50  text-yellow-800 border-yellow-200' },
  tennis:        { label: 'Tennis',       emoji: '🎾', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  f1:            { label: 'F1',           emoji: '🏎️', color: 'bg-red-50    text-red-700    border-red-200'    },
  cricket:       { label: 'Cricket',      emoji: '🏏', color: 'bg-lime-50   text-lime-700   border-lime-200'   },
  'world-cup':   { label: 'World Cup',    emoji: '🏆', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
}

interface SportPillProps {
  sport: string
  size?: 'sm' | 'md'
  active?: boolean
  onClick?: () => void
}

export default function SportPill({ sport, size = 'sm', active, onClick }: SportPillProps) {
  const config = SPORTS[sport] ?? { label: sport, emoji: '🏟️', color: 'bg-gray-50 text-gray-700 border-gray-200' }

  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 border rounded-full font-semibold whitespace-nowrap transition-all duration-200',
        size === 'sm' && 'text-xs px-2.5 py-1',
        size === 'md' && 'text-sm px-3.5 py-1.5',
        onClick && 'cursor-pointer hover:scale-105 active:scale-95',
        active ? 'bg-brand-red text-white border-brand-red' : config.color
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}