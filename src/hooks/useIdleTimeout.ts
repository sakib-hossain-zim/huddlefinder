'use client'

import { useEffect, useRef, useCallback } from 'react'

const IDLE_TIMEOUT_MS   = 30 * 60 * 1000  // 30 minutes
const WARNING_BEFORE_MS =  2 * 60 * 1000  // warn 2 minutes before

interface UseIdleTimeoutOptions {
  onIdle:    () => void
  onWarning: () => void
  enabled:   boolean
}

export function useIdleTimeout({ onIdle, onWarning, enabled }: UseIdleTimeoutOptions) {
  const idleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimers = useCallback(() => {
    if (!enabled) return

    if (idleTimer.current)  clearTimeout(idleTimer.current)
    if (warnTimer.current)  clearTimeout(warnTimer.current)

    warnTimer.current = setTimeout(() => {
      onWarning()
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS)

    idleTimer.current = setTimeout(() => {
      onIdle()
    }, IDLE_TIMEOUT_MS)
  }, [enabled, onIdle, onWarning])

  useEffect(() => {
    if (!enabled) return

    const events = [
      'mousedown', 'mousemove', 'keydown',
      'scroll', 'touchstart', 'click', 'wheel',
    ]

    events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
    resetTimers()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimers))
      if (idleTimer.current)  clearTimeout(idleTimer.current)
      if (warnTimer.current)  clearTimeout(warnTimer.current)
    }
  }, [enabled, resetTimers])
}