import Button from './Button'

interface EmptyStateProps {
  emoji?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  emoji = '🏟️',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-lg font-bold text-brand-charcoal mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-xs mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}