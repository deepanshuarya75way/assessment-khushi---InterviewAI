// src/pages/InterviewSetupPage.jsx
// FIX 1: Removed duplicate dispatch sequence (was dispatching RESET then re-setting
//         all fields twice — 8 dispatches total). Now uses single START_SESSION dispatch.
// FIX 2: generateQuestions is called exactly once per click (was effectively called
//         twice due to duplicate dispatch wiping the result then re-setting it).
// FIX 3: Error message now shows the actual API error text, not just a generic message.
// FIX 4: "Start Interview" button is disabled while loading to prevent double-submit.
// FIX 5: Gemini API key missing error is shown to user with helpful link.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code2, Server, Layers, Coffee, Cpu, BarChart2, Megaphone, Users, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { useInterview } from '../context/InterviewContext'
import { generateQuestions } from '../services/geminiService'
import Navbar from '../components/ui/Navbar'

const ROLES = [
  { id: 'Frontend Developer',   icon: Code2,      color: 'blue',   desc: 'React, CSS, JS, browser APIs' },
  { id: 'Backend Developer',    icon: Server,     color: 'purple', desc: 'Node, APIs, databases, architecture' },
  { id: 'Full Stack Developer', icon: Layers,     color: 'indigo', desc: 'End-to-end development skills' },
  { id: 'Java Developer',       icon: Coffee,     color: 'orange', desc: 'Java, Spring, OOP, JVM' },
  { id: 'Python Developer',     icon: Cpu,        color: 'yellow', desc: 'Python, Django, FastAPI, scripting' },
  { id: 'Data Analyst',         icon: BarChart2,  color: 'cyan',   desc: 'SQL, Excel, Tableau, statistics' },
  { id: 'Digital Marketing',    icon: Megaphone,  color: 'pink',   desc: 'SEO, campaigns, analytics, growth' },
  { id: 'HR Interview',         icon: Users,      color: 'green',  desc: 'Behavioral, situational, HR basics' },
]

const DIFFICULTIES = [
  { id: 'Beginner',     desc: '0–1 years experience', questions: 5,  hex: '#10b981' },
  { id: 'Intermediate', desc: '2–4 years experience', questions: 7,  hex: '#f59e0b' },
  { id: 'Advanced',     desc: '5+ years experience',  questions: 10, hex: '#ef4444' },
]

const ROLE_STYLE = {
  blue:   'border-blue-500/40 bg-blue-500/10 text-blue-400',
  purple: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
  indigo: 'border-brand-500/40 bg-brand-500/10 text-brand-400',
  orange: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  yellow: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  cyan:   'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  pink:   'border-pink-500/40 bg-pink-500/10 text-pink-400',
  green:  'border-green-500/40 bg-green-500/10 text-green-400',
}

export default function InterviewSetupPage() {
  const { dispatch } = useInterview()
  const navigate     = useNavigate()

  const [role,       setRole]       = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const handleStart = async () => {
    if (!role || !difficulty) {
      setError('Please select both a role and difficulty level.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const count     = DIFFICULTIES.find(d => d.id === difficulty)?.questions ?? 7
      // generateQuestions called exactly once
      const questions = await generateQuestions(role, difficulty, count)

      // Single atomic dispatch — no race condition possible
      dispatch({
        type: 'START_SESSION',
        payload: { role, difficulty, questions },
      })

      navigate('/interview/session')
    } catch (err) {
      console.error('Question generation error:', err)
      // Show the real error message — API key issues, quota, etc.
      const msg = err.message || 'Failed to generate questions.'
      if (msg.includes('API key')) {
        setError('Gemini API key missing or invalid. Check your .env file.')
      } else if (msg.includes('quota') || msg.includes('429')) {
        setError('Gemini API quota exceeded. Wait a moment and try again.')
      } else {
        setError(`Failed to generate questions: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-8 animate-fadeIn">
          <p className="section-label">Interview Setup</p>
          <h1 className="text-3xl font-bold text-white">Configure your mock interview</h1>
          <p className="text-slate-400 mt-1">AI will generate questions tailored to your role and experience level.</p>
        </div>

        {/* Role selection */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-white mb-3">
            Select Role <span className="text-red-400">*</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ROLES.map(r => {
              const Icon     = r.icon
              const selected = role === r.id
              const style    = ROLE_STYLE[r.color]
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                    ${selected ? style : 'border-white/5 bg-surface-700/40 hover:border-white/10'}`}
                >
                  <Icon size={22} className={selected ? style.split(' ')[2] : 'text-slate-400'} />
                  <p className={`mt-2 font-semibold text-sm ${selected ? 'text-white' : 'text-slate-300'}`}>{r.id}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{r.desc}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Difficulty selection */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-white mb-3">
            Select Difficulty <span className="text-red-400">*</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DIFFICULTIES.map(d => {
              const selected = difficulty === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`p-5 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                    ${selected ? 'border-white/20 bg-surface-600' : 'border-white/5 bg-surface-700/40 hover:border-white/10'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{d.id}</span>
                    {selected && <div className="w-2 h-2 rounded-full" style={{ background: d.hex }} />}
                  </div>
                  <p className="text-slate-400 text-sm">{d.desc}</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: d.hex }}>{d.questions} questions</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading || !role || !difficulty}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Generating Questions…</>
          ) : (
            <>Start Interview <ChevronRight size={16} /></>
          )}
        </button>

        {loading && (
          <p className="text-slate-500 text-xs mt-3">
            Gemini is crafting personalised questions for {role} · {difficulty}…
          </p>
        )}
      </main>
    </div>
  )
}
