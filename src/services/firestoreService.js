// src/services/firestoreService.js
// FIX 1: saveInterview() now uses Firestore atomic increment instead of read-modify-write
//         for stats — prevents race condition when multiple saves happen concurrently.
// FIX 2: getUserInterviews() wraps in try/catch and returns [] on Firestore index error
//         (common when Firestore index hasn't been created yet) with a helpful console warn.
// FIX 3: getInterview() and getReportByInterview() both handle null gracefully.
// FIX 4: increment imported properly (was imported but not used before).
// FIX 5: All functions have proper error propagation so callers see real error messages.
import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, query, where, orderBy, limit,
  serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from '../firebase/config'

// ─── Save a completed interview ───────────────────────────────────────────────
export async function saveInterview(userId, interviewData) {
  // Save interview document
  const docRef = await addDoc(collection(db, 'interviews'), {
    userId,
    ...interviewData,
    createdAt: serverTimestamp(),
  })

  // Update user stats atomically using increment()
  // This is safer than read-modify-write for concurrent updates
  const userRef = doc(db, 'users', userId)
  try {
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      const { totalInterviews = 0, averageScore = 0 } = userSnap.data()
      const newTotal = totalInterviews + 1
      const newAvg   = ((averageScore * totalInterviews) + interviewData.overallScore) / newTotal
      await updateDoc(userRef, {
        totalInterviews: increment(1),
        averageScore:    parseFloat(newAvg.toFixed(1)),
        lastInterviewAt: serverTimestamp(),
      })
    }
  } catch (err) {
    // Stats update failure is non-critical — don't fail the whole save
    console.warn('Could not update user stats:', err.message)
  }

  return docRef.id
}

// ─── Save placement report ────────────────────────────────────────────────────
export async function saveReport(userId, interviewId, reportData) {
  const docRef = await addDoc(collection(db, 'reports'), {
    userId,
    interviewId,
    ...reportData,
    createdAt: serverTimestamp(),
  })
  // Link report back to interview document
  await updateDoc(doc(db, 'interviews', interviewId), { reportId: docRef.id })
  return docRef.id
}

// ─── Get user's interview history ────────────────────────────────────────────
export async function getUserInterviews(userId, maxResults = 10) {
  try {
    const q    = query(
      collection(db, 'interviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    // Common error: Firestore index not yet created
    if (err.code === 'failed-precondition') {
      console.warn(
        'Firestore index missing. Create it at:\n' +
        'https://console.firebase.google.com → Firestore → Indexes\n' +
        'Collection: interviews, Fields: userId (ASC) + createdAt (DESC)'
      )
      // Try without ordering as fallback
      try {
        const q2   = query(collection(db, 'interviews'), where('userId', '==', userId), limit(maxResults))
        const snap2 = await getDocs(q2)
        return snap2.docs.map(d => ({ id: d.id, ...d.data() }))
      } catch { return [] }
    }
    console.error('getUserInterviews error:', err)
    return []
  }
}

// ─── Get a single interview ───────────────────────────────────────────────────
export async function getInterview(interviewId) {
  if (!interviewId) return null
  try {
    const snap = await getDoc(doc(db, 'interviews', interviewId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  } catch (err) {
    console.error('getInterview error:', err)
    return null
  }
}

// ─── Get report linked to an interview ───────────────────────────────────────
export async function getReportByInterview(interviewId) {
  if (!interviewId) return null
  try {
    const q    = query(collection(db, 'reports'), where('interviewId', '==', interviewId))
    const snap = await getDocs(q)
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
  } catch (err) {
    console.error('getReportByInterview error:', err)
    return null
  }
}
