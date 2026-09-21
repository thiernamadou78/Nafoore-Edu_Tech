import { useEffect, useRef } from 'react'

// Recharge silencieusement les donnees d'une page : quand l'onglet redevient
// visible ou reprend le focus, quand la connexion revient, et toutes les
// `intervalMs` tant que la page est ouverte. Sans ca, un pointage fait sur
// un autre appareil (ou un changement de l'admin) n'apparaissait qu'apres un
// rafraichissement manuel.
export function useAutoRefresh(refresh, intervalMs = 30_000) {
  const ref = useRef(refresh)
  ref.current = refresh

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'visible') ref.current()
    }
    const id = setInterval(run, intervalMs)
    document.addEventListener('visibilitychange', run)
    window.addEventListener('focus', run)
    window.addEventListener('online', run)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('focus', run)
      window.removeEventListener('online', run)
    }
  }, [intervalMs])
}
