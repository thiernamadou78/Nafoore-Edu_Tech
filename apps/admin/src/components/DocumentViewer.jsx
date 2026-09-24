import { useEffect, useState } from 'react'
import { Lock, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// Consultation d'un document sensible (CV, piece d'identite, casier…) sans
// lien de telechargement : le fichier est charge via l'API (authentifiee,
// consultation tracee) et affiche dans la page, sans barre d'outils PDF, avec
// un filigrane au nom de l'admin qui consulte (dissuasif en cas de capture).
export function DocumentViewer({ path, fileName, onClose }) {
  const { adminAccount } = useAuth()
  const [file, setFile] = useState(null) // { url, type }
  const [error, setError] = useState(null)

  useEffect(() => {
    let url = null
    let active = true
    api
      .blob(path)
      .then((blob) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setFile({ url, type: blob.type })
      })
      .catch((err) => active && setError(err.message))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [path])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const watermark = `Confidentiel · Nafoore · ${adminAccount?.name ?? ''} · ${new Date().toLocaleDateString('fr-FR')}`
  const isPdf = file?.type === 'application/pdf'
  const isImage = file?.type?.startsWith('image/')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{fileName}</p>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <Lock size={12} />
              Consultation uniquement — document confidentiel, consultation enregistrée
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative flex-1 select-none overflow-hidden bg-gray-100">
          {error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : !file ? (
            <p className="p-6 text-sm text-gray-500">Chargement du document…</p>
          ) : isPdf ? (
            <iframe
              title={fileName}
              src={`${file.url}#toolbar=0&navpanes=0&statusbar=0`}
              className="h-full w-full border-0"
            />
          ) : isImage ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img
                src={file.url}
                alt={fileName}
                draggable={false}
                className="max-h-full max-w-full object-contain shadow"
              />
            </div>
          ) : (
            <p className="p-6 text-sm text-gray-500">Aperçu indisponible pour ce format.</p>
          )}

          {/* Filigrane : n'intercepte pas la souris (defilement du PDF). */}
          {file && (
            <div className="pointer-events-none absolute inset-0 grid grid-cols-2 place-items-center gap-10 overflow-hidden p-8 opacity-[0.12]">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} className="-rotate-[25deg] whitespace-nowrap text-lg font-semibold text-navy">
                  {watermark}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
