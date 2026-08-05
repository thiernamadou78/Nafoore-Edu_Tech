import { useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { api } from '../../lib/api'
import { Avatar } from './Avatar'
import { Button } from './Button'

export function PhotoUploader({ name, photoUrl, uploadPath, onChange }) {
  const inputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
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
    <div className="flex items-center gap-4">
      <Avatar name={name} photoUrl={photoUrl} size="lg" />
      <div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            icon={Upload}
            disabled={saving}
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
              disabled={saving}
              onClick={handleRemove}
              className="px-3 py-1.5 text-red-600 hover:bg-red-50"
            >
              Retirer
            </Button>
          )}
        </div>
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
