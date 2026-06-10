import { format, isToday, isTomorrow, isPast } from 'date-fns'

// ── Convert any date-like value to JS Date ─────────────────
function toDate(value: any): Date {
  if (!value) return new Date()
  // Firestore Timestamp
  if (value?.seconds !== undefined) return new Date(value.seconds * 1000)
  // Already a Date
  if (value instanceof Date) return value
  // String or number
  return new Date(value)
}

export function formatEventDate(value: any): string {
  const date = toDate(value)
  if (isToday(date))    return `Today at ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
  return format(date, 'MMM d · h:mm a')
}

export function formatEventDateShort(value: any): string {
  const date = toDate(value)
  if (isToday(date))    return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function formatTime(value: any): string {
  const date = toDate(value)
  return format(date, 'h:mm a')
}

export function formatRelative(value: any): string {
  const date = toDate(value)
  if (isPast(date)) return 'Ended'
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
  return format(date, 'MMM d · h:mm a')
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function formatDate(value: any): string {
  const date = toDate(value)
  return format(date, 'MMM d, yyyy')
}