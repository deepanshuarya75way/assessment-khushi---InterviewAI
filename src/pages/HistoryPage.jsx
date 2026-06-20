// src/pages/HistoryPage.jsx
// FIX 1: getUserInterviews was called without null-checking user — crashed if
//         component mounted before auth resolved.
// FIX 2: Added error state for when Firestore fails.
// FIX 3: Timestamp formatting now handles both Firestore Timestamps and plain numbers.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CalendarDays, Filter, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getUserInterviews } from '../services/firestoreService'
import Navbar from '../components/ui/Navbar'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function HistoryPage() {
  const { user }  = useAuth()
  const [interviews, setInterviews] = useState([])
  const [filtered,   setFiltered]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    if (!user?.uid) return
    setLoading(true)
    getUserInterviews(user.uid, 50)
      .then(data  => { setInterviews(data); setFiltered(data) })
      .catch(err  => setError(err.message || 'Failed to load history.'))
      .finally(() => setLoading(false))
  }, [user?.uid])

  useEffect(() => {
    setFiltered(roleFilter === 'all' ? interviews : interviews.filter(i => i.role === roleFilter))
  }, [roleFilter, interviews])

  const roles = [...new Set(interviews.map(i => i.role))].filter(Boolean)

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="section-label">History</p>
            <h1 className="text-3xl font-bold text-white">Past Interviews</h1>
          </div>
          {roles.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                className="input-field py-2 text-sm w-auto"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" label="Loading interviews…" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-slate-400 mb-4">
              {roleFilter !== 'all' ? `No ${roleFilter} interviews found.` : 'No interviews yet.'}
            </p>
            <Link to="/interview/setup" className="btn-primary">Start an Interview</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((iv, idx) => (
              <Link key={iv.id} to={`/report/${iv.id}`} className="block group">
                <div
                  className="glass-card-hover p-5 flex items-center gap-4 animate-fadeIn"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 font-bold text-sm text-white"
                    style={{ borderColor: scoreColor(iv.overallScore) }}
                  >
                    {(iv.overallScore || 0).toFixed(1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{iv.role}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-slate-400 text-xs">{iv.difficulty}</span>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <CalendarDays size={10} /> {formatDate(iv.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold" style={{ color: scoreColor(iv.overallScore) }}>
                      {iv.readinessPercentage || 0}% ready
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {iv.questions?.length || 0} questions
                    </p>
                  </div>

                  <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function formatDate(ts) {
  if (!ts) return ''
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

function scoreColor(score) {
  if (!score) return '#64748b'
  if (score >= 8) return '#10b981'
  if (score >= 6) return '#6366f1'
  if (score >= 4) return '#f59e0b'
  return '#ef4444'
}
