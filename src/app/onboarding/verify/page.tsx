'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Stepper from '@/components/ui/Stepper'
import {
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { clsx } from 'clsx'

const STEPS = [
  { number: 1, label: 'Claim'    },
  { number: 2, label: 'Verify'   },
  { number: 3, label: 'Profile'  },
  { number: 4, label: 'Plan'     },
  { number: 5, label: 'Payments' },
]

export default function VerifyPage() {
  const router = useRouter()
  const { user, userDoc, refreshUserDoc } = useAuth()

  const [mode,        setMode]        = useState<'phone' | 'manual' | 'pending'>('phone')
  const [sent,        setSent]        = useState(false)
  const [maskedPhone, setMaskedPhone] = useState('')
  const [cooldown,    setCooldown]    = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // 6-digit code inputs
  const [code,     setCode]     = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Manual review form
  const [manualName,    setManualName]    = useState('')
  const [manualRole,    setManualRole]    = useState('')
  const [manualEmail,   setManualEmail]   = useState('')
  const [manualDetails, setManualDetails] = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  // Get venueId from userDoc.pendingVenueId
  const venueId = userDoc?.pendingVenueId ?? ''

  useEffect(() => {
    if (userDoc && !userDoc.pendingVenueId && !userDoc.venueId) {
      router.replace('/onboarding/claim')
    }
    if (userDoc?.venueId && !userDoc?.pendingVenueId) {
      router.replace('/onboarding/profile')
    }
  }, [userDoc, router])

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSendCode() {
    if (!venueId) { setError('No venue found. Please go back and try again.'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/venues/send-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ venueId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send code'); return }
      setSent(true)
      setMaskedPhone(data.maskedPhone)
      setCooldown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch {
      setError('Failed to send verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleCodeChange(index: number, value: string) {
    const digit   = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
    if (digit && index === 5) {
      const full = newCode.join('')
      if (full.length === 6) setTimeout(() => handleConfirmCode(full), 100)
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputRefs.current[5]?.focus()
      setTimeout(() => handleConfirmCode(pasted), 100)
    }
  }

  async function handleConfirmCode(fullCode: string) {
    if (!fullCode || fullCode.length < 6) { setError('Please enter the 6-digit code'); return }
    if (!venueId || !user) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/venues/verify-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ venueId, code: fullCode, userId: user.uid }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Incorrect code. Please try again.')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }
      await refreshUserDoc()
      router.push('/onboarding/profile')
    } catch {
      setError('Failed to verify. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleManualSubmit() {
    if (!manualName.trim())  { setError('Please enter your name'); return }
    if (!manualRole.trim())  { setError('Please enter your role'); return }
    if (!manualEmail.trim()) { setError('Please enter your email'); return }
    if (!venueId) return
    setSubmitting(true)
    setError('')
    try {
      await updateDoc(doc(db, 'venues', venueId), {
        status: 'pending_review',
        manualReviewRequest: {
          name:        manualName.trim(),
          role:        manualRole.trim(),
          email:       manualEmail.trim(),
          details:     manualDetails.trim(),
          submittedAt: new Date(),
        },
      })
      setMode('pending')
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pending review screen ──────────────────────────────
  if (mode === 'pending') {
    return (
      <div>
        <Stepper steps={STEPS} currentStep={2} />
        <div className="text-center mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-brand-charcoal mb-2">
            Review request submitted
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            We'll review your details and get back to you within
            48–72 hours at the email you provided.
          </p>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left mb-6">
            <p className="text-xs font-semibold text-amber-800 mb-1">What happens next</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>→ Our team reviews your submission</li>
              <li>→ We may reach out for additional details</li>
              <li>→ Once approved you'll get an email to continue setup</li>
            </ul>
          </div>
          <p className="text-xs text-gray-400">
            Questions? Email{' '}
            <a href="mailto:hello@huddlefinder.ca" className="text-brand-red font-semibold">
              hello@huddlefinder.ca
            </a>
          </p>
        </div>
      </div>
    )
  }

  // ── Manual review form ─────────────────────────────────
  if (mode === 'manual') {
    return (
      <div>
        <Stepper steps={STEPS} currentStep={2} />

        <button
          onClick={() => { setMode('phone'); setError('') }}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-brand-charcoal transition-colors my-6"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
            Manual verification
          </h1>
          <p className="text-gray-400 text-sm">
            Our team will review and approve your venue within 48–72 hours
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="Your full name"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            placeholder="John Smith"
          />
          <Input
            label="Your role at the venue"
            value={manualRole}
            onChange={e => setManualRole(e.target.value)}
            placeholder="e.g. Owner, Manager, General Manager"
          />
          <Input
            label="Your email address"
            type="email"
            value={manualEmail}
            onChange={e => setManualEmail(e.target.value)}
            placeholder="you@yourvenue.com"
            hint="We'll contact you here when your venue is approved"
          />
          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
              Anything else we should know?
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={manualDetails}
              onChange={e => setManualDetails(e.target.value)}
              placeholder="e.g. We recently changed our phone number..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all resize-none"
            />
          </div>

          <Button fullWidth size="lg" loading={submitting} onClick={handleManualSubmit}>
            Submit for review
          </Button>
        </div>
      </div>
    )
  }

  // ── Main phone verification screen ─────────────────────
  return (
    <div>
      <Stepper steps={STEPS} currentStep={2} />

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-brand-charcoal transition-colors my-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-red-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheckIcon className="w-7 h-7 text-brand-red" />
        </div>
        <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
          Verify ownership
        </h1>
        <p className="text-gray-400 text-sm">
          We'll send a code to the phone number to venue's google registered phone number. This is usually the number that is provided on Google Maps
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {!sent ? (
          <>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <DevicePhoneMobileIcon className="w-5 h-5 text-brand-red flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-brand-charcoal">SMS verification</p>
                <p className="text-xs text-gray-400">
                  A 6-digit code will be sent to your venue's google registered phone number. This is usually the number that is provided on Google Maps
                </p>
              </div>
            </div>

            <Button fullWidth size="lg" loading={loading} onClick={handleSendCode}>
              Send verification code
            </Button>
          </>
        ) : (
          <>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-green-700 font-semibold">
                Code sent to {maskedPhone}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Enter the 6-digit code from your SMS
              </p>
            </div>

            {/* 6-digit PIN inputs */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-3">
                Enter 6-digit code
              </label>
              <div className="flex gap-2 max-w-xs mx-auto" onPaste={handleCodePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(index, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(index, e)}
                    className={clsx(
                      'w-10 h-12 flex-shrink-0 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all',
                      digit
                        ? 'border-brand-red bg-brand-red-light text-brand-red'
                        : 'border-gray-200 bg-gray-50 text-brand-charcoal',
                      'focus:border-brand-red focus:ring-2 focus:ring-brand-red/10'
                    )}
                  />
                ))}
              </div>
            </div>

            <Button
              fullWidth size="lg" loading={loading}
              onClick={() => handleConfirmCode(code.join(''))}
            >
              Verify
            </Button>

            <button
              onClick={handleSendCode}
              disabled={loading || cooldown > 0}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-brand-charcoal transition-colors py-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </>
        )}
      </div>

      {/* Fallback — don't have access to this number */}
      <button
        onClick={() => { setMode('manual'); setError('') }}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-brand-red transition-colors group mt-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <EnvelopeIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-brand-charcoal">
              Don't have access to this number?
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Submit a manual review — we'll respond within 48–72 hours
            </p>
          </div>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-brand-red transition-colors flex-shrink-0" />
      </button>
    </div>
  )
}