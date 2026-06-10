'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id:      string
  message: string
  type:    ToastType
}

interface ToastProps {
  toasts:  ToastMessage[]
  onClose: (id: string) => void
}

const ICONS = {
  success: CheckCircleIcon,
  error:   XCircleIcon,
  warning: ExclamationTriangleIcon,
  info:    InformationCircleIcon,
}

const STYLES = {
  success: 'bg-brand-charcoal text-white',
  error:   'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info:    'bg-blue-600 text-white',
}

const ICON_COLORS = {
  success: 'text-green-400',
  error:   'text-red-200',
  warning: 'text-amber-200',
  info:    'text-blue-200',
}

export function ToastContainer({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

function ToastItem({
  toast,
  onClose,
}: {
  toast:   ToastMessage
  onClose: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const Icon = ICONS[toast.type]

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 10)

    // Auto dismiss after 3s
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose(toast.id), 300)
    }, 3000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [toast.id, onClose])

  return (
    <div
      className={clsx(
        'flex items-center gap-2.5 px-5 py-3 rounded-full shadow-xl pointer-events-auto',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        STYLES[toast.type]
      )}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0', ICON_COLORS[toast.type])} />
      <span className="text-sm font-semibold whitespace-nowrap">
        {toast.message}
      </span>
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(() => onClose(toast.id), 300)
        }}
        className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}