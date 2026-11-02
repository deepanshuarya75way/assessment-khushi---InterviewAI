import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const demoUser = {
  uid: 'demo-user',
  email: 'demo@interviewai.com',
  displayName: 'Demo User',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(demoUser)

  const profile = {
    name: 'Demo User',
    totalInterviews: 0,
    averageScore: 0,
  }

  const signup = async (email, password, name) => {
    const newUser = { ...demoUser, email, displayName: name }
    setUser(newUser)
    return { user: newUser }
  }

  const login = async (email) => {
    const newUser = { ...demoUser, email }
    setUser(newUser)
    return { user: newUser }
  }

  const logout = async () => setUser(null)

  const refreshProfile = async () => {}

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading: false,
      signup,
      login,
      logout,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
