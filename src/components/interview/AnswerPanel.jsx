// src/components/interview/AnswerPanel.jsx
// FIX 1: Added key prop from parent (InterviewSessionPage) so this component fully
//         remounts on each new question — clears stale transcript state.
// FIX 2: stopListening() call in cleanup useEffect had [] dep array so never
//         saw updated stopListening. Fixed with ref pattern.
// FIX 3: Submit button now also works on Enter (Ctrl+Enter in textarea).
// FIX 4: Minimum answer length validation (3 chars) prevents empty submits.
import { useEffect, useRef } from 'react'
import { Mic, MicOff, Send, RotateCcw, AlertCircle } from 'lucide-react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

export default function AnswerPanel({ onSubmit, isEvaluating, disabled }) {
  const {
    transcript, isListening, isSupported,
    startListening, stopListening, resetTranscript, setTranscript,
  } = useSpeechRecognition()

  const stopRef = useRef(stopListening)
  useEffect(() => { stopRef.current = stopListening }, [stopListening])

  // Stop mic on unmount
  useEffect(() => {
    return () => { stopRef.current() }
  }, [])

  // Ctrl+Enter to submit
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !disabled && !isEvaluating && canSubmit) {
      handleSubmit()
    }
  }

  const canSubmit  = transcript.trim().length >= 3
  const isDisabled = disabled || isEvaluating

  const handleToggleMic = () => {
    if (isListening) { stopListening() }
    else { resetTranscript(); startListening() }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    stopListening()
    onSubmit(transcript.trim())
  }

  const handleReset = () => {
    stopListening()
    resetTranscript()
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Your Answer</h3>
        <div className="flex items-center gap-2">
          {!isSupported && (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs">
              <AlertCircle size={12} />
              Type your answer below
            </div>
          )}
          {isListening && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 recording-pulse" />
              Listening…
            </div>
          )}
        </div>
      </div>

      <textarea
        className="transcript-area w-full"
        placeholder={
          isSupported
            ? isListening
              ? 'Listening — speak clearly…'
              : 'Click Record to speak, or type your answer here. (Ctrl+Enter to submit)'
            : 'Type your answer here… (Ctrl+Enter to submit)'
        }
        value={transcript}
        onChange={e => setTranscript(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        rows={5}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {isSupported && (
          <button
            onClick={handleToggleMic}
            disabled={isDisabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200
              ${isListening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                : 'bg-surface-600 hover:bg-surface-500 border border-white/10 text-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isListening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Record</>}
          </button>
        )}

        <button
          onClick={handleReset}
          disabled={isDisabled || !transcript}
          className="btn-ghost flex items-center gap-1.5 text-sm disabled:opacity-30"
        >
          <RotateCcw size={13} /> Clear
        </button>

        {transcript && !canSubmit && (
          <span className="text-slate-500 text-xs">Answer too short</span>
        )}

        <button
          onClick={handleSubmit}
          disabled={isDisabled || !canSubmit}
          className="btn-primary flex items-center gap-2 ml-auto"
        >
          {isEvaluating ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating…</>
          ) : (
            <><Send size={13} /> Submit Answer</>
          )}
        </button>
      </div>
    </div>
  )
}
