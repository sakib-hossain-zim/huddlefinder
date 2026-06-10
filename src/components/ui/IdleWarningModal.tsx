'use client'

import { useEffect, useState } from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'

interface Props {
  open:          boolean
  onStayLoggedIn: () => void
  onLogOut:      () => void
}

export default function IdleWarningModal({ open, onStayLoggedIn, onLogOut }: Props) {
  const [countdown, setCountdown] = useState(120)  // 2 minutes

  useEffect(() => {
    if (!open) { setCountdown(120); return }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open])

  if (!open) return null

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">

        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="w-6 h-6 text-amber-500" />
        </div>

        <h3 className="text-lg font-bold text-brand-charcoal text-center mb-2">
          Still there?
        </h3>
        <p className="text-sm text-gray-400 text-center leading-relaxed mb-2">
          You've been inactive for a while. For your security we'll log you out in
        </p>
        <p className="text-2xl font-bold text-brand-red text-center mb-6">
          {display}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onLogOut}
            className="flex-1 py-3 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Log out
          </button>
          <Button onClick={onStayLoggedIn} size="md" fullWidth>
            Stay logged in
          </Button>
        </div>
      </div>
    </div>
  )
}