// src/hooks/useSpeechRecognition.js
// FIX 1: finalTranscript was a local variable inside startListening(), so it reset
//         to '' every time onresult fired. Now stored in a ref so it accumulates.
// FIX 2: recognition.onend now attempts to restart if isListening ref is still true
//         (browser auto-stops recognition after ~60s of silence without this).
// FIX 3: Added error handling with specific error codes.
// FIX 4: resetTranscript now also resets the internal finalTranscript ref.
// FIX 5: isSupported set synchronously (was async in useEffect causing false flash).
import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

export function useSpeechRecognition() {
  const [transcript,  setTranscript]  = useState('')
  const [isListening, setIsListening] = useState(false)
  const isSupported = !!SpeechRecognition

  const recognitionRef     = useRef(null)
  const finalTranscriptRef = useRef('')   // accumulates across onresult calls
  const isListeningRef     = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return
    if (isListeningRef.current) return  // already listening

    const rec = new SpeechRecognition()
    recognitionRef.current = rec
    rec.continuous     = true
    rec.interimResults = true
    rec.lang           = 'en-US'
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalTranscriptRef.current += t + ' '
        } else {
          interim += t
        }
      }
      const combined = finalTranscriptRef.current + interim
      setTranscript(combined)
    }

    rec.onerror = (e) => {
      // 'no-speech' is not a real error — ignore it
      if (e.error === 'no-speech') return
      console.warn('Speech recognition error:', e.error)
      if (e.error !== 'aborted') {
        setIsListening(false)
        isListeningRef.current = false
      }
    }

    rec.onend = () => {
      // Auto-restart if we're still supposed to be listening
      // (browser stops after ~60s silence without this)
      if (isListeningRef.current) {
        try { rec.start() } catch {}
      } else {
        setIsListening(false)
      }
    }

    try {
      rec.start()
      isListeningRef.current = true
      setIsListening(true)
    } catch (err) {
      console.error('Could not start speech recognition:', err)
    }
  }, [])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
  }, [])

  return {
    transcript, isListening, isSupported,
    startListening, stopListening, resetTranscript, setTranscript,
  }
}
