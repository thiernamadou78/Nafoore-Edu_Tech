import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [portalAccount, setPortalAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadPortalAccount = useCallback(async () => {
    try {
      const me = await api.get('/family/me')
      setPortalAccount(me)
      setError(null)
    } catch (err) {
      setPortalAccount(null)
      setError(err.message)
      await supabase.auth.signOut()
    }
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) await loadPortalAccount()
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession)
        if (nextSession) {
          await loadPortalAccount()
        } else {
          setPortalAccount(null)
        }
      },
    )

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadPortalAccount])

  const signIn = async (email, password) => {
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      setError(signInError.message)
      throw signInError
    }
  }

  const signOut = () => supabase.auth.signOut()

  const completePasswordChange = async (newPassword) => {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) throw updateError
    await api.patch('/family/me/password-changed', {})
    await loadPortalAccount()
  }

  return (
    <AuthContext.Provider
      value={{ session, portalAccount, loading, error, signIn, signOut, completePasswordChange }}
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
