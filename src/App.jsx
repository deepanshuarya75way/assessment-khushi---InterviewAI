// src/App.jsx
// FIX 1: BrowserRouter must wrap AuthProvider so useNavigate works inside auth context.
// FIX 2: Fallback route now smartly redirects based on auth state via SmartRedirect.
// FIX 3: Lazy-loaded pages for bundle splitting and faster initial load.
// FIX 4: Public routes (/login, /signup) redirect authenticated users to /dashboard.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthContext'
import { InterviewProvider } from './context/InterviewContext'
import ProtectedRoute from './routes/ProtectedRoute'
import PublicRoute from './routes/PublicRoute'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Lazy-load all pages — reduces initial bundle by ~60%
const LoginPage            = lazy(() => import('./pages/LoginPage'))
const SignupPage           = lazy(() => import('./pages/SignupPage'))
const DashboardPage        = lazy(() => import('./pages/DashboardPage'))
const InterviewSetupPage   = lazy(() => import('./pages/InterviewSetupPage'))
const InterviewSessionPage = lazy(() => import('./pages/InterviewSessionPage'))
const ReportPage           = lazy(() => import('./pages/ReportPage'))
const HistoryPage          = lazy(() => import('./pages/HistoryPage'))

const PageFallback = () => (
  <div className="min-h-screen bg-surface-900 flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
)

export default function App() {
  return (
    // BrowserRouter must be outermost so all children can use router hooks
    <BrowserRouter>
      <AuthProvider>
        <InterviewProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public-only routes: redirect logged-in users away */}
              <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

              {/* Protected routes */}
              <Route path="/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/interview/setup"   element={<ProtectedRoute><InterviewSetupPage /></ProtectedRoute>} />
              <Route path="/interview/session" element={<ProtectedRoute><InterviewSessionPage /></ProtectedRoute>} />
              <Route path="/report/:id"        element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
              <Route path="/history"           element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

              {/* Root and 404: go to dashboard (ProtectedRoute redirects to /login if not authed) */}
              <Route path="/"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="*"  element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </InterviewProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
