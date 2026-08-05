import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarPlus,
  Download,
  FileText,
  History,
  Power,
  Save,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PhotoUploader } from '../../components/ui/PhotoUploader'
import {
  DOCUMENT_TYPE_LABELS,
  LEVEL_LABELS,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_TONES,
} from './labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

function SessionRow({ session, onSave }) {
  const [status, setStatus] = useState(session.status)
  const [attended, setAttended] = useState(session.attended ?? false)
  const [notes, setNotes] = useState(session.notes ?? '')
  const [saving, setSaving] = useState(false)
  const dirty =
    status !== session.status ||
    attended !== (session.attended ?? false) ||
    notes !== (session.notes ?? '')

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ status, attended, notes })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-gray-900">
          {new Date(session.date).toLocaleString('fr-FR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
        <span className="text-gray-500">{session.teacher?.name ?? 'Enseignant non assigné'}</span>
        <Badge tone={SESSION_STATUS_TONES[session.status]}>
          {SESSION_STATUS_LABELS[session.status] ?? session.status}
        </Badge>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        >
          {Object.entries(SESSION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={attended}
            onChange={(e) => setAttended(e.target.checked)}
            className="rounded border-gray-300 text-navy focus:ring-navy"
          />
          Présent
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contenu abordé"
          className="min-w-[160px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <Button
          variant="secondary"
          icon={Save}
          disabled={!dirty || saving}
          onClick={handleSave}
          className="px-3 py-1.5"
        >
          Enregistrer
        </Button>
      </div>
    </div>
  )
}

export function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [form, setForm] = useState({ name: '', level: 'college', subjects: '', objectives: '' })
  const [assignedTeacherIds, setAssignedTeacherIds] = useState([])
  const [sessionForm, setSessionForm] = useState({
    date: '',
    teacherId: '',
    notes: '',
  })
  const [reportForm, setReportForm] = useState({ period: '', content: '', shareable: false })
  const [documentForm, setDocumentForm] = useState({ file: null, type: 'bulletin' })
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)

  const load = () =>
    api.get(`/students/${id}`).then((data) => {
      setStudent(data)
      setForm({
        name: data.name,
        level: data.level,
        subjects: data.subjects.join(', '),
        objectives: data.objectives ?? '',
      })
      setAssignedTeacherIds(data.teachers.map((t) => t.teacher.id))
    })

  useEffect(() => {
    load().catch((err) => setError(err.message))
    api
      .get('/teachers?verified=true')
      .then(setTeachers)
      .catch(() => {})
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

  const toggleTeacher = (teacherId) => {
    setAssignedTeacherIds((ids) =>
      ids.includes(teacherId) ? ids.filter((i) => i !== teacherId) : [...ids, teacherId],
    )
  }

  if (!student) {
    return error ? (
      <p className="text-red-600">{error}</p>
    ) : (
      <p className="text-gray-500">Chargement…</p>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link
        to="/eleves"
        className="mb-2 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux élèves
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{student.name}</h1>
        <Badge tone="gray">{LEVEL_LABELS[student.level] ?? student.level}</Badge>
        <Badge tone={student.isActive ? 'green' : 'gray'}>
          {student.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <Card className="mb-6 p-6">
        <PhotoUploader
          name={student.name}
          photoUrl={student.photoUrl}
          uploadPath={`/students/${id}/photo`}
          onChange={load}
        />
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Fiche élève</h2>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Niveau</label>
            <select
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              className={inputClass}
            >
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Objectifs</label>
            <textarea
              rows={3}
              value={form.objectives}
              onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
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
                api.patch(`/students/${id}`, {
                  name: form.name,
                  level: form.level,
                  subjects: form.subjects
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  objectives: form.objectives || undefined,
                }),
              )
            }
          >
            Enregistrer la fiche
          </Button>
          <Button
            variant={student.isActive ? 'danger' : 'secondary'}
            icon={Power}
            disabled={savingAction === 'active'}
            onClick={() =>
              run('active', () =>
                api.patch(`/students/${id}/active`, { isActive: !student.isActive }),
              )
            }
          >
            {student.isActive ? 'Désactiver' : 'Activer'}
          </Button>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Enseignant(s) assigné(s)</h2>
        <div className="mb-3 flex flex-wrap gap-3">
          {teachers.map((teacher) => (
            <label key={teacher.id} className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={assignedTeacherIds.includes(teacher.id)}
                onChange={() => toggleTeacher(teacher.id)}
                className="rounded border-gray-300 text-navy focus:ring-navy"
              />
              {teacher.name}
            </label>
          ))}
          {teachers.length === 0 && (
            <p className="text-sm text-gray-500">Aucun enseignant vérifié pour l'instant.</p>
          )}
        </div>
        <Button
          icon={UserCheck}
          disabled={savingAction === 'teachers'}
          onClick={() =>
            run('teachers', () =>
              api.patch(`/students/${id}/teachers`, { teacherIds: assignedTeacherIds }),
            )
          }
        >
          Enregistrer les enseignants
        </Button>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <History size={16} className="text-navy" />
          Historique des enseignants
        </h2>
        {student.teacherHistory.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun changement pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {student.teacherHistory.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 text-sm">
                <Badge tone={entry.action === 'assigned' ? 'green' : 'red'}>
                  {entry.action === 'assigned' ? 'Assigné' : 'Retiré'}
                </Badge>
                <span className="font-medium text-gray-900">{entry.teacher.name}</span>
                <span className="text-gray-500">
                  par {entry.adminAccount.name} ·{' '}
                  {new Date(entry.createdAt).toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <CalendarPlus size={16} className="text-navy" />
          Séances
        </h2>
        <div className="mb-4">
          {student.sessions.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune séance enregistrée.</p>
          ) : (
            student.sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onSave={(patch) =>
                  run('session', () =>
                    api.patch(`/students/${id}/sessions/${session.id}`, patch),
                  )
                }
              />
            ))
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Date</label>
            <input
              type="datetime-local"
              value={sessionForm.date}
              onChange={(e) => setSessionForm((f) => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Enseignant</label>
            <select
              value={sessionForm.teacherId}
              onChange={(e) => setSessionForm((f) => ({ ...f, teacherId: e.target.value }))}
              className={inputClass}
            >
              <option value="">—</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          <input
            value={sessionForm.notes}
            onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Contenu abordé (optionnel)"
            className={`${inputClass} min-w-[160px] flex-1`}
          />
          <Button
            icon={CalendarPlus}
            disabled={!sessionForm.date || savingAction === 'new-session'}
            onClick={() =>
              run('new-session', async () => {
                await api.post(`/students/${id}/sessions`, {
                  date: new Date(sessionForm.date).toISOString(),
                  teacherId: sessionForm.teacherId || undefined,
                  notes: sessionForm.notes || undefined,
                })
                setSessionForm({ date: '', teacherId: '', notes: '' })
              })
            }
          >
            Ajouter
          </Button>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <FileText size={16} className="text-navy" />
          Bilans de progression
        </h2>
        <div className="mb-4 space-y-3">
          {student.progressReports.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun bilan pour l'instant.</p>
          ) : (
            student.progressReports.map((report) => (
              <div key={report.id} className="border-l-2 border-gold-400 pl-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  {report.period && (
                    <span className="font-medium text-gray-600">{report.period}</span>
                  )}
                  <span>{report.adminAccount.name}</span>
                  <span>{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
                  {report.shareable && <Badge tone="green">Partageable</Badge>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{report.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={reportForm.period}
              onChange={(e) => setReportForm((f) => ({ ...f, period: e.target.value }))}
              placeholder="Période (ex: Trimestre 1)"
              className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={reportForm.shareable}
                onChange={(e) => setReportForm((f) => ({ ...f, shareable: e.target.checked }))}
                className="rounded border-gray-300 text-navy focus:ring-navy"
              />
              Partageable
            </label>
          </div>
          <textarea
            rows={3}
            value={reportForm.content}
            onChange={(e) => setReportForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Contenu du bilan"
            className={inputClass}
          />
          <Button
            icon={FileText}
            disabled={!reportForm.content || savingAction === 'report'}
            onClick={() =>
              run('report', async () => {
                await api.post(`/students/${id}/progress-reports`, reportForm)
                setReportForm({ period: '', content: '', shareable: false })
              })
            }
          >
            Ajouter le bilan
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Upload size={16} className="text-navy" />
          Documents
        </h2>
        <div className="mb-4 space-y-2">
          {student.documents.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun document pour l'instant.</p>
          ) : (
            student.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900">{doc.fileName}</span>
                  <span className="ml-2 text-gray-500">
                    {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} · {doc.uploadedBy.name} ·{' '}
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const { url } = await api.get(
                          `/students/${id}/documents/${doc.id}/download`,
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
                      run('delete-doc', () => api.del(`/students/${id}/documents/${doc.id}`))
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
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
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
            disabled={!documentForm.file || savingAction === 'upload'}
            onClick={() =>
              run('upload', async () => {
                const formData = new FormData()
                formData.append('file', documentForm.file)
                formData.append('type', documentForm.type)
                await api.upload(`/students/${id}/documents`, formData)
                setDocumentForm({ file: null, type: 'bulletin' })
              })
            }
          >
            Envoyer
          </Button>
        </div>
      </Card>
    </div>
  )
}
