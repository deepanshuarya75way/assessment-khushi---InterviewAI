// src/components/ui/Navbar.jsx
// FIX 1: logout() now navigates to /login after clearing state — was causing
//         a flash of the dashboard before redirect.
// FIX 2: Mobile nav links added (were missing — only desktop had nav).
// FIX 3: Active route highlighting using useLocation.
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User, Brain, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_LINKS = [
  { to: '/dashboard',        label: 'Dashboard' },
  { to: '/interview/setup',  label: 'New Interview' },
  { to: '/history',          label: 'History' },
]

export default function Navbar() {
  const { user, logout }  = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      // Always navigate to login, even if logout threw
      navigate('/login', { replace: true })
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <header className="sticky top-0 z-40 bg-surface-900/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center group-hover:bg-brand-500 transition-colors">
            <Brain size={20} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">InterviewAI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive(link.to)
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* User pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700 border border-white/5">
            <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
              <User size={12} className="text-white" />
            </div>
            <span className="text-slate-300 text-sm font-medium truncate max-w-[120px]">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm transition-all duration-150"
            title="Sign out"
          >
            <LogOut size={14} /> Logout
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-surface-900 px-4 py-3 space-y-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive(link.to)
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
