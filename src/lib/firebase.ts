import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Prevents re-initialisation on Next.js hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth    = getAuth(app)
export const storage = getStorage(app)

// ── Firestore with persistent cache ───────────────────
// Browser only — falls back gracefully on:
//   Server-side rendering (Next.js)
//   Instagram in-app browser (limited IndexedDB)
//   Hot reloads in development (already initialized)
function initDb() {
  if (typeof window === 'undefined') {
    // Server-side — no persistence needed
    return getFirestore(app)
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    })
  } catch {
    // Already initialized (hot reload) or not supported (Instagram IAB)
    return getFirestore(app)
  }
}

export const db = initDb()