import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const StudentsContext = createContext(null)

export function StudentsProvider({ children }) {
  const [students, setStudents] = useState(null)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/family/students')
      setStudents(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    // Pas de temps réel : on rafraîchit dès que l'onglet redevient actif, pour
    // remonter les changements faits par le prof ou l'admin ailleurs sans que
    // la famille ait à recharger la page manuellement.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])

  return (
    <StudentsContext.Provider value={{ students, error, refresh }}>
      {children}
    </StudentsContext.Provider>
  )
}

export function useStudents() {
  const context = useContext(StudentsContext)
  if (!context) throw new Error('useStudents doit être utilisé dans StudentsProvider')
  return context
}
