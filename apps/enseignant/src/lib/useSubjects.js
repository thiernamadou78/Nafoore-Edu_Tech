import { useEffect, useState } from 'react'
import { api } from './api'

// Catalogue des matieres (gere par le Super Admin), charge une fois puis
// partage par tous les ecrans. Chaque entree : { name, category } avec
// category = 'scolaire' | 'professionnel'.
let cache = null

export function invalidateSubjects() {
  cache = null
}

export function useSubjects() {
  const [subjects, setSubjects] = useState([])
  useEffect(() => {
    let active = true
    if (!cache) cache = api.get('/subjects').catch(() => ((cache = null), []))
    cache.then((list) => active && setSubjects(list ?? []))
    return () => {
      active = false
    }
  }, [])
  return subjects
}

export const SUBJECT_CATEGORY_LABELS = {
  scolaire: 'Soutien scolaire',
  professionnel: 'Formation professionnelle',
}
