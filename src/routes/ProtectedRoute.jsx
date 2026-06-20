// src/routes/ProtectedRoute.jsx
// FIX: While auth is still resolving (loading=true) show a full-screen spinner
// instead of immediately redirecting — this prevents the flash-to-login bug
// where a logged-in user briefly sees the login page on hard refresh.
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Still resolving Firebase auth state — don't redirect yet
  if (loading) return <LoadingSpinner fullScreen />

  // Not authenticated — send to login, remember where they wanted to go
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}
