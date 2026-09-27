import { useEffect } from 'react'
import { X } from 'lucide-react'

// Convention : Modal pour créer/éditer un sous-élément en ≤6 champs sans
// étape suivante (contrat, compte RH...). Dès qu'il y a un enchaînement à
// plusieurs écrans (ex. créer une famille PUIS ses enfants), utiliser une
// page dédiée avec sa propre route plutôt qu'une Modal.
const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, size = 'md', children }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    // La page derriere ne defile plus : seul le contenu de la fenetre defile.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* Hauteur limitee a l'ecran : l'en-tete reste visible et le contenu
          defile (formulaires longs, petits ecrans). */}
      <div
        className={`flex max-h-[calc(100dvh-2rem)] w-full ${SIZES[size] ?? SIZES.md} flex-col rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
