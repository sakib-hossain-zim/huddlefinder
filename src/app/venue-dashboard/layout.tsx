'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function VenueDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="venue_owner">
      <OnboardingCheck>
        {children}
      </OnboardingCheck>
    </AuthGuard>
  )
}

function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { userDoc, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Has pendingVenueId but no venueId — closed browser mid-verification
    if (userDoc?.pendingVenueId && !userDoc?.venueId) {
      router.replace('/onboarding/verify')
      return
    }

    // No venue at all — send to claim
    if (!userDoc?.venueId && !userDoc?.pendingVenueId) {
      router.replace('/onboarding/claim')
      return
    }
  }, [userDoc, loading, router])

  if (loading) return <LoadingSpinner fullPage />

  // Still redirecting — show nothing
  if (!userDoc?.venueId && !userDoc?.pendingVenueId) return null

  return <>{children}</>
}