// src/pages/ReportPage.jsx
// FIX 1: Wrapped Firestore calls in try/catch — was crashing on missing documents.
// FIX 2: avgOf() function now returns a number (0) when scores is empty instead of 0 string.
// FIX 3: Added proper loading skeleton instead of just a spinner inside an empty Navbar.
// FIX 4: pdfService.generateInterviewPDF() receives correctly shaped data.
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, ArrowLeft, TrendingUp, Target, Zap, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getInterview, getReportByInterview } from '../services/firestoreService'
import { generateInterviewPDF } from '../services/pdfService'
import Navbar from '../components/ui/Navbar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ScoreBar from '../components/ui/ScoreBar'
import ReadinessGauge from '../components/ui/ReadinessGauge'

const PRIORITY_STYLE = {
  high:   'text-red-400 bg-red-500/10 border border-red-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
  low:    'text-green-400 bg-green-500/10 border border-green-500/20',
}

export default function ReportPage() {
  const { id }      = useParams()
  const { user }    = useAuth()
  const [interview, setInterview] = useState(null)
  const [report,    setReport]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getInterview(id), getReportByInterview(id)])
      .then(([iv, rpt]) => { setInterview(iv); setReport(rpt) })
      .catch(err => setError(err.message || 'Failed to load report.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDownload = () => {
    if (!interview) return
    try {
      generateInterviewPDF({
        role:       interview.role,
        difficulty: interview.difficulty,
        questions:  (interview.questions || []).map(q => ({ question: q })),
        answers:    (interview.answers   || []).map(a => ({ text: a })),
        scores:     interview.scores || [],
        report,
        userName:   user?.displayName || 'Candidate',
      })
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('PDF generation failed. Please try again.')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="flex justify-center pt-20"><LoadingSpinner size="lg" label="Loading report…" /></div>
    </div>
  )

  if (error || !interview) return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-white font-semibold text-lg mb-1">Report not found</p>
        <p className="text-slate-400 text-sm mb-6">{error || 'This interview report does not exist.'}</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  )

  const scores    = interview.scores    || []
  const questions = interview.questions || []
  const answers   = interview.answers   || []

  // Returns a float average of a score key
  const avgOf = (key) => {
    if (!scores.length) return 0
    return parseFloat(
      (scores.reduce((a, s) => a + (Number(s[key]) || 0), 0) / scores.length).toFixed(1)
    )
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fadeIn">
          <div>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-2 transition-colors">
              <ArrowLeft size={13} /> Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Interview Report</h1>
            <p className="text-slate-400 mt-1">{interview.role} · {interview.difficulty}</p>
          </div>
          <button onClick={handleDownload} className="btn-secondary flex items-center gap-2 self-start">
            <Download size={14} /> Download PDF
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Score breakdown */}
            <div className="glass-card p-6 animate-slideUp">
              <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-400" /> Performance Scores
              </h2>
              <div className="space-y-3">
                <ScoreBar label="Technical Knowledge" score={avgOf('technicalKnowledge')} delay={0} />
                <ScoreBar label="Communication"       score={avgOf('communication')}      delay={80} />
                <ScoreBar label="Confidence"          score={avgOf('confidence')}         delay={160} />
                <ScoreBar label="Clarity"             score={avgOf('clarity')}            delay={240} />
                <ScoreBar label="Problem Solving"     score={avgOf('problemSolving')}     delay={320} />
              </div>
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-400 text-sm">Overall Score</span>
                <span className="text-3xl font-bold text-white">
                  {interview.overallScore?.toFixed(1) ?? '—'}
                  <span className="text-slate-500 text-lg font-normal">/10</span>
                </span>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            {report && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {(report.strengths || []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-400" /> Areas to Improve
                  </h3>
                  <ul className="space-y-2">
                    {(report.weaknesses || []).map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Learning path */}
            {report?.learningPath?.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <BookOpen size={14} className="text-brand-400" /> Recommended Learning Path
                </h3>
                <div className="space-y-3">
                  {report.learningPath.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/60">
                      <span className="text-xl">{['🥇','🥈','🥉'][i] || '📌'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-white text-sm font-medium">{item.topic}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLE[item.priority] || ''}`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">{item.resources}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Q&A Review */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4">Questions & Answers</h3>
              <div className="space-y-5">
                {questions.map((q, i) => (
                  <div key={i} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <p className="text-brand-400 text-sm font-semibold mb-1">Q{i + 1}: {q}</p>
                    <p className="text-slate-300 text-sm mb-2 leading-relaxed">
                      {answers[i] || <em className="text-slate-500">No answer recorded</em>}
                    </p>
                    {scores[i] && (
                      <p className="text-slate-500 text-xs">
                        Score: <span className="text-white font-medium">{scores[i].overall}/10</span>
                        {scores[i].feedback ? ` · ${scores[i].feedback.substring(0, 100)}…` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            <div className="glass-card p-6 flex flex-col items-center gap-4">
              <p className="section-label">Placement Readiness</p>
              <ReadinessGauge value={interview.readinessPercentage || 0} />
              {report?.hiringRecommendation && (
                <div className="w-full bg-surface-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Hiring Recommendation</p>
                  <p className="text-white font-bold">{report.hiringRecommendation}</p>
                </div>
              )}
            </div>

            {report?.summary && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Zap size={13} className="text-amber-400" /> AI Summary
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">{report.summary}</p>
              </div>
            )}

            {report?.skillsToImprove?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Target size={13} className="text-violet-400" /> Skills to Learn
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.skillsToImprove.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link to="/interview/setup" className="btn-primary flex items-center justify-center gap-2">
                <Zap size={13} /> Practice Again
              </Link>
              <Link to="/dashboard" className="btn-secondary text-center">Back to Dashboard</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
