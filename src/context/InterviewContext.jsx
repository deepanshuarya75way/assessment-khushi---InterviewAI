// src/context/InterviewContext.jsx
// FIX 1: RESET action now preserves nothing from old state — clean slate.
// FIX 2: START_SESSION action sets all fields atomically in one dispatch
//         (previously setup page dispatched RESET then re-set fields, creating
//         a race condition where session page could mount with empty questions).
// FIX 3: Moved all session state into context so InterviewSessionPage can be
//         refreshed without losing state mid-session (data survives re-renders).
import { createContext, useContext, useReducer } from 'react'

const InterviewContext = createContext(null)

const initialState = {
  role:         '',
  difficulty:   '',
  questions:    [],
  currentIndex: 0,
  answers:      [],
  status:       'idle',   // idle | active | complete
  isEvaluating: false,
  finalReport:  null,
}

function reducer(state, action) {
  switch (action.type) {
    // Atomic session start — replaces the 6-dispatch sequence in SetupPage
    case 'START_SESSION':
      return {
        ...initialState,
        role:       action.payload.role,
        difficulty: action.payload.difficulty,
        questions:  action.payload.questions,
        status:     'active',
      }
    case 'SET_EVALUATING':
      return { ...state, isEvaluating: action.payload }
    case 'ADD_ANSWER':
      return { ...state, answers: [...state.answers, action.payload] }
    case 'NEXT_QUESTION':
      return { ...state, currentIndex: state.currentIndex + 1 }
    case 'SET_REPORT':
      return { ...state, finalReport: action.payload, status: 'complete' }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <InterviewContext.Provider value={{ state, dispatch }}>
      {children}
    </InterviewContext.Provider>
  )
}

export const useInterview = () => {
  const ctx = useContext(InterviewContext)
  if (!ctx) throw new Error('useInterview must be used within InterviewProvider')
  return ctx
}
