'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

function SignupPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user, userDoc, loading, logOut, signUp, signInWithGoogle } = useAuth()
  const { toasts, toast, closeToast } = useToast()

  const forcedRole       = searchParams.get('role') as 'venue_owner' | null
  const showRoleSelector = !forcedRole

  const [role,          setRole]          = useState<'fan' | 'venue_owner'>(
    forcedRole === 'venue_owner' ? 'venue_owner' : 'fan'
  )
  const [firstName,     setFirstName]     = useState('')
  const [lastName,      setLastName]      = useState('')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [confirm,       setConfirm]       = useState('')
  const [showPass,      setShowPass]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error,         setError]         = useState('')

  // ── Already logged in ──────────────────────────────────
  useEffect(() => {
    if (loading || !user || !userDoc) return
    if (userDoc.role === 'venue_owner') {
      router.replace(userDoc.venueId ? '/venue-dashboard' : '/onboarding/claim')
    }
    // Fans stay — we show them the "wrong account" screen below
  }, [user, userDoc, loading, router])

  // ── Validate ───────────────────────────────────────────
  function validate(): string {
    if (!firstName.trim()) return 'First name is required'
    if (!lastName.trim())  return 'Last name is required'
    if (!email.trim())     return 'Email is required'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password !== confirm) return 'Passwords do not match'
    return ''
  }

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }

    setSubmitting(true)
    setError('')
    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim(), role)
      if (role === 'venue_owner') {
        router.push('/onboarding/claim')
      } else {
        router.push('/auth/verify-email')
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
        toast.error('Email already in use — try logging in instead')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
        toast.error('Invalid email address')
      } else {
        setError('Something went wrong. Please try again.')
        toast.error('Sign up failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Google ─────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      if (role === 'venue_owner') {
        router.push('/onboarding/claim')
      } else {
        router.push('/dashboard')
      }
    } catch {
      toast.error('Google sign in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  // ── Fan trying to access venue signup ──────────────────
  async function handleSignOutAndSwitch() {
    await logOut()
    router.push('/auth/signup?role=venue_owner')
  }

  // ── Loading ────────────────────────────────────────────
  if (loading) return <LoadingSpinner fullPage />

  // ── Fan already logged in — show message ───────────────
  if (user && userDoc?.role === 'fan') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <span className="text-3xl font-black text-brand-red tracking-tight">
              Huddlefinder
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <ExclamationTriangleIcon className="w-7 h-7 text-amber-500" />
            </div>

            <h1 className="text-xl font-bold text-brand-charcoal text-center mb-2">
              You're signed in as a fan
            </h1>
            <p className="text-sm text-gray-400 text-center leading-relaxed mb-8">
              You need a venue owner account to list or claim a venue.
              Sign out and create a new venue owner account, or
              continue as a fan.
            </p>

            <div className="space-y-3">
              <Button fullWidth size="lg" onClick={handleSignOutAndSwitch}>
                <BuildingStorefrontIcon className="w-4 h-4 mr-2" />
                Sign out and create a venue account
              </Button>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Continue as fan
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Signed in as{' '}
              <span className="font-semibold text-brand-charcoal">{user.email}</span>
            </p>
          </div>
        </div>
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </div>
    )
  }

  // ── Signup form ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-brand-red tracking-tight">
            Huddlefinder
          </span>
          <p className="text-sm text-gray-400 mt-1">Create your account</p>
        </div>

        {/* Role selector or forced role banner */}
        {showRoleSelector ? (
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              onClick={() => setRole('fan')}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                role === 'fan'
                  ? 'border-brand-red bg-brand-red-light'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <UserIcon className={`w-6 h-6 ${role === 'fan' ? 'text-brand-red' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className={`text-sm font-bold ${role === 'fan' ? 'text-brand-red' : 'text-brand-charcoal'}`}>
                  I'm a Fan
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Find events near me</p>
              </div>
            </button>

            <button
              onClick={() => setRole('venue_owner')}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                role === 'venue_owner'
                  ? 'border-brand-red bg-brand-red-light'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <BuildingStorefrontIcon className={`w-6 h-6 ${role === 'venue_owner' ? 'text-brand-red' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className={`text-sm font-bold ${role === 'venue_owner' ? 'text-brand-red' : 'text-brand-charcoal'}`}>
                  I Own a Venue
                </p>
                <p className="text-xs text-gray-400 mt-0.5">List my venue</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-brand-red-light border border-brand-red/20 rounded-2xl mb-6">
            <BuildingStorefrontIcon className="w-6 h-6 text-brand-red flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-brand-red">Venue owner account</p>
              <p className="text-xs text-brand-red/70 mt-0.5">
                List your venue and connect with sports fans
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {/* Google */}
          <div className="mb-6">
            <button
              onClick={handleGoogle}
              disabled={googleLoading || submitting}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-brand-charcoal hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="John"
              />
              <Input
                label="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
            />

            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              hint="At least 8 characters"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPass
                    ? <EyeSlashIcon className="w-4 h-4" />
                    : <EyeIcon className="w-4 h-4" />
                  }
                </button>
              }
            />

            <Input
              label="Confirm password"
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
            />

            {role === 'fan' && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-600 leading-relaxed">
                  📧 We'll send a verification link to your email after sign up.
                  You'll need to verify before RSVPing to events.
                </p>
              </div>
            )}

            <Button
              fullWidth
              size="lg"
              loading={submitting}
              onClick={handleSubmit}
            >
              {role === 'fan' ? 'Create account' : 'Create account & list my venue'}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-brand-red hover:underline">
            Log in
          </Link>
        </p>

      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  )
}