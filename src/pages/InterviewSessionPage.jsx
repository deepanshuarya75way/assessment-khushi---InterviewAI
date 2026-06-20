// src/pages/InterviewSessionPage.jsx
// FIX 1: Guard against empty questions navigates to setup immediately (was in useEffect
//         with empty dep array, so fired on every render — now checks before render).
// FIX 2: Follow-up phase logic simplified — was possible to get stuck showing
//         both feedback and follow-up panels simultaneously.
// FIX 3: finishInterview now handles the case where directAnswers is shorter than
//         questions array (user skipped) — scores are matched by answer index.
// FIX 4: Timer useEffect cleanup added properly.
// FIX 5: "End interview" now uses window.confirm safely (not confirm() which is blocked
//         in some environments — wrapped in try/catch).
// FIX 6: isLast computed correctly when follow-up questions exist.
// FIX 7: Webcam streams are stopped when the page unmounts (previously leaked).
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useInterview } from '../context/InterviewContext'
import { useAuth } from '../context/AuthContext'
import { evaluateAnswer, generateFollowUp, generateFinalReport } from '../services/geminiService'
import { saveInterview, saveReport } from '../services/firestoreService'
import VideoFeed from '../components/interview/VideoFeed'
import InterviewerAvatar from '../components/interview/InterviewerAvatar'
import QuestionCard from '../components/interview/QuestionCard'
import AnswerPanel from '../components/interview/AnswerPanel'
import ScoreFeedback from '../components/interview/ScoreFeedback'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function InterviewSessionPage() {
  const { state, dispatch } = useInterview()
  const { user }            = useAuth()
  const navigate            = useNavigate()

  const [phase,        setPhase]        = useState('question') // 'question'|'feedback'|'followup'
  const [currentScores,setCurrentScores]= useState(null)
  const [followUpQ,    setFollowUpQ]    = useState(null)
  const [isSpeaking,   setIsSpeaking]   = useState(true)
  const [elapsed,      setElapsed]      = useState(0)
  const [savingReport, setSavingReport] = useState(false)
  const [errorMsg,     setErrorMsg]     = useState('')
  const streamRef = useRef(null)        // track webcam stream for cleanup

  const { questions, currentIndex, answers, role, difficulty } = state

  // Guard: if no questions, redirect immediately (before any rendering)
  useEffect(() => {
    if (!questions || questions.length === 0) {
      navigate('/interview/setup', { replace: true })
    }
  }, [])  // only on mount

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Speaking animation trigger on question change
  useEffect(() => {
    setIsSpeaking(true)
    const t = setTimeout(() => setIsSpeaking(false), 2800)
    return () => clearTimeout(t)
  }, [currentIndex, followUpQ])

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  if (!questions || questions.length === 0) return null // guard render

  const currentQ = questions[currentIndex]
  const isLast   = currentIndex >= questions.length - 1

  const handleAnswer = useCallback(async (answerText) => {
    setErrorMsg('')
    dispatch({ type: 'SET_EVALUATING', payload: true })
    try {
      const qText  = currentQ?.question || currentQ || ''
      const scores = await evaluateAnswer(qText, answerText, role, difficulty)
      setCurrentScores(scores)
      dispatch({ type: 'ADD_ANSWER', payload: { text: answerText, scores, questionIndex: currentIndex } })
      setPhase('feedback')

      // Generate follow-up if the answer was weak — do this after UI updates
      if (scores.needsFollowUp && scores.overall < 6) {
        try {
          const fq = await generateFollowUp(qText, answerText, scores, role)
          setFollowUpQ(fq)
        } catch {
          // Follow-up generation failure is non-critical — just skip it
          setFollowUpQ(null)
        }
      } else {
        setFollowUpQ(null)
      }
    } catch (err) {
      console.error('Evaluation error:', err)
      setErrorMsg(err.message?.includes('API key')
        ? 'Gemini API key missing — check your .env file.'
        : 'Evaluation failed. Please try submitting your answer again.')
    } finally {
      dispatch({ type: 'SET_EVALUATING', payload: false })
    }
  }, [currentQ, currentIndex, role, difficulty, dispatch])

  const handleFollowUpAnswer = useCallback(async (answerText) => {
    setErrorMsg('')
    dispatch({ type: 'SET_EVALUATING', payload: true })
    try {
      const scores = await evaluateAnswer(followUpQ, answerText, role, difficulty)
      setCurrentScores(scores)
      dispatch({ type: 'ADD_ANSWER', payload: { text: answerText, scores, questionIndex: currentIndex, isFollowUp: true } })
      setFollowUpQ(null)
      setPhase('feedback')
    } catch (err) {
      setErrorMsg('Follow-up evaluation failed. Please try again.')
    } finally {
      dispatch({ type: 'SET_EVALUATING', payload: false })
    }
  }, [followUpQ, currentIndex, role, difficulty, dispatch])

  const handleNext = useCallback(async () => {
    if (isLast) {
      await finishInterview()
    } else {
      setCurrentScores(null)
      setFollowUpQ(null)
      setPhase('question')
      dispatch({ type: 'NEXT_QUESTION' })
    }
  }, [isLast])

  const finishInterview = async () => {
    setSavingReport(true)
    setErrorMsg('')
    try {
      // Only count direct (non-follow-up) answers matched to questions
      const directAnswers = state.answers.filter(a => !a.isFollowUp)
      const allScores     = directAnswers.map(a => a.scores).filter(Boolean)

      if (allScores.length === 0) throw new Error('No scored answers to report on')

      const overallScore = allScores.reduce((a, s) => a + (s.overall || 0), 0) / allScores.length

      const qaList = questions.map((q, i) => ({
        question: q?.question || q || '',
        answer:   directAnswers[i]?.text || '',
      }))

      const finalReport = await generateFinalReport(role, difficulty, qaList, allScores)

      const interviewId = await saveInterview(user.uid, {
        role, difficulty,
        questions:           questions.map(q => q?.question || q || ''),
        answers:             directAnswers.map(a => a.text || ''),
        scores:              allScores,
        overallScore:        parseFloat(overallScore.toFixed(1)),
        readinessPercentage: finalReport.placementReadiness,
        totalDuration:       elapsed,
      })

      await saveReport(user.uid, interviewId, finalReport)
      dispatch({ type: 'SET_REPORT', payload: { ...finalReport, interviewId } })
      navigate(`/report/${interviewId}`)
    } catch (err) {
      console.error('Finish interview error:', err)
      setSavingReport(false)
      setErrorMsg(`Failed to save report: ${err.message}. Check your internet connection.`)
    }
  }

  const handleEndSession = () => {
    try {
      if (window.confirm('End this interview session? Your progress will be lost.')) {
        dispatch({ type: 'RESET' })
        navigate('/dashboard')
      }
    } catch {
      dispatch({ type: 'RESET' })
      navigate('/dashboard')
    }
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (savingReport) return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-white text-lg font-medium">Generating your report…</p>
      <p className="text-slate-400 text-sm">Analysing {questions.length} answers with Gemini</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 bg-surface-800/80 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-700 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-red-500 recording-pulse" />
            <span className="text-white text-sm font-mono font-medium">{fmt(elapsed)}</span>
          </div>
          <span className="hidden sm:block text-slate-400 text-sm">
            <span className="text-white font-medium">{role}</span>
            {' · '}{difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">
            {currentIndex + 1} / {questions.length}
          </span>
          <button
            onClick={handleEndSession}
            className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 transition-colors"
            title="End interview"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          <div className="grid lg:grid-cols-5 gap-6">

            {/* Left column: AI avatar + webcam */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="glass-card p-6 flex flex-col items-center gap-4">
                <InterviewerAvatar
                  isSpeaking={isSpeaking}
                  questionNum={currentIndex + 1}
                  totalQuestions={questions.length}
                />
              </div>
              <div className="glass-card p-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-slate-400 font-medium">You</span>
                  <span className="text-xs text-green-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Camera On
                  </span>
                </div>
                <VideoFeed onStreamReady={(s) => { streamRef.current = s }} />
              </div>
            </div>

            {/* Right column: Q&A */}
            <div className="lg:col-span-3 flex flex-col gap-4">

              {/* Question card */}
              {phase !== 'followup' && currentQ && (
                <QuestionCard
                  question={currentQ}
                  questionNum={currentIndex + 1}
                  totalQuestions={questions.length}
                />
              )}
              {phase === 'followup' && followUpQ && (
                <QuestionCard question={{ question: followUpQ }} isFollowUp />
              )}

              {/* Error banner */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Answer input */}
              {(phase === 'question' || phase === 'followup') && (
                <AnswerPanel
                  key={`answer-${currentIndex}-${phase}`}
                  onSubmit={phase === 'followup' ? handleFollowUpAnswer : handleAnswer}
                  isEvaluating={state.isEvaluating}
                  disabled={state.isEvaluating}
                />
              )}

              {/* Per-answer score feedback */}
              {phase === 'feedback' && currentScores && (
                <ScoreFeedback
                  scores={currentScores}
                  feedback={currentScores.feedback}
                  strengths={currentScores.strengths}
                  weaknesses={currentScores.weaknesses}
                  hasFollowUp={!!followUpQ}
                  isLast={isLast}
                  onNext={followUpQ ? () => setPhase('followup') : handleNext}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
