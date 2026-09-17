import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { api } from '../lib/api'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { SUBJECT_OPTIONS } from './subjects'

export function Profil() {
  const [subjects, setSubjects] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .get('/teacher/me/subjects')
      .then((data) => setSubjects(data.subjects))
      .catch((err) => setError(err.message))
  }, [])

  const toggle = (subject) => {
    setSaved(false)
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.patch('/teacher/me/subjects', { subjects })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error && !subjects) return <Alert>{error}</Alert>
  if (!subjects) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-serif text-2xl font-bold text-navy">Mon profil</h1>
      <p className="mb-6 text-sm text-gray-500">
        Choisis les matières que tu enseignes. Seules les demandes des familles correspondant à
        ces matières te seront montrées dans l'onglet Demandes, et l'admin ne pourra te proposer
        que sur ces matières.
      </p>

      <Card className="p-6">
        {error && <Alert className="mb-4">{error}</Alert>}
        <p className="mb-3 text-sm font-medium text-gray-700">Matières enseignées</p>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_OPTIONS.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => toggle(subject)}
              className={`rounded-lg border-2 px-2.5 py-1 text-xs font-medium transition-colors ${
                subjects.includes(subject)
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-navy/30'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button icon={Save} loading={saving} disabled={subjects.length === 0} onClick={handleSave}>
            Enregistrer
          </Button>
          {saved && <span className="text-sm text-leaf-700">Enregistré.</span>}
        </div>
      </Card>
    </div>
  )
}
