import { useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { api } from '../../lib/api'
import { Avatar } from './Avatar'
import { Button } from './Button'

export function PhotoUploader({ name, photoUrl, uploadPath, onChange }) {
  const inputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const uploadFile = async (file) => {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.upload(uploadPath, formData)
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    uploadFile(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    uploadFile(event.dataTransfer.files?.[0])
  }

  const handleRemove = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.del(uploadPath)
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex items-center gap-4 rounded-xl border border-dashed p-3 transition-colors ${
        dragOver ? 'border-navy bg-navy/5' : 'border-transparent'
      }`}
    >
      <Avatar name={name} photoUrl={photoUrl} size="lg" />
      <div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            icon={Upload}
            loading={saving}
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5"
          >
            {photoUrl ? 'Changer' : 'Ajouter une photo'}
          </Button>
          {photoUrl && (
            <Button
              type="button"
              variant="ghost"
              icon={Trash2}
              loading={saving}
              onClick={handleRemove}
              className="px-3 py-1.5 text-red-600 hover:bg-red-50"
            >
              Retirer
            </Button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-400">ou glisser-déposer une image ici</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
