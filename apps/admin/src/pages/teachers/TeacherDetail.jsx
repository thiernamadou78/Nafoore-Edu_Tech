import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Download, FileText, Power, Save, Trash2, Upload } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Collapsible } from '../../components/ui/Collapsible'
import { EmptyState } from '../../components/ui/EmptyState'
import { PaginationControls } from '../../components/ui/PaginationControls'
import { PhotoUploader } from '../../components/ui/PhotoUploader'
import { usePagination } from '../../lib/usePagination'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from '../students/labels'
import { SubjectPicker } from './SubjectPicker'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const PHONE_PATTERN = /^(\+33 ?|0)[1-9]([ .-]?\d{2}){4}$/

const TEACHER_DOCUMENT_TYPE_LABELS = {
  diplome: 'Diplôme',
  casier_judiciaire: 'Casier judiciaire',
  autre: 'Autre',
}

export function TeacherDetail() {
  const { id } = useParams()
  const [teacher, setTeacher] = useState(null)
  const [form, setForm] = useState({
    name: '',
    subjects: [],
    bio: '',
    address: '',
    postalCode: '',
    email: '',
    phone: '',
  })
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)
  const [documentForm, setDocumentForm] = useState({ file: null, type: 'diplome' })

  const load = () =>
    api.get(`/teachers/${id}`).then((data) => {
      setTeacher(data)
      setForm({
        name: data.name,
        subjects: data.subjects,
        bio: data.bio ?? '',
        address: data.address ?? '',
        postalCode: data.postalCode ?? '',
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

  const sessionsPage = usePagination(teacher?.sessions ?? [], 5)

  if (!teacher) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="max-w-4xl">
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

      {error && <Alert>{error}</Alert>}

      <Card className="mb-6 p-6">
        <PhotoUploader
          name={teacher.name}
          photoUrl={teacher.photoUrl}
          uploadPath={`/teachers/${id}/photo`}
          onChange={load}
        />
      </Card>

      <Collapsible title="Infos" className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
            <input
              required
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Ex : Paris 15e"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code postal</label>
            <input
              required
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
              pattern="\d{5}"
              maxLength={5}
              placeholder="75015"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
            <input
              type="tel"
              required
              pattern="^(\+33 ?|0)[1-9]([ .-]?\d{2}){4}$"
              title="Numéro de téléphone français (ex : 06 12 34 56 78)"
              placeholder="06 12 34 56 78"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Matières</label>
            <SubjectPicker
              selected={form.subjects}
              onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Bio *</label>
            <textarea
              rows={3}
              required
              minLength={20}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button
            icon={Save}
            loading={savingAction === 'info'}
            onClick={() => {
              if (
                !form.name.trim() ||
                !form.address.trim() ||
                !form.postalCode.trim() ||
                !form.email.trim() ||
                !form.phone.trim() ||
                form.subjects.length === 0
              ) {
                setError('Nom, adresse, code postal, email, téléphone et au moins une matière sont obligatoires.')
                return
              }
              if (!PHONE_PATTERN.test(form.phone.trim())) {
                setError('Numéro de téléphone invalide (ex : 06 12 34 56 78).')
                return
              }
              run('info', () =>
                api.patch(`/teachers/${id}`, {
                  name: form.name,
                  subjects: form.subjects,
                  bio: form.bio.trim(),
                  address: form.address,
                  postalCode: form.postalCode,
                  email: form.email,
                  phone: form.phone,
                }),
              )
            }}
          >
            Enregistrer
          </Button>
          <Button
            variant={teacher.verified ? 'danger' : 'secondary'}
            icon={Power}
            loading={savingAction === 'verified'}
            onClick={() =>
              run('verified', () =>
                api.patch(`/teachers/${id}/verified`, { verified: !teacher.verified }),
              )
            }
          >
            {teacher.verified ? 'Désactiver' : 'Activer'}
          </Button>
        </div>
      </Collapsible>

      <Collapsible title="Documents" icon={FileText} className="mb-6" badge={<Badge tone="gray">{teacher.documents.length}</Badge>}>
        <div className="mb-4 space-y-2">
          {teacher.documents.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun document pour l'instant.</p>
          ) : (
            teacher.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900">{doc.fileName}</span>
                  <span className="ml-2 text-gray-500">
                    {TEACHER_DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} · {doc.uploadedBy.name} ·{' '}
                    {formatDate(doc.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const { url } = await api.get(
                          `/teachers/${id}/documents/${doc.id}/download`,
                        )
                        window.open(url, '_blank', 'noopener')
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                    className="inline-flex items-center gap-1 text-navy hover:underline"
                  >
                    <Download size={14} />
                    Télécharger
                  </button>
                  <button
                    onClick={() =>
                      run('delete-doc', () => api.del(`/teachers/${id}/documents/${doc.id}`))
                    }
                    className="text-gray-400 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Type</label>
            <select
              value={documentForm.type}
              onChange={(e) => setDocumentForm((f) => ({ ...f, type: e.target.value }))}
              className={inputClass}
            >
              {Object.entries(TEACHER_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Fichier</label>
            <input
              type="file"
              onChange={(e) =>
                setDocumentForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))
              }
              className="w-full text-sm"
            />
          </div>
          <Button
            icon={Upload}
            loading={savingAction === 'upload'}
            disabled={!documentForm.file}
            onClick={() =>
              run('upload', async () => {
                const formData = new FormData()
                formData.append('file', documentForm.file)
                formData.append('type', documentForm.type)
                await api.upload(`/teachers/${id}/documents`, formData)
                setDocumentForm({ file: null, type: 'diplome' })
              })
            }
          >
            Envoyer
          </Button>
        </div>
      </Collapsible>

      <Card className="overflow-hidden">
        <h2 className="flex items-center gap-2 p-6 pb-3 font-semibold text-gray-900">
          <CalendarClock size={16} className="text-navy" />
          Séances
        </h2>
        {teacher.sessions.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucune séance"
            description="Les séances planifiées, réalisées ou annulées par cet enseignant apparaîtront ici."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">Famille</th>
                <th className="px-4 py-3 font-medium">Matière</th>
                <th className="px-4 py-3 font-medium">Date et heure</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Motif d'annulation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessionsPage.visible.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{session.studentName}</td>
                  <td className="px-4 py-3 text-gray-700">{session.familyName}</td>
                  <td className="px-4 py-3 text-gray-700">{session.subject ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateTime(session.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={SESSION_STATUS_TONES[session.status]}>
                      {SESSION_STATUS_LABELS[session.status] ?? session.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {session.status === 'annulee' ? (session.cancellationReason ?? '—') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <PaginationControls
          {...sessionsPage}
          onShowMore={sessionsPage.showMore}
          onCollapse={sessionsPage.collapse}
          className="px-4 pb-4 pt-1"
        />
      </Card>
    </div>
  )
}
