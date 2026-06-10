'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import Button from '@/components/ui/Button'
import Stepper from '@/components/ui/Stepper'
import { CheckIcon } from '@heroicons/react/24/solid'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const STEPS = [
  { number: 1, label: 'Claim'    },
  { number: 2, label: 'Verify'   },
  { number: 3, label: 'Profile'  },
  { number: 4, label: 'Plan'     },
  { number: 5, label: 'Payments' },
]

const PLANS = [
  {
    id:    'free',
    name:  'Free',
    price: 0,
    desc:  'Get listed and start receiving RSVPs',
    features: [
      'Basic venue listing',
      'Unlimited free events',
      'Fan RSVPs',
      'Huddlefinder branding',
    ],
    missing: [
      'Ticket sales',
      'Analytics',
      'Push notifications',
      'Priority listing',
    ],
  },
  {
    id:      'starter',
    name:    'Starter',
    price:   49,
    desc:    'Everything you need to sell tickets',
    popular: false,
    features: [
      'Everything in Free',
      'Ticket sales (9% commission)',
      'Basic analytics',
      '2 push notification boosts/month',
      'Priority listing',
    ],
    missing: [
      'Advanced analytics',
      'Unlimited boosts',
    ],
  },
  {
    id:      'pro',
    name:    'Pro',
    price:   99,
    desc:    'Maximum visibility and lowest fees',
    popular: true,
    features: [
      'Everything in Starter',
      'Lower commission (6.5%)',
      'Advanced analytics',
      '8 push notification boosts/month',
      'Featured listing',
      'Staff accounts',
      'Priority support',
    ],
    missing: [],
  },
]

export default function PlanPage() {
  const router = useRouter()

  // ── Fix: use userDoc instead of localStorage ─────────
  const { userDoc } = useAuth()

  const [selectedPlan, setSelectedPlan] = useState('free')
  const [loading,      setLoading]      = useState(false)
  const [venueId,      setVenueId]      = useState('')

  useEffect(() => {
    if (!userDoc) return
    const id = userDoc.venueId ?? (userDoc as any).pendingVenueId
    if (!id) {
      router.replace('/onboarding/claim')
      return
    }
    setVenueId(id)
  }, [userDoc, router])

  async function handleSelectPlan() {
    if (!venueId) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'venues', venueId), {
        plan: selectedPlan,
      })
      if (selectedPlan === 'free') {
        router.push('/venue-dashboard')
      } else {
        router.push('/onboarding/stripe')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Stepper steps={STEPS} currentStep={4} />

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-brand-charcoal transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back
      </button>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
          Choose your plan
        </h1>
        <p className="text-gray-400 text-sm">
          Start free, upgrade anytime. Cancel anytime.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {PLANS.map(plan => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={clsx(
              'w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 relative',
              selectedPlan === plan.id
                ? 'border-brand-red bg-brand-red-light'
                : 'border-gray-200 bg-white hover:shadow-sm'
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-red text-white text-xs font-bold px-3 py-1 rounded-full">
                Most popular
              </div>
            )}

            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  selectedPlan === plan.id
                    ? 'border-brand-red bg-brand-red'
                    : 'border-gray-300 bg-white'
                )}>
                  {selectedPlan === plan.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-brand-charcoal text-lg">
                    {plan.name}
                  </p>
                  <p className="text-sm text-gray-400">{plan.desc}</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-4">
                {plan.price === 0 ? (
                  <span className="text-xl font-bold text-brand-charcoal">Free</span>
                ) : (
                  <div>
                    <span className="text-xl font-bold text-brand-charcoal">
                      ${plan.price}
                    </span>
                    <span className="text-xs text-gray-400">/mo</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 mt-3 ml-8">
              {plan.features.map(feature => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{feature}</span>
                </div>
              ))}
              {plan.missing.map(feature => (
                <div key={feature} className="flex items-center gap-2 opacity-40">
                  <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                    <div className="w-2.5 h-0.5 bg-gray-400 rounded" />
                  </div>
                  <span className="text-sm text-gray-400">{feature}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <Button
        fullWidth
        size="lg"
        loading={loading}
        onClick={handleSelectPlan}
      >
        {selectedPlan === 'free'
          ? 'Continue with Free'
          : `Continue with ${PLANS.find(p => p.id === selectedPlan)?.name}`}
      </Button>

      <p className="text-center text-xs text-gray-400 mt-4">
        Paid plans are billed monthly. Cancel anytime from your dashboard.
      </p>
    </div>
  )
}