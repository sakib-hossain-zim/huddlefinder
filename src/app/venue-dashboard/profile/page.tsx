'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  doc, updateDoc, deleteDoc, getDoc,
} from 'firebase/firestore'
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import {
  ChevronLeftIcon,
  UserCircleIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline'

import { clsx } from 'clsx'

export default function VenueOwnerProfilePage() {
  const router                            = useRouter()
  const { user, userDoc, refreshUserDoc, logOut } = useAuth()
  const { toasts, toast, closeToast }     = useToast()

  // Personal info
  const [firstName, setFirstName] = useState(userDoc?.firstName ?? '')
  const [lastName,  setLastName]  = useState(userDoc?.lastName  ?? '')
  const [saving,    setSaving]    = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]      = useState('')
  const [confirmPassword, setConfirmPassword]  = useState('')
  const [showPasswords,   setShowPasswords]    = useState(false)
  const [savingPassword,  setSavingPassword]   = useState(false)
  const [passwordError,   setPasswordError]    = useState('')

  // Venue + subscription state
  const [venue,           setVenue]           = useState<any>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling,      setCancelling]      = useState(false)
  const [reactivating, setCancelReactivating] = useState(false)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword,    setDeletePassword]    = useState('')
  const [deletingAccount,   setDeletingAccount]   = useState(false)
  const [deleteError,       setDeleteError]       = useState('')

  const isEmailAuth = user?.providerData.some(p => p.providerId === 'password')

  // ── Fetch venue for subscription info ─────────────
  useEffect(() => {
    if (userDoc?.venueId) {
      getDoc(doc(db, 'venues', userDoc.venueId)).then(snap => {
        if (snap.exists()) setVenue({ venueId: snap.id, ...snap.data() })
      })
    }
  }, [userDoc])

  // ── Helper to format Firestore timestamp ──────────
  function formatEndDate(subscriptionEndsAt: any): string {
    if (!subscriptionEndsAt) return 'end of billing cycle'
    const date = subscriptionEndsAt?.toDate
      ? subscriptionEndsAt.toDate()
      : subscriptionEndsAt?._seconds
        ? new Date(subscriptionEndsAt._seconds * 1000)
        : new Date(subscriptionEndsAt)
    return date.toLocaleDateString('en-CA', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  async function handleSaveProfile() {
    if (!user) return
    if (!firstName.trim()) { toast.error('First name is required'); return }
    if (!lastName.trim())  { toast.error('Last name is required');  return }

    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
      })
      await refreshUserDoc()
      toast.success('Profile saved successfully')
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!user || !auth.currentUser) return
    if (!currentPassword)                { setPasswordError('Current password is required'); return }
    if (newPassword.length < 8)          { setPasswordError('New password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword)  { setPasswordError('Passwords do not match'); return }

    setSavingPassword(true)
    setPasswordError('')
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully')
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect.')
      } else {
        setPasswordError('Failed to update password. Please try again.')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  // ── Cancel subscription ───────────────────────────
  // Sets cancel_at_period_end = true on Stripe
  // Venue keeps current plan benefits until billing cycle ends
  // Firestore plan only changes when webhook fires at period end
  async function handleCancelSubscription() {
    if (!user || !userDoc?.venueId) return
    setCancelling(true)
    try {
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

      // Update local venue state immediately so UI reflects cancellation
      setVenue((prev: any) => ({
        ...prev,
        subscriptionStatus: 'cancelling',
        subscriptionEndsAt: new Date(data.endsAt),
      }))

      setShowCancelModal(false)
      toast.success(`Cancelled — ${data.plan} benefits active until ${data.endsAtFormatted}`)
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setCancelling(false)
    }
  }


  // Add reactivate function
  async function handleReactivate() {
    if (!user || !userDoc?.venueId) return
    setCancelReactivating(true)
    try {
      const res  = await fetch('/api/stripe/reactivate-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:  user.uid,
          venueId: userDoc.venueId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to reactivate. Please try again.')
        return
      }

      // Update local venue state to clear banners
      setVenue((prev: any) => ({
        ...prev,
        subscriptionStatus: 'active',
        downgradingTo:      null,
        subscriptionEndsAt: null,
      }))

      const planName = data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
      toast.success(`${planName} plan kept! ✓`)
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setCancelReactivating(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user || !auth.currentUser) return
    if (isEmailAuth) {
      if (!deletePassword) { setDeleteError('Please enter your password to confirm'); return }
      try {
        const credential = EmailAuthProvider.credential(user.email!, deletePassword)
        await reauthenticateWithCredential(auth.currentUser, credential)
      } catch {
        setDeleteError('Incorrect password. Please try again.')
        return
      }
    }
    setDeletingAccount(true)
    setDeleteError('')
    try {
      await deleteDoc(doc(db, 'users', user.uid))
      await deleteUser(auth.currentUser!)
      router.push('/')
    } catch {
      setDeleteError('Failed to delete account. Please try again.')
      setDeletingAccount(false)
    }
  }

  async function handleLogOut() {
    await logOut()
    router.push('/')
  }

  // ── Subscription section logic ────────────────────
  const isActivePaidPlan = venue?.subscriptionStatus === 'active' && venue?.plan !== 'free'
  const isCancelling     = venue?.subscriptionStatus === 'cancelling'
  const isDowngrading    = venue?.subscriptionStatus === 'downgrading'
  const isFreePlan       = !venue?.subscriptionStatus
    || venue?.subscriptionStatus === 'cancelled'
    || venue?.plan === 'free'

  const planName = venue?.plan
    ? venue.plan.charAt(0).toUpperCase() + venue.plan.slice(1)
    : 'Free'

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

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-charcoal">My profile</h1>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-brand-red rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {userDoc?.firstName?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
        </div>

        {/* ── Personal info ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-base font-bold text-brand-charcoal mb-4 flex items-center gap-2">
            <UserCircleIcon className="w-5 h-5 text-brand-red" />
            Personal info
          </h2>
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
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-1.5">
                Email address
              </label>
              <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400">
                {user?.email}
              </div>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <Button fullWidth size="md" loading={saving} onClick={handleSaveProfile}>
              Save changes
            </Button>
          </div>
        </div>

        {/* ── Venue shortcut ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-base font-bold text-brand-charcoal mb-4 flex items-center gap-2">
            <BuildingStorefrontIcon className="w-5 h-5 text-brand-red" />
            Your venue
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/venue-dashboard/settings')}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-brand-red border border-brand-red rounded-xl hover:bg-brand-red-light transition-colors"
            >
              Edit venue profile
            </button>
            <button
              onClick={() => router.push('/venue-dashboard/upgrade')}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Change plan
            </button>
          </div>
        </div>

        {/* ── Subscription ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-base font-bold text-brand-charcoal mb-4 flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5 text-brand-red" />
            Subscription
          </h2>

          {/* ── Active paid subscription ── */}
          {(isActivePaidPlan || isDowngrading) && (
            <div className="space-y-3">

              {/* Plan status row */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-brand-charcoal">
                    {planName} plan
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {venue?.plan === 'starter' ? '$49/mo' : '$99/mo'}
                    {isDowngrading
                      ? ` · Downgrading to ${venue?.downgradingTo} on ${formatEndDate(venue?.subscriptionEndsAt)}`
                      : ' · Renews monthly'
                    }
                  </p>
                </div>
                <span className={clsx(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  isDowngrading
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-green-50 text-green-600'
                )}>
                  {isDowngrading ? 'Downgrading' : 'Active'}
                </span>
              </div>

              {/* Downgrading info banner */}
              {isDowngrading && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    You keep {planName} features until{' '}
                    <span className="font-bold">{formatEndDate(venue?.subscriptionEndsAt)}</span>.
                    Then you'll move to {venue?.downgradingTo?.charAt(0).toUpperCase() + venue?.downgradingTo?.slice(1)}.
                  </p>
                </div>
              )}

              {/* Keep current plan — shown when downgrading */}
              {isDowngrading && (
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-brand-red border border-brand-red rounded-xl hover:bg-brand-red-light transition-colors disabled:opacity-50"
                >
                  {reactivating ? 'Updating...' : `Keep my ${planName} plan`}
                </button>
              )}

              {/* Upgrade option for Starter */}
              {venue?.plan === 'starter' && !isDowngrading && (
                <button
                  onClick={() => router.push('/venue-dashboard/upgrade')}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-brand-red border border-brand-red rounded-xl hover:bg-brand-red-light transition-colors"
                >
                  Upgrade to Pro — $99/mo
                </button>
              )}

              {/* Downgrade option for Pro */}
              {venue?.plan === 'pro' && !isDowngrading && (
                <button
                  onClick={() => router.push('/venue-dashboard/upgrade')}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Switch to Starter — $49/mo
                </button>
              )}

              {/* ── Cancel — always shown for active or downgrading ── */}
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-2.5 px-4 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel subscription
              </button>
            </div>
          )}

        {/* ── Cancelling — benefits still active ── */}
          {isCancelling && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-bold text-amber-800">
                  Cancellation scheduled
                </p>
                <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                  Your {planName} benefits are active until{' '}
                  <span className="font-bold">
                    {formatEndDate(venue?.subscriptionEndsAt)}
                  </span>
                  . After that your account moves to Free.
                </p>
              </div>
              {/* Reactivate — calls API directly */}
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="w-full py-2.5 px-4 text-sm font-semibold text-brand-red border border-brand-red rounded-xl hover:bg-brand-red-light transition-colors disabled:opacity-50"
              >
                {reactivating ? 'Updating...' : `Keep my ${planName} plan`}
              </button>
              {/* No cancel button — already cancelling */}
            </div>
          )}

        {/* ── Free plan ── */}
          {isFreePlan && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-brand-charcoal">Free plan</p>
                  <p className="text-xs text-gray-400 mt-0.5">No active subscription</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/venue-dashboard/upgrade')}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-red rounded-xl hover:bg-brand-red-dark transition-colors"
              >
                Upgrade to Starter or Pro
              </button>
            </div>
          )}
        </div>

        {/* ── Change password ── */}
        {isEmailAuth && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="text-base font-bold text-brand-charcoal mb-4 flex items-center gap-2">
              <LockClosedIcon className="w-5 h-5 text-brand-red" />
              Change password
            </h2>
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {passwordError}
              </div>
            )}
            <div className="space-y-4">
              <Input
                label="Current password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                leftIcon={<LockClosedIcon className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPasswords(p => !p)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords
                      ? <EyeSlashIcon className="w-4 h-4" />
                      : <EyeIcon className="w-4 h-4" />
                    }
                  </button>
                }
              />
              <Input
                label="New password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                leftIcon={<LockClosedIcon className="w-4 h-4" />}
              />
              <Input
                label="Confirm new password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                leftIcon={<LockClosedIcon className="w-4 h-4" />}
              />
              <Button
                fullWidth size="md"
                loading={savingPassword}
                onClick={handleChangePassword}
              >
                Update password
              </Button>
            </div>
          </div>
        )}

        {/* ── Sign out ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-base font-bold text-brand-charcoal mb-1">Account</h2>
          <p className="text-xs text-gray-400 mb-4">Signed in as {user?.email}</p>
          <button
            onClick={handleLogOut}
            className="w-full py-3 px-4 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* ── Delete account ── */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-red-600 mb-1">Delete account</h2>
          <p className="text-xs text-gray-400 mb-4">
            Permanently delete your account. Your venue listing will remain
            on Huddlefinder but become unclaimed.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 px-4 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            Delete my account
          </button>
        </div>

      </div>

      {/* ── Cancel subscription modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-brand-charcoal mb-2">
              Cancel {planName} plan?
            </h3>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <p className="text-sm text-amber-800 leading-relaxed">
                Your benefits stay active until the end of your current
                billing cycle. No refund will be issued.
              </p>
            </div>

            {/* What they'll lose */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                After cancellation you'll lose:
              </p>
              <div className="space-y-1.5">
                {(venue?.plan === 'starter' ? [
                  'Ticket sales',
                  'Priority listing in search',
                  '5 featured event promotions/month',
                  '$5 extra event promotions',
                ] : [
                  'Everything in Starter',
                  'Lower commission (6.5%)',
                  'Featured listing badge',
                  'Unlimited event promotions',
                ]).map(feature => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-red-400 font-bold">✗</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {/* Keep plan — primary action */}
              <Button fullWidth size="lg" onClick={() => setShowCancelModal(false)}>
                Keep my {planName} plan
              </Button>
              {/* Cancel — secondary */}
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="w-full py-3 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {cancelling
                  ? 'Cancelling...'
                  : 'Cancel — keep benefits till end of cycle'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete account modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-brand-charcoal mb-2">
              Delete your account?
            </h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              This will permanently delete your account. Your venue listing
              will remain on Huddlefinder but become unclaimed. This cannot be undone.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {deleteError}
              </div>
            )}
            {isEmailAuth && (
              <div className="mb-4">
                <Input
                  label="Enter your password to confirm"
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Your current password"
                  leftIcon={<LockClosedIcon className="w-4 h-4" />}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletePassword('')
                  setDeleteError('')
                }}
                className="flex-1 py-3 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-3 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}