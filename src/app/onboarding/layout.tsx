'use client'

import AuthGuard from '@/components/auth/AuthGuard'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="venue_owner">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    </AuthGuard>
  )
}