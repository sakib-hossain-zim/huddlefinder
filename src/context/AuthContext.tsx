'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { UserDoc } from '@/types/user'

interface AuthContextType {
  user:                  User | null
  userDoc:               UserDoc | null
  loading:               boolean
  role:                  'fan' | 'venue_owner' | 'admin' | null
  signIn:                (email: string, password: string) => Promise<void>
  signUp:                (email: string, password: string, firstName: string, lastName: string, role: 'fan' | 'venue_owner') => Promise<void>
  signInWithGoogle:      () => Promise<void>
  signInWithFacebook:    () => Promise<void>
  logOut:                () => Promise<void>
  resetPassword:         (email: string) => Promise<void>
  refreshUserDoc:        () => Promise<void>
  sendVerificationEmail: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user:                  null,
  userDoc:               null,
  loading:               true,
  role:                  null,
  signIn:                async () => {},
  signUp:                async () => {},
  signInWithGoogle:      async () => {},
  signInWithFacebook:    async () => {},
  logOut:                async () => {},
  resetPassword:         async () => {},
  refreshUserDoc:        async () => {},
  sendVerificationEmail: async () => {},
})

async function createUserDoc(user: User, extraData: Partial<UserDoc> = {}) {
  const ref  = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, {
      userId:        user.uid,
      email:         user.email,
      firstName:     extraData.firstName || user.displayName?.split(' ')[0] || '',
      lastName:      extraData.lastName  || user.displayName?.split(' ')[1] || '',
      role:          extraData.role      || 'fan',
      authProviders: extraData.authProviders || ['email'],
      emailVerified: user.emailVerified,
      favSports:     [],
      favVenues:     [],
      fcmTokens:     [],
      totalRsvps:    0,
      notifPrefs:    { email: true, push: true, sms: false },
      createdAt:     serverTimestamp(),
      lastLoginAt:   serverTimestamp(),
    })
  } else {
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true })
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ── Read auth state synchronously on mount ───────────
  // auth.currentUser is available immediately from localStorage
  // No need to wait for onAuthStateChanged for initial render
  const [user,    setUser]    = useState<User | null>(auth.currentUser)
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [loading, setLoading] = useState(!auth.currentUser)

  useEffect(() => {
    // ── Pre-fetch userDoc immediately if already logged in ──
    // Runs in parallel with onAuthStateChanged
    // Eliminates the 300-500ms wait for already-authed users
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
        if (snap.exists()) setUserDoc(snap.data() as UserDoc)
      })
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      // ── Set loading false as soon as auth state is known ──
      // Don't block on userDoc Firestore fetch
      setLoading(false)

      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null)
      } else {
        setUserDoc(null)
      }
    })

    return () => unsubscribe()
  }, [])

  async function refreshUserDoc() {
    if (!auth.currentUser) return
    await auth.currentUser.reload()
    setUser({ ...auth.currentUser } as User)
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid))
    if (snap.exists()) setUserDoc(snap.data() as UserDoc)
  }

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'fan' | 'venue_owner'
  ) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await createUserDoc(user, { firstName, lastName, role, authProviders: ['email'] })
    setUserDoc({
      userId:        user.uid,
      email:         user.email ?? email,
      firstName,
      lastName,
      role,
      authProviders: ['email'],
      emailVerified: false,
      favSports:     [],
      favVenues:     [],
      fcmTokens:     [],
      totalRsvps:    0,
      notifPrefs:    { email: true, push: true, sms: false },
    })
    await sendEmailVerification(user)
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const { user } = await signInWithPopup(auth, provider)
    await createUserDoc(user, { authProviders: ['google'] })
  }

  const signInWithFacebook = async () => {
    const provider = new FacebookAuthProvider()
    const { user } = await signInWithPopup(auth, provider)
    await createUserDoc(user, { authProviders: ['facebook'] })
  }

  const logOut = async () => {
    await signOut(auth)
    setUserDoc(null)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser)
    }
  }

  const role = userDoc?.role ?? null

  return (
    <AuthContext.Provider value={{
      user,
      userDoc,
      loading,
      role,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithFacebook,
      logOut,
      resetPassword,
      refreshUserDoc,
      sendVerificationEmail,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)