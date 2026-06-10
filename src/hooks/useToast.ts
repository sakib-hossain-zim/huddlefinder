import { useState, useCallback } from 'react'
import type { ToastMessage, ToastType } from '@/components/ui/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const closeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (message: string) => showToast(message, 'success'),
    error:   (message: string) => showToast(message, 'error'),
    warning: (message: string) => showToast(message, 'warning'),
    info:    (message: string) => showToast(message, 'info'),
  }

  return { toasts, toast, closeToast }
}