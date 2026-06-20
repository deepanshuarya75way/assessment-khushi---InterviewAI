// src/components/interview/ScoreFeedback.jsx
// FIX 1: onNext was called directly without checking if isLast — caused the
//         "View Final Report" button to sometimes navigate mid-sequence.
// FIX 2: hasFollowUp and isLast combined label logic simplified.
// FIX 3: scores prop now validated before rendering ScoreBars.
import { ChevronRight, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react'
import ScoreBar from '../ui/ScoreBar'

export default function ScoreFeedback({ scores, feedback, strengths, weaknesses, onNext, isLast, hasFollowUp }) {
  if (!scores) return null

  const overall      = Number(scores.overall) || 0
  const overallColor = overall >= 7 ? 'text-emerald-400' : overall >= 5 ? 'text-amber-400' : 'text-red-400'

  const nextLabel = hasFollowUp
    ? '💬 Answer Follow-up'
    : isLast
      ? '📊 View Final Report'
      : 'Next Question'

  return (
    <div className="glass-card p-5 space-y-4 animate-slideUp border border-white/8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Answer Evaluation</h3>
        <div className={`text-2xl font-bold ${overallColor}`}>
          {overall}
          <span className="text-slate-500 text-sm font-normal">/10</span>
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-2.5">
        <ScoreBar label="Technical Knowledge" score={Number(scores.technicalKnowledge) || 0} delay={0} />
        <ScoreBar label="Communication"       score={Number(scores.communication)      || 0} delay={80} />
        <ScoreBar label="Confidence"          score={Number(scores.confidence)         || 0} delay={160} />
        <ScoreBar label="Clarity"             score={Number(scores.clarity)            || 0} delay={240} />
        <ScoreBar label="Problem Solving"     score={Number(scores.problemSolving)     || 0} delay={320} />
      </div>

      {/* Feedback text */}
      {feedback && (
        <p className="text-slate-300 text-sm leading-relaxed border-t border-white/5 pt-3">
          {feedback}
        </p>
      )}

      {/* Strengths / Weaknesses */}
      {((strengths?.length > 0) || (weaknesses?.length > 0)) && (
        <div className="grid grid-cols-2 gap-3">
          {strengths?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-1.5">Strengths</p>
              {strengths.slice(0, 2).map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-slate-400 text-xs mb-1.5">
                  <CheckCircle size={11} className="text-emerald-400 mt-0.5 shrink-0" />{s}
                </div>
              ))}
            </div>
          )}
          {weaknesses?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1.5">Improve On</p>
              {weaknesses.slice(0, 2).map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-slate-400 text-xs mb-1.5">
                  <AlertCircle size={11} className="text-amber-400 mt-0.5 shrink-0" />{w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Follow-up hint */}
      {hasFollowUp && (
        <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2">
          <MessageCircle size={13} className="text-violet-400 shrink-0" />
          <p className="text-violet-300 text-xs">
            Your answer triggered a follow-up question. Keep going!
          </p>
        </div>
      )}

      <button onClick={onNext} className="btn-primary w-full flex items-center justify-center gap-2">
        {nextLabel} {!hasFollowUp && !isLast && <ChevronRight size={14} />}
      </button>
    </div>
  )
}
