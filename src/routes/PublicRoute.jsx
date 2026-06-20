// src/routes/PublicRoute.jsx
// NEW FILE — prevents authenticated users from seeing /login or /signup
// Redirects them straight to /dashboard instead.
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  if (user)    return <Navigate to="/dashboard" replace />
  return children
}
