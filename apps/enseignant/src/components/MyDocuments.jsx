import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, Upload } from 'lucide-react'
import { api } from '../lib/api'
import { Alert } from './ui/Alert'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

// Memes emplacements que la candidature et la fiche admin.
const SLOTS = [
  { type: 'cv', label: 'CV', multiple: false },
  { type: 'piece_identite', label: "Pièce d'identité", multiple: false },
  { type: 'diplome', label: 'Diplômes', multiple: true },
  { type: 'casier_judiciaire', label: 'Casier judiciaire (B3)', multiple: false },
]

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']

function Slot({ slot, documents, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const upload = async (files) => {
    const invalid = files.find((f) => !ACCEPTED.includes(f.type) || f.size > MAX_SIZE)
    if (invalid) {
      setError(`« ${invalid.name} » : PDF, JPG ou PNG de 5 Mo maximum.`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', slot.type)
        await api.upload('/teacher/documents', formData)
      }
      await onUploaded()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          {documents.length > 0 ? (
            <CheckCircle2 size={15} className="text-leaf-600" />
          ) : (
            <FileText size={15} className="text-gray-300" />
          )}
          {slot.label}
        </p>
        <Button
          type="button"
          variant="secondary"
          icon={Upload}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
          className="px-2.5 py-1 text-xs"
        >
          {documents.length > 0 ? 'Ajouter' : 'Déposer'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple={slot.multiple}
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length > 0) upload(files)
          }}
          className="hidden"
        />
      </div>
      {documents.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {documents.map((doc) => (
            <li key={doc.id} className="truncate text-xs text-gray-500" title={doc.fileName}>
              {doc.fileName} · {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// L'enseignant depose lui-meme ses documents ; l'equipe Nafoore est prevenue
// et les consulte depuis sa fiche.
export function MyDocuments() {
  const [documents, setDocuments] = useState(null)
  const [error, setError] = useState(null)

  const load = () =>
    api
      .get('/teacher/documents')
      .then(setDocuments)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const missing = documents ? SLOTS.filter((slot) => !documents.some((d) => d.type === slot.type)) : []

  return (
    <Card className="mt-6 p-6">
      <p className="text-sm font-medium text-gray-700">Mes documents</p>
      <p className="mb-3 mt-0.5 text-xs text-gray-500">
        PDF, JPG ou PNG, 5 Mo maximum. Ils sont transmis à l'équipe Nafoore de façon confidentielle.
      </p>
      {error && <Alert className="mb-3">{error}</Alert>}
      {documents && missing.length > 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          À fournir : {missing.map((slot) => slot.label).join(', ')}.
        </p>
      )}
      {documents && (
        <div className="grid gap-3 sm:grid-cols-2">
          {SLOTS.map((slot) => (
            <Slot
              key={slot.type}
              slot={slot}
              documents={documents.filter((d) => d.type === slot.type)}
              onUploaded={load}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
