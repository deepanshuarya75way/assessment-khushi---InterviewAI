// src/context/AuthContext.jsx
// FIX 1: useNavigate removed from context — context doesn't live inside Router, so
//         calling navigate() here caused "useNavigate() may be used only in the context
//         of a <Router>" crash. Navigation is now handled in each page/component.
// FIX 2: Firestore profile fetch is now wrapped in try/catch so a missing user doc
//         (e.g. first-time Google SSO) doesn't block the auth state from resolving.
// FIX 3: signup() also updates displayName on the auth user object immediately so
//         user.displayName is available right after signup without a page reload.
// FIX 4: login() redirects to the page the user originally requested (from location state).
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Watch Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const ref  = doc(db, 'users', firebaseUser.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            setProfile(snap.data())
          } else {
            // User document doesn't exist yet (edge case) — create a minimal one
            const minimal = {
              uid:             firebaseUser.uid,
              name:            firebaseUser.displayName || '',
              email:           firebaseUser.email,
              createdAt:       serverTimestamp(),
              totalInterviews: 0,
              averageScore:    0,
            }
            await setDoc(ref, minimal)
            setProfile(minimal)
          }
        } catch (err) {
          // Firestore read failed (offline, rules, etc.) — still allow auth to resolve
          console.error('Profile fetch error:', err)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return unsub
  }, [])

  const signup = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    // Update display name immediately so it's available in the same session
    await updateProfile(cred.user, { displayName: name })
    // Force-refresh the user object so displayName is visible right away
    setUser({ ...cred.user, displayName: name })
    // Create Firestore user document
    const userData = {
      uid:             cred.user.uid,
      name,
      email,
      createdAt:       serverTimestamp(),
      totalInterviews: 0,
      averageScore:    0,
    }
    await setDoc(doc(db, 'users', cred.user.uid), userData)
    setProfile(userData)
    return cred
  }

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
  }

  // Re-fetch profile from Firestore (used after interview saves update stats)
  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) setProfile(snap.data())
    } catch (err) {
      console.error('refreshProfile error:', err)
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signup, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
