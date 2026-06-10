'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { clsx } from 'clsx'

const PLANS = [
  {
    id:      'free',
    name:    'Free',
    price:   0,
    desc:    'Get listed and start receiving RSVPs',
    color:   'border-gray-200',
    popular: false,
    features: [
      'Basic venue listing',
      'Unlimited free events',
      'Fan RSVPs',
      'Huddlefinder branding',
    ],
    missing: [
      'Ticket sales',
      'Priority listing',
      'Event promotions',
      'Analytics (coming soon)',
    ],
  },
  {
    id:      'starter',
    name:    'Starter',
    price:   49,
    desc:    'Everything you need to sell tickets',
    color:   'border-brand-charcoal',
    popular: false,
    features: [
      'Everything in Free',
      'Ticket sales (9% commission)',
      'Priority listing in search',
      '5 featured event promotions/month',
      '$5 per extra event promotion',
      '$15 per push notification boost (coming soon)',
    ],
    missing: [
      'Lower commission',
      'Unlimited promotions',
      'Advanced analytics (coming soon)',
    ],
  },
  {
    id:      'pro',
    name:    'Pro',
    price:   99,
    desc:    'Maximum visibility and lowest fees',
    color:   'border-brand-red',
    popular: true,
    features: [
      'Everything in Starter',
      'Lower commission (6.5%)',
      'Featured listing badge',
      'Unlimited event promotions',
      '8 push notification boosts/month (coming soon)',
      'Advanced analytics (coming soon)',
      'Priority support',
    ],
    missing: [],
  },
]

// Plan price hierarchy for upgrade/downgrade detection
const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2 }

export default function UpgradePlanPage() {
  const router                            = useRouter()
  const { user, userDoc, refreshUserDoc } = useAuth()
  const { toasts, toast, closeToast }     = useToast()

  // Current venue plan fetched from Firestore
  const [currentPlan,        setCurrentPlan]        = useState<string>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('')
  const [venueLoading,       setVenueLoading]        = useState(true)

  // Selected plan on the page
  const [selected, setSelected] = useState<string>('')
  const [saving,   setSaving]   = useState(false)

  // Upgrade confirmation modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeDetails,   setUpgradeDetails]   = useState<{
    plan:           string
    nextMonthPrice: number
  } | null>(null)

  // Downgrade confirmation modal
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [downgradeDetails,   setDowngradeDetails]   = useState<{
    plan:            string
    currentPlan:     string
    endsAtFormatted: string
  } | null>(null)

  // ── Fetch venue to get current plan ──────────────
  useEffect(() => {
    async function fetchVenue() {
      if (!userDoc?.venueId) return
      try {
        const snap = await getDoc(doc(db, 'venues', userDoc.venueId))
        if (snap.exists()) {
          const data = snap.data()
          const plan = data.plan ?? 'free'
          setCurrentPlan(plan)
          setSubscriptionStatus(data.subscriptionStatus ?? '')
          // Default selected to current plan so it's highlighted
          setSelected(plan)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setVenueLoading(false)
      }
    }
    fetchVenue()
  }, [userDoc])

  // ── Determine action type ─────────────────────────
  function getActionType(): 'current' | 'upgrade' | 'downgrade' {
    if (selected === currentPlan)                    return 'current'
    if (PLAN_RANK[selected] > PLAN_RANK[currentPlan]) return 'upgrade'
    return 'downgrade'
  }

  // ── Smart button label ────────────────────────────
  function getButtonLabel(): string {
    const plan       = PLANS.find(p => p.id === selected)
    const actionType = getActionType()

    if (actionType === 'current')                    return 'Current plan'
    // Free selected from a paid plan = cancel subscription
    if (selected === 'free' && currentPlan !== 'free') return 'Cancel subscription'
    if (selected === 'free')                         return 'Continue with Free'
    if (actionType === 'upgrade')                    return `Upgrade to ${plan?.name} — $${plan?.price}/mo`
    return `Downgrade to ${plan?.name} — $${plan?.price}/mo`
  }

  async function handleSelectPlan() {
    if (!userDoc?.venueId || !user) {
      toast.error('No venue found. Please contact support.')
      return
    }

    // Do nothing if current plan selected
    if (selected === currentPlan) return

    setSaving(true)
    try {

      // ── Free selected from paid plan — cancel subscription ──
      // Must respect billing cycle — go through cancel API
      // NOT a direct Firestore update
      if (selected === 'free' && currentPlan !== 'free') {
        const res  = await fetch('/api/stripe/cancel-subscription', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            userId:  user.uid,
            venueId: userDoc.venueId,
          }),
        })
        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error ?? 'Failed to cancel. Please try again.')
          return
        }

        // Show success — venue keeps benefits till cycle end
        const name = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
        toast.success(
          `Cancellation scheduled — ${name} benefits active until ${data.endsAtFormatted}`
        )
        router.push('/venue-dashboard')
        return
      }

      // ── Free selected when already on free — nothing to do ──
      if (selected === 'free') {
        router.push('/venue-dashboard')
        return
      }

      // ── Paid plan — call subscription checkout API ─────────
      const res  = await fetch('/api/stripe/create-subscription-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          venueId: userDoc.venueId,
          userId:  user.uid,
          plan:    selected,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to start checkout. Please try again.')
        return
      }

      // ── Upgrade confirmed — show modal ────────────
      if (data.upgraded) {
        setUpgradeDetails(data)
        setShowUpgradeModal(true)
        return
      }

      // ── Downgrade confirmed — show modal ──────────
      // Use local currentPlan state — not API response
      // API response currentPlan can be stale
      if (data.downgrading) {
        setDowngradeDetails({
          plan:            data.plan,
          currentPlan,     // ← local state, always accurate
          endsAtFormatted: data.endsAtFormatted,
        })
        setShowDowngradeModal(true)
        return
      }

      // ── New subscriber — redirect to Stripe Checkout ──
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('No checkout URL returned. Please try again.')
      }

    } catch (err) {
      console.error('Plan change error:', err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmUpgrade() {
    await refreshUserDoc()
    setShowUpgradeModal(false)
    const planName = upgradeDetails?.plan.charAt(0).toUpperCase() +
      (upgradeDetails?.plan.slice(1) ?? '')
    toast.success(`Upgraded to ${planName}! 🎉`)
    router.push('/venue-dashboard')
  }

  function handleConfirmDowngrade() {
    setShowDowngradeModal(false)
    router.push('/venue-dashboard')
  }

  function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
  }

  const actionType    = getActionType()
  const isCurrentPlan = actionType === 'current'
  const isSubscribed  = currentPlan !== 'free' && !!subscriptionStatus
  const pageTitle     = isSubscribed ? 'Manage your plan' : 'Choose your plan'
  const pageSubtitle  = isSubscribed
    ? 'Upgrade or downgrade anytime.'
    : 'Upgrade anytime. Cancel anytime.'

  if (venueLoading) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/venue-dashboard')}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-charcoal">{pageTitle}</h1>
          <p className="text-sm text-gray-400 mt-1">{pageSubtitle}</p>
        </div>

        {/* Plan cards */}
        <div className="space-y-4 mb-6">
          {PLANS.map(plan => {
            const isCurrentPlanCard = plan.id === currentPlan
            const isSelected        = plan.id === selected

            return (
              <div key={plan.id} className="relative">

                {/* Most popular badge — hidden if current plan */}
                {plan.popular && !isCurrentPlanCard && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-brand-red text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlanCard && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckIcon className="w-3 h-3" />
                    Current plan
                  </div>
                )}

                <button
                  onClick={() => setSelected(plan.id)}
                  className={clsx(
                    'w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 bg-white',
                    isSelected && isCurrentPlanCard
                      ? 'border-green-500 bg-green-50 shadow-sm'   // current plan selected
                      : isSelected
                        ? 'border-brand-red bg-brand-red-light shadow-sm' // different plan selected
                        : isCurrentPlanCard
                          ? 'border-green-300 hover:shadow-sm'     // current plan not selected
                          : `${plan.color} hover:shadow-sm`        // other plan
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-brand-charcoal text-lg">
                          {plan.name}
                        </h3>
                        {isCurrentPlanCard && (
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{plan.desc}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className="text-right">
                        {plan.price === 0 ? (
                          <span className="text-2xl font-bold text-brand-charcoal">
                            Free
                          </span>
                        ) : (
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-brand-charcoal">
                              ${plan.price}
                            </span>
                            <span className="text-sm text-gray-400">/mo</span>
                          </div>
                        )}
                      </div>
                      {/* Radio indicator */}
                      <div className={clsx(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                        isSelected && isCurrentPlanCard
                          ? 'border-green-500 bg-green-500'
                          : isSelected
                            ? 'border-brand-red bg-brand-red'
                            : 'border-gray-300'
                      )}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-1.5">
                    {plan.features.map(feature => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                    {plan.missing.map(feature => (
                      <div key={feature} className="flex items-center gap-2 opacity-40">
                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-400 rounded" />
                        </div>
                        <span className="text-sm text-gray-400">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Warning when Free is selected from paid plan */}
                  {plan.id === 'free' && currentPlan !== 'free' && isSelected && (
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-700 leading-relaxed">
                        This will cancel your subscription. You keep your current
                        benefits until the end of your billing cycle.
                      </p>
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* CTA button */}
        <Button
          fullWidth
          size="lg"
          loading={saving}
          disabled={isCurrentPlan}
          onClick={handleSelectPlan}
        >
          {getButtonLabel()}
        </Button>

        {/* Helper text under button */}
        {!isCurrentPlan && (
          <p className="text-center text-xs text-gray-400 mt-4">
            {selected === 'free' && currentPlan !== 'free'
              ? 'Subscription cancelled at end of billing cycle. No refund issued.'
              : actionType === 'upgrade'
                ? 'Prorated difference charged immediately. Billed monthly via Stripe.'
                : selected !== 'free'
                  ? 'You keep current features until your next billing date.'
                  : ''
            }
          </p>
        )}

      </div>

      {/* ── Upgrade confirmation modal ── */}
      {showUpgradeModal && upgradeDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-brand-charcoal text-center mb-2">
              Upgrade confirmed!
            </h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              You're now on the{' '}
              <span className="font-bold text-brand-charcoal">
                {upgradeDetails.plan.charAt(0).toUpperCase() + upgradeDetails.plan.slice(1)}
              </span>{' '}
              plan. New features are active immediately.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">Charged today</span>
                <span className="font-bold text-brand-charcoal">
                  Prorated difference
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Stripe automatically charges the prorated difference
                for remaining days in your billing cycle.
              </p>
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">From next billing date</span>
                <span className="font-bold text-brand-charcoal">
                  {formatCents(upgradeDetails.nextMonthPrice)}/mo
                </span>
              </div>
            </div>
            <Button fullWidth size="lg" onClick={handleConfirmUpgrade}>
              Go to dashboard
            </Button>
          </div>
        </div>
      )}

      {/* ── Downgrade confirmation modal ── */}
      {showDowngradeModal && downgradeDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <ArrowDownIcon className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-brand-charcoal text-center mb-2">
              Downgrade scheduled
            </h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              Your plan will change from{' '}
              <span className="font-bold text-brand-charcoal">
                {downgradeDetails.currentPlan.charAt(0).toUpperCase() + downgradeDetails.currentPlan.slice(1)}
              </span>
              {' '}to{' '}
              <span className="font-bold text-brand-charcoal">
                {downgradeDetails.plan.charAt(0).toUpperCase() + downgradeDetails.plan.slice(1)}
              </span>
              {' '}on {downgradeDetails.endsAtFormatted}.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-blue-800 leading-relaxed">
                You keep all{' '}
                <span className="font-bold">
                  {downgradeDetails.currentPlan.charAt(0).toUpperCase() + downgradeDetails.currentPlan.slice(1)}
                </span>{' '}
                features until{' '}
                <span className="font-bold">{downgradeDetails.endsAtFormatted}</span>.
                No refund for remaining days.
              </p>
            </div>
            <Button fullWidth size="lg" onClick={handleConfirmDowngrade}>
              Got it
            </Button>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}