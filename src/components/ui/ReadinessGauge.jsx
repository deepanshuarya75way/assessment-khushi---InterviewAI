// src/components/ui/ReadinessGauge.jsx
// FIX: value prop could be undefined — default to 0, clamp between 0-100.
import { useEffect, useState } from 'react'

export default function ReadinessGauge({ value: rawValue }) {
  const value  = Math.max(0, Math.min(100, Number(rawValue) || 0))
  const [displayed, setDisplayed] = useState(0)

  const radius = 54
  const circ   = 2 * Math.PI * radius
  const offset = circ - (displayed / 100) * circ

  const color = value >= 75 ? '#10b981'
              : value >= 50 ? '#6366f1'
              : value >= 30 ? '#f59e0b'
              : '#ef4444'

  const label = value >= 75 ? 'Job-Ready 🎯'
              : value >= 50 ? 'On Track 📈'
              : value >= 30 ? 'Keep Going 💪'
              : 'Needs Work 📚'

  useEffect(() => {
    if (value === 0) return
    const step  = value / 60
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= value) { setDisplayed(value); clearInterval(timer) }
      else setDisplayed(Math.round(current))
    }, 16)
    return () => clearInterval(timer)
  }, [value])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#1a1a35" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.04s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{displayed}%</span>
          <span className="text-xs text-slate-400">Readiness</span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  )
}
