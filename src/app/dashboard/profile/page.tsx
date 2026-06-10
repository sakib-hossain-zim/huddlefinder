'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
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
  UserCircleIcon,
  LockClosedIcon,
  ChevronLeftIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'

const SPORTS = [
  { value: 'football',  label: 'Football',  emoji: '⚽' },
  { value: 'nfl',       label: 'NFL',        emoji: '🏈' },
  { value: 'nhl',       label: 'NHL',        emoji: '🏒' },
  { value: 'nba',       label: 'NBA',        emoji: '🏀' },
  { value: 'rugby',     label: 'Rugby',      emoji: '🏉' },
  { value: 'tennis',    label: 'Tennis',     emoji: '🎾' },
  { value: 'f1',        label: 'Formula 1',  emoji: '🏎️' },
  { value: 'cricket',   label: 'Cricket',    emoji: '🏏' },
  { value: 'world-cup', label: 'World Cup',  emoji: '🏆' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, userDoc, refreshUserDoc, logOut } = useAuth()
  const { toasts, toast, closeToast } = useToast()

  // Profile form
  const [firstName,   setFirstName]   = useState(userDoc?.firstName ?? '')
  const [lastName,    setLastName]    = useState(userDoc?.lastName  ?? '')
  const [favSports,   setFavSports]   = useState<string[]>(userDoc?.favSports ?? [])
  const [saving,      setSaving]      = useState(false)
  const [profileError, setProfileError] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]      = useState('')
  const [confirmPassword, setConfirmPassword]  = useState('')
  const [showPasswords,   setShowPasswords]    = useState(false)
  const [savingPassword,  setSavingPassword]   = useState(false)
  const [passwordError,   setPasswordError]    = useState('')

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword,    setDeletePassword]    = useState('')
  const [deletingAccount,   setDeletingAccount]   = useState(false)
  const [deleteError,       setDeleteError]       = useState('')

  const isEmailAuth = user?.providerData.some(p => p.providerId === 'password')

  function toggleSport(sport: string) {
    setFavSports(prev =>
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    )
  }

  async function handleSaveProfile() {
    if (!user) return
    if (!firstName.trim()) { setProfileError('First name is required'); return }
    if (!lastName.trim())  { setProfileError('Last name is required');  return }

    setSaving(true)
    setProfileError('')
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        favSports,
      })
      await refreshUserDoc()
      toast.success('Profile saved successfully')
    } catch (err) {
      console.error(err)
      setProfileError('Failed to save. Please try again.')
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSports() {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { favSports })
      await refreshUserDoc()
      toast.success('Favourite sports saved')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save sports. Please try again.')
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
        toast.error('Current password is incorrect.')
      } else {
        setPasswordError('Failed to update password. Please try again.')
        toast.error('Failed to update password. Please try again.')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user || !auth.currentUser) return

    if (isEmailAuth) {
      if (!deletePassword) {
        setDeleteError('Please enter your password to confirm')
        return
      }
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
      const rsvpSnap = await getDocs(query(
        collection(db, 'rsvps'),
        where('userId', '==', user.uid)
      ))
      await Promise.all(rsvpSnap.docs.map(d => deleteDoc(d.ref)))
      await deleteDoc(doc(db, 'users', user.uid))
      await deleteUser(auth.currentUser!)
      router.push('/')
    } catch (err: any) {
      console.error(err)
      setDeleteError('Failed to delete account. Please try again.')
      toast.error('Failed to delete account. Please try again.')
      setDeletingAccount(false)
    }
  }

  async function handleLogOut() {
    await logOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-red transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-charcoal">My profile</h1>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
        </div>

        {/* ── Avatar ── */}
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

          {profileError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {profileError}
            </div>
          )}

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

            <Button
              fullWidth
              size="md"
              loading={saving}
              onClick={handleSaveProfile}
            >
              Save changes
            </Button>
          </div>
        </div>

        {/* ── Favourite sports ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-base font-bold text-brand-charcoal mb-1">
            Favourite sports
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            We'll show you relevant events for your interests
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {SPORTS.map(sport => (
              <button
                key={sport.value}
                onClick={() => toggleSport(sport.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  favSports.includes(sport.value)
                    ? 'border-brand-red bg-brand-red-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{sport.emoji}</span>
                <span className={`text-xs font-semibold ${
                  favSports.includes(sport.value)
                    ? 'text-brand-red'
                    : 'text-gray-600'
                }`}>
                  {sport.label}
                </span>
              </button>
            ))}
          </div>

          <Button
            fullWidth
            size="md"
            loading={saving}
            onClick={handleSaveSports}
          >
            Save sports
          </Button>
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
                      ? <EyeIcon className="w-4 h-4" />
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
                fullWidth
                size="md"
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
          <h2 className="text-base font-bold text-brand-charcoal mb-1">
            Account
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Signed in as {user?.email}
          </p>
          <button
            onClick={handleLogOut}
            className="w-full py-3 px-4 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* ── Delete account ── */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-red-600 mb-1">
            Delete account
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 px-4 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            Delete my account
          </button>
        </div>

      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-brand-charcoal mb-2">
              Delete your account?
            </h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              This will permanently delete your account, all your RSVPs and your data.
              This action cannot be undone.
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

      {/* ── Toast notifications ── */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  )
}