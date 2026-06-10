'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { STRINGS } from '@/utils/strings'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleReset() {
    if (!email.trim()) { setError('Email is required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err: any) {
      setError(
        err.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 pt-16 pb-12 max-w-md mx-auto w-full">

        <Link href="/">
          <img src="/logo.svg" alt={STRINGS.appName} className="h-24 w-auto mx-auto mb-6" />
        </Link>

        {sent ? (
          // ── Success state ─────────────────────────────────
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-brand-charcoal mb-2">Check your inbox</h1>
            <p className="text-gray-400 text-sm mb-8">
              We sent a password reset link to{' '}
              <span className="font-semibold text-brand-charcoal">{email}</span>.
              Check your spam folder if you don't see it.
            </p>
            <Button
              fullWidth
              size="lg"
              onClick={() => setSent(false)}
              variant="secondary"
            >
              Send again
            </Button>
            <Link
              href="/auth/login"
              className="block text-center text-sm text-brand-red font-semibold mt-4"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          // ── Form state ────────────────────────────────────
          <>
            <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
              Forgot your password?
            </h1>
            <p className="text-gray-400 text-sm mb-8">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && handleReset()}
              />
            </div>

            <Button
              fullWidth
              size="lg"
              loading={loading}
              onClick={handleReset}
              className="mt-6"
            >
              Send reset link
            </Button>

            <Link
              href="/auth/login"
              className="block text-center text-sm text-gray-400 mt-6 hover:text-brand-charcoal transition-colors"
            >
              ← Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}