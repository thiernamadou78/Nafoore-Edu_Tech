import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Power, Save } from 'lucide-react'
import { api } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PhotoUploader } from '../../components/ui/PhotoUploader'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function TeacherDetail() {
  const { id } = useParams()
  const [teacher, setTeacher] = useState(null)
  const [form, setForm] = useState({ name: '', subjects: '', bio: '', zone: '', email: '', phone: '' })
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)

  const load = () =>
    api.get(`/teachers/${id}`).then((data) => {
      setTeacher(data)
      setForm({
        name: data.name,
        subjects: data.subjects.join(', '),
        bio: data.bio ?? '',
        zone: data.zone ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
      })
    })

  useEffect(() => {
    load().catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const run = async (action, fn) => {
    setSavingAction(action)
    setError(null)
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAction(null)
    }
  }

  if (!teacher) {
    return error ? (
      <p className="text-red-600">{error}</p>
    ) : (
      <p className="text-gray-500">Chargement…</p>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link
        to="/enseignants"
        className="mb-2 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux enseignants
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{teacher.name}</h1>
        <Badge tone={teacher.verified ? 'green' : 'gray'}>
          {teacher.verified ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <Card className="mb-6 p-6">
        <PhotoUploader
          name={teacher.name}
          photoUrl={teacher.photoUrl}
          uploadPath={`/teachers/${id}/photo`}
          onChange={load}
        />
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Informations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Zone</label>
            <input
              value={form.zone}
              onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Matières (séparées par des virgules)
            </label>
            <input
              value={form.subjects}
              onChange={(e) => setForm((f) => ({ ...f, subjects: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button
            icon={Save}
            disabled={savingAction === 'info'}
            onClick={() =>
              run('info', () =>
                api.patch(`/teachers/${id}`, {
                  name: form.name,
                  subjects: form.subjects
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  bio: form.bio || undefined,
                  zone: form.zone || undefined,
                  email: form.email || undefined,
                  phone: form.phone || undefined,
                }),
              )
            }
          >
            Enregistrer
          </Button>
          <Button
            variant={teacher.verified ? 'danger' : 'secondary'}
            icon={Power}
            disabled={savingAction === 'verified'}
            onClick={() =>
              run('verified', () =>
                api.patch(`/teachers/${id}/verified`, { verified: !teacher.verified }),
              )
            }
          >
            {teacher.verified ? 'Désactiver' : 'Activer'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
