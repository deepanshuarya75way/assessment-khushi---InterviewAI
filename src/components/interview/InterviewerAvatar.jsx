// src/components/interview/InterviewerAvatar.jsx — no logic bugs, minor cleanup
import { Brain } from 'lucide-react'

export default function InterviewerAvatar({ isSpeaking, questionNum, totalQuestions }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Avatar */}
      <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-brand-600 to-violet-600
        flex items-center justify-center shadow-xl shadow-brand-600/20
        ${isSpeaking ? 'interviewer-speaking' : ''}`}
      >
        <Brain size={34} className="text-white" />
        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-brand-400/40 animate-ping" style={{ animationDuration: '1.4s' }} />
            <div className="absolute inset-[-8px] rounded-full border border-brand-500/20 animate-ping" style={{ animationDuration: '2s' }} />
          </>
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-white font-semibold text-sm">AI Interviewer</p>
        {totalQuestions > 0 && (
          <p className="text-slate-400 text-xs mt-0.5">
            Question {questionNum} of {totalQuestions}
          </p>
        )}
      </div>

      {/* Sound bars when speaking */}
      {isSpeaking && (
        <div className="flex items-center gap-1 h-4">
          {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-brand-400 rounded-full"
              style={{
                height: `${h * 14}px`,
                animation: `soundBars 0.7s ease-in-out ${i * 0.1}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes soundBars {
          from { transform: scaleY(0.3); opacity: 0.5; }
          to   { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
