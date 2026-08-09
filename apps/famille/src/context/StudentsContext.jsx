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
