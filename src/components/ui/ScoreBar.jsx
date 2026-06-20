// src/components/ui/ScoreBar.jsx
// FIX: score prop could be a string coming from Gemini — coerce to Number.
import { useEffect, useState } from 'react'

function getGradient(score) {
  if (score >= 8) return 'from-emerald-500 to-green-400'
  if (score >= 6) return 'from-brand-500 to-violet-400'
  if (score >= 4) return 'from-amber-500 to-yellow-400'
  return 'from-red-500 to-rose-400'
}

export default function ScoreBar({ label, score: rawScore, maxScore = 10, delay = 0 }) {
  const score      = Math.max(0, Math.min(10, Number(rawScore) || 0))
  const [width, setWidth] = useState(0)
  const pct = (score / maxScore) * 100

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 100)
    return () => clearTimeout(t)
  }, [pct, delay])

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-sm w-40 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getGradient(score)} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-white font-semibold text-sm w-12 text-right">
        {score}<span className="text-slate-500 font-normal text-xs">/10</span>
      </span>
    </div>
  )
}
