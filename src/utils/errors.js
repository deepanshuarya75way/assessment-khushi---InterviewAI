// src/utils/errors.js
// Centralised error message mapping — used across pages for consistent UX.

export const FIREBASE_AUTH_ERRORS = {
  'auth/invalid-credential':      'Invalid email or password. Please check and try again.',
  'auth/user-not-found':          'No account exists with this email address.',
  'auth/wrong-password':          'Incorrect password. Please try again.',
  'auth/email-already-in-use':    'An account with this email already exists.',
  'auth/invalid-email':           'Please enter a valid email address.',
  'auth/weak-password':           'Password must be at least 6 characters.',
  'auth/too-many-requests':       'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed':  'Network error. Check your internet connection.',
  'auth/user-disabled':           'This account has been disabled. Contact support.',
  'auth/operation-not-allowed':   'This sign-in method is not enabled.',
  'auth/popup-closed-by-user':    'Sign-in popup was closed before completing.',
}

export const FIRESTORE_ERRORS = {
  'permission-denied':    'You do not have permission to perform this action.',
  'unavailable':          'Service temporarily unavailable. Please try again.',
  'not-found':            'The requested data could not be found.',
  'already-exists':       'This data already exists.',
  'failed-precondition':  'Database index not yet ready. Try again in a moment.',
}

/**
 * Convert a Firebase error to a human-readable message.
 * Falls back to the raw error message if no mapping exists.
 */
export function friendlyFirebaseError(err) {
  if (!err) return 'An unexpected error occurred.'
  return (
    FIREBASE_AUTH_ERRORS[err.code] ||
    FIRESTORE_ERRORS[err.code]     ||
    err.message                    ||
    'An unexpected error occurred.'
  )
}

/**
 * Convert a Gemini API error to a human-readable message.
 */
export function friendlyGeminiError(err) {
  if (!err) return 'AI service unavailable.'
  const msg = err.message || ''
  if (msg.includes('API key') || msg.includes('VITE_GEMINI'))
    return 'Gemini API key missing or invalid. Add VITE_GEMINI_API_KEY to your .env file.'
  if (msg.includes('quota') || msg.includes('429'))
    return 'Gemini API quota exceeded. Please wait a few minutes and try again.'
  if (msg.includes('503') || msg.includes('unavailable'))
    return 'Gemini API is temporarily unavailable. Retrying…'
  if (msg.includes('No JSON'))
    return 'AI returned an unexpected response. Please try again.'
  return `AI error: ${msg.slice(0, 120)}`
}
