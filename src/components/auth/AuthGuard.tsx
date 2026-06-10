'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface AuthGuardProps {
  children:      React.ReactNode
  requiredRole?: 'fan' | 'venue_owner' | 'admin'
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Not logged in — redirect to login
    if (!user) {
      router.replace(`/auth/login?redirect=${window.location.pathname}`)
      return
    }

    // Has user but userDoc not loaded yet — wait
    if (user && role === null) return

    // Wrong role — redirect to home
    if (requiredRole && role !== requiredRole && role !== 'admin') {
      router.replace('/')
    }
  }, [user, role, loading, router, requiredRole])

  // Still checking auth state
  if (loading) return <LoadingSpinner fullPage />

  // Not logged in
  if (!user) return null

  // User logged in but userDoc still loading — show spinner instead of redirecting
  if (user && role === null) return <LoadingSpinner fullPage />

  // Wrong role
  if (requiredRole && role !== requiredRole && role !== 'admin') return null

  return <>{children}</>
}