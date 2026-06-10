import { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary'   && 'bg-brand-red text-white hover:bg-brand-red-dark active:scale-95',
        variant === 'secondary' && 'border border-gray-200 text-brand-charcoal hover:border-brand-red hover:text-brand-red bg-white active:scale-95',
        variant === 'ghost'     && 'text-brand-charcoal hover:text-brand-red bg-transparent active:scale-95',
        variant === 'danger'    && 'bg-red-600 text-white hover:bg-red-700 active:scale-95',
        size === 'sm' && 'text-xs px-4 py-2 min-h-[36px]',
        size === 'md' && 'text-sm px-5 py-2.5 min-h-[44px]',
        size === 'lg' && 'text-base px-6 py-3 min-h-[52px]',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  )
}