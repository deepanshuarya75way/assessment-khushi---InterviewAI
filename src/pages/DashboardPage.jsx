// src/pages/DashboardPage.jsx
// FIX 1: getUserInterviews called with userId only after user is confirmed non-null.
//         Was crashing with "Cannot read properties of null" on first render.
// FIX 2: useEffect dep array corrected — was [user] but didn't guard against user being null.
// FIX 3: profile?.totalInterviews can be undefined during first load — default to 0.
// FIX 4: Math.max on empty array returns -Infinity — guard added.
// PERF: Memoised avgReadiness with useMemo instead of computing on every render.
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, TrendingUp, Target, Award, ChevronRight, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getUserInterviews } from '../services/firestoreService'
import Navbar from '../components/ui/Navbar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ReadinessGauge from '../components/ui/ReadinessGauge'

const ROLE_COLORS = {
  'Frontend Developer':   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Backend Developer':    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Full Stack Developer': 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  'Java Developer':       'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Python Developer':     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Data Analyst':         'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Digital Marketing':    'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'HR Interview':         'bg-green-500/10 text-green-400 border-green-500/20',
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!user?.uid) return   // guard: don't call with null
    setLoading(true)
    getUserInterviews(user.uid, 5)
      .then(data  => setInterviews(data))
      .catch(()   => setInterviews([]))
      .finally(() => setLoading(false))
  }, [user?.uid])   // depend on uid, not the whole user object

  const avgReadiness = useMemo(() => {
    if (!interviews.length) return 0
    return Math.round(
      interviews.reduce((a, i) => a + (i.readinessPercentage || 0), 0) / interviews.length
    )
  }, [interviews])

  const bestScore = useMemo(() => {
    if (!interviews.length) return null
    const scores = interviews.map(i => i.overallScore || 0).filter(s => s > 0)
    return scores.length ? Math.max(...scores) : null
  }, [interviews])

  const name     = user?.displayName?.split(' ')[0] || 'there'
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fadeIn">
          <div>
            <p className="text-slate-400 text-sm">{greeting} 👋</p>
            <h1 className="text-3xl font-bold text-white">{name}</h1>
          </div>
          <Link to="/interview/setup" className="btn-primary flex items-center gap-2 self-start">
            <Play size={16} /> Start New Interview
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Clock size={20} className="text-brand-400" />}
            label="Interviews Taken"
            value={profile?.totalInterviews ?? 0}
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-emerald-400" />}
            label="Average Score"
            value={profile?.averageScore ? `${profile.averageScore}/10` : '—'}
          />
          <StatCard
            icon={<Target size={20} className="text-violet-400" />}
            label="Avg Readiness"
            value={`${avgReadiness}%`}
          />
          <StatCard
            icon={<Award size={20} className="text-amber-400" />}
            label="Best Score"
            value={bestScore !== null ? `${bestScore.toFixed(1)}/10` : '—'}
          />
        </div>

        {/* Body grid */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Recent interviews */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Interviews</h2>
              {interviews.length > 0 && (
                <Link to="/history" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
                  View all <ChevronRight size={13} />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><LoadingSpinner label="Loading history…" /></div>
            ) : interviews.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {interviews.map(iv => (
                  <Link key={iv.id} to={`/report/${iv.id}`} className="block group">
                    <div className="glass-card-hover p-4 flex items-center gap-4">
                      <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium shrink-0 ${ROLE_COLORS[iv.role] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {iv.role?.split(' ')[0] || 'Role'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{iv.role}</p>
                        <p className="text-slate-400 text-xs">{iv.difficulty} · {formatDate(iv.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold">
                          {(iv.overallScore || 0).toFixed(1)}
                          <span className="text-slate-500 font-normal text-xs">/10</span>
                        </p>
                        <p className="text-xs" style={{ color: readinessColor(iv.readinessPercentage) }}>
                          {iv.readinessPercentage || 0}% ready
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Readiness sidebar */}
          <div className="glass-card p-6 flex flex-col items-center gap-5">
            <div className="w-full text-center">
              <p className="section-label">Placement Readiness</p>
              <p className="text-slate-400 text-xs">
                Based on your last {interviews.length} interview{interviews.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ReadinessGauge value={avgReadiness} />
            <div className="w-full pt-4 border-t border-white/5 space-y-2.5">
              <Tip icon="🎯" text="Practice daily for best results" />
              <Tip icon="📈" text="Focus on your weakest areas first" />
              <Tip icon="🎤" text="Speak clearly and at a steady pace" />
            </div>
            <Link to="/interview/setup" className="btn-primary w-full flex items-center justify-center gap-2">
              <Zap size={14} /> Practice Now
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 text-xs font-medium">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function Tip({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-slate-400 text-xs">
      <span>{icon}</span><span>{text}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="glass-card p-10 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
        <Play size={28} className="text-brand-400" />
      </div>
      <div>
        <p className="text-white font-semibold text-lg">No interviews yet</p>
        <p className="text-slate-400 text-sm mt-1">Start your first mock interview to track your progress.</p>
      </div>
      <Link to="/interview/setup" className="btn-primary">Start First Interview</Link>
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

function readinessColor(pct) {
  if (!pct) return '#64748b'
  if (pct >= 75) return '#10b981'
  if (pct >= 50) return '#6366f1'
  if (pct >= 30) return '#f59e0b'
  return '#ef4444'
}
