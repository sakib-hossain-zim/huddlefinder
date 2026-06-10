'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { auth } from '@/lib/firebase'
import { EnvelopeIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

export default function VerifyEmailPage() {
  const router = useRouter()
  const { user, userDoc, refreshUserDoc, sendVerificationEmail, logOut } = useAuth()
  const { toasts, toast, closeToast } = useToast()

  const [checking,       setChecking]       = useState(false)
  const [resending,      setResending]      = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // If already verified, redirect
  useEffect(() => {
    if (user?.emailVerified) {
      const destination = userDoc?.role === 'venue_owner'
        ? '/onboarding/claim'
        : '/dashboard'
      router.replace(destination)
    }
  }, [user, userDoc, router])

  // Poll every 5 seconds to check verification status
  useEffect(() => {
    if (!user || user.emailVerified) return
    const interval = setInterval(async () => {
      await refreshUserDoc()
    }, 5000)
    return () => clearInterval(interval)
  }, [user])

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function handleCheckNow() {
    setChecking(true)
    try {
      await refreshUserDoc()
      if (!auth.currentUser?.emailVerified) {
        toast.info('Not verified yet — check your inbox and click the link')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await sendVerificationEmail()
      toast.success('Verification email sent')
      setResendCooldown(60)
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        toast.error('Too many requests — please wait a minute before trying again')
      } else {
        toast.error('Failed to send email. Please try again.')
      }
    } finally {
      setResending(false)
    }
  }

  async function handleSignOut() {
    await logOut()
    router.push('/auth/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-brand-red tracking-tight">
            Huddlefinder
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">

          {/* Icon */}
          <div className="w-16 h-16 bg-brand-red-light rounded-full flex items-center justify-center mx-auto mb-5">
            <EnvelopeIcon className="w-8 h-8 text-brand-red" />
          </div>

          <h1 className="text-xl font-bold text-brand-charcoal mb-2">
            Check your inbox
          </h1>

          <p className="text-sm text-gray-400 leading-relaxed mb-2">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-brand-charcoal mb-6">
            {user.email}
          </p>

          <p className="text-xs text-gray-400 leading-relaxed mb-8">
            Click the link in the email to verify your account.
            This page will automatically update once you're verified.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              fullWidth
              size="md"
              loading={checking}
              onClick={handleCheckNow}
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              I've verified — continue
            </Button>

            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-brand-red hover:bg-brand-red-light rounded-xl transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : resending
                ? 'Sending...'
                : 'Resend verification email'}
            </button>
          </div>

          {/* Wrong email */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">
              Wrong email address?
            </p>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors"
            >
              Sign out and start over
            </button>
          </div>
        </div>

        {/* Spam note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Don't see it? Check your spam or junk folder.
        </p>

      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}