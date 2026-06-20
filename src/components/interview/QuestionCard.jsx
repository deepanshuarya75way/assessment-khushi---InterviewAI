// src/components/interview/QuestionCard.jsx
// FIX 1: question prop can be a string or object — handle both shapes safely.
// FIX 2: Progress bar width uses CSS transition, not Tailwind's JIT arbitrary value
//         which wasn't generating correctly for dynamic percentages.
import { MessageSquare } from 'lucide-react'

const TYPE_COLORS = {
  'technical':       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'behavioral':      'bg-green-500/10 text-green-400 border-green-500/20',
  'situational':     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'problem-solving': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export default function QuestionCard({ question, questionNum, totalQuestions, isFollowUp = false }) {
  if (!question) return null

  // Normalise: question can be { question, type, hint } or a plain string
  const text = typeof question === 'string' ? question : (question.question || '')
  const type = typeof question === 'object' ? question.type : null

  return (
    <div className="glass-card p-6 animate-slideUp">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
          <MessageSquare size={15} className="text-brand-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isFollowUp ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-violet-500/10 text-violet-400 border-violet-500/20">
              Follow-up
            </span>
          ) : (
            <span className="text-slate-400 text-sm">
              Question {questionNum} of {totalQuestions}
            </span>
          )}
          {type && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
              {type}
            </span>
          )}
        </div>
      </div>

      {/* Question text */}
      <p className="text-white text-lg leading-relaxed font-medium">{text}</p>

      {/* Progress bar */}
      {!isFollowUp && totalQuestions > 0 && (
        <div className="mt-5">
          <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
            <div
              className="h-full progress-shimmer rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.round((questionNum / totalQuestions) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
