import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authClient } from '../lib/authAdapter'
import { api } from '../lib/api'
import { translateAuthError } from '../lib/authErrors'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [adminAccount, setAdminAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAdminAccount = useCallback(async () => {
    try {
      const me = await api.get('/admin/me')
      setAdminAccount(me)
      setError(null)
    } catch (err) {
      setAdminAccount(null)
      setError(err.message)
      await authClient.auth.signOut()
    }
  }, [])

  useEffect(() => {
    let active = true

    authClient.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) await loadAdminAccount()
      setLoading(false)
    })

    const { data: subscription } = authClient.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession)
        if (nextSession) {
          await loadAdminAccount()
        } else {
          setAdminAccount(null)
        }
      },
    )

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadAdminAccount])

  const signIn = async (email, password) => {
    setError(null)
    try {
      const { error: signInError } = await authClient.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
    } catch (err) {
      setError(translateAuthError(err))
      throw err
    }
  }

  const signOut = () => authClient.auth.signOut()

  const hasRole = (...roles) =>
    adminAccount ? roles.some((role) => adminAccount.roles.includes(role)) : false

  return (
    <AuthContext.Provider
      value={{ session, adminAccount, loading, error, signIn, signOut, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}
