import { useEffect, useId, useState } from 'react'

// Communes d'un code postal (API publique officielle geo.api.gouv.fr), en
// cache pour la session. Une seule commune : la ville est remplie
// automatiquement ; plusieurs : proposees dans la liste du champ Ville
// (<datalist id={listId}>).
const cache = new Map()

function fetchCommunes(postalCode) {
  if (!cache.has(postalCode)) {
    cache.set(
      postalCode,
      fetch(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom&format=json`)
        .then((res) => (res.ok ? res.json() : []))
        .then((list) => [...new Set(list.map((c) => c.nom))].sort((a, b) => a.localeCompare(b, 'fr')))
        .catch(() => {
          cache.delete(postalCode)
          return []
        }),
    )
  }
  return cache.get(postalCode)
}

export function useCitySuggestions(postalCode, city, onCityChange) {
  const listId = useId()
  const [options, setOptions] = useState([])
  const code = (postalCode ?? '').trim()

  useEffect(() => {
    if (!/^\d{5}$/.test(code)) {
      setOptions([])
      return
    }
    let active = true
    fetchCommunes(code).then((communes) => {
      if (!active) return
      setOptions(communes)
      if (communes.length === 1 && city !== communes[0]) onCityChange(communes[0])
    })
    return () => {
      active = false
    }
    // On ne relance que si le code postal change (pas a chaque frappe dans Ville).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return { listId, options }
}
