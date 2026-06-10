'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import IdleWarningModal from '@/components/ui/IdleWarningModal'

function IdleManager() {
  const { user, logOut }    = useAuth()
  const router              = useRouter()
  const [showWarning, setShowWarning] = useState(false)

  const handleIdle = useCallback(async () => {
    setShowWarning(false)
    await logOut()
    router.push('/auth/login?reason=idle')
  }, [logOut, router])

  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false)
  }, [])

  useIdleTimeout({
    enabled:   !!user,        // only run when logged in
    onWarning: handleWarning,
    onIdle:    handleIdle,
  })

  return (
    <IdleWarningModal
      open={showWarning}
      onStayLoggedIn={handleStayLoggedIn}
      onLogOut={handleIdle}
    />
  )
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <IdleManager />
      {children}
    </AuthProvider>
  )
}