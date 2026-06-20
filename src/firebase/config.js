// src/firebase/config.js
// FIX 1: Guard against missing env vars with clear error message in dev.
// FIX 2: Prevent duplicate Firebase app initialization (causes errors on HMR).
// FIX 3: Added auth persistence import to survive page refreshes.
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

// In development, warn loudly if env vars are missing
if (import.meta.env.DEV) {
  required.forEach((key) => {
    if (!import.meta.env[key]) {
      console.error(
        `[Firebase] Missing env var: ${key}\n` +
        'Copy .env.example → .env and fill in your Firebase credentials.'
      )
    }
  })
}

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Prevent "Firebase: Firebase App named '[DEFAULT]' already exists" on HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db   = getFirestore(app)

// Ensure auth session persists across browser refreshes (fixes "stuck on login" bug)
setPersistence(auth, browserLocalPersistence).catch(console.error)

export default app
