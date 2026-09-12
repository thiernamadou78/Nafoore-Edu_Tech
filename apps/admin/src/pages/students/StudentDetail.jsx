import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CalendarPlus,
  Download,
  FileText,
  History,
  Power,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PaginationControls } from '../../components/ui/PaginationControls'
import { PhotoUploader } from '../../components/ui/PhotoUploader'
import { Timeline } from '../../components/ui/Timeline'
import { usePagination } from '../../lib/usePagination'
import {
  ATTENDANCE_METHOD_LABELS,
  CLASSE_LABELS,
  CLASSE_OPTIONS_BY_LEVEL,
  DOCUMENT_TYPE_LABELS,
  LEVEL_LABELS,
  PASS_STATUS_LABELS,
  PASS_STATUS_TONES,
  PROGRESS_ENTRY_LABELS,
  PROGRESS_ENTRY_TONES,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_TONES,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
} from './labels'
import { PassEducatifCard } from './PassEducatifCard'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const DAY_LABELS = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

// Même calcul que côté famille/enseignant : seules les séances confirmées
// réalisées comptent dans le cumul d'heures.
function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

const TABS = [
  { key: 'fiche', label: 'Fiche' },
  { key: 'enseignants', label: 'Enseignants' },
  { key: 'seances', label: 'Séances' },
  { key: 'bilans', label: 'Bilans & progression' },
  { key: 'documents', label: 'Documents' },
]

function SessionRow({ session, onSave }) {
  const [status, setStatus] = useState(session.status)
  const [attended, setAttended] = useState(session.attended ?? false)
  const [subject, setSubject] = useState(session.subject ?? '')
  const [notes, setNotes] = useState(session.notes ?? '')
  const [saving, setSaving] = useState(false)
  const dirty =
    status !== session.status ||
    attended !== (session.attended ?? false) ||
    subject !== (session.subject ?? '') ||
    notes !== (session.notes ?? '')

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ status, attended, subject: subject || undefined, notes })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-gray-900">
          {formatDateTime(session.date)}
        </span>
        <span className="text-gray-500">{session.teacher?.name ?? 'Enseignant non assigné'}</span>
        <Badge tone={SESSION_STATUS_TONES[session.status]}>
          {SESSION_STATUS_LABELS[session.status] ?? session.status}
        </Badge>
        {session.attendanceLogs?.[0]?.checkinAt && (
          <Badge tone="green">
            {new Date(session.attendanceLogs[0].checkinAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {session.attendanceLogs[0].checkoutAt && (
              <>
                {' → '}
                {new Date(session.attendanceLogs[0].checkoutAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
            {' · '}
            {session.attendanceLogs[0].method === 'qr_scan' ? 'Scan QR' : 'Manuel'}
          </Badge>
        )}
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
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Matière"
          className="w-36 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
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
          loading={saving}
          disabled={!dirty}
          onClick={handleSave}
          className="px-3 py-1.5"
        >
          Enregistrer
        </Button>
      </div>
    </div>
  )
}

function SessionsByStatusBoard({ sessions, onSave }) {
  const realisees = sessions.filter((s) => s.status === 'realisee')
  const rejetees = sessions.filter((s) => s.status === 'annulee')
  const programmees = sessions.filter((s) => s.status !== 'realisee' && s.status !== 'annulee')

  // Un hook par groupe, appelés sans condition (jamais dans une boucle/branche)
  // pour respecter les règles des hooks, même si un groupe est vide.
  const realiseesPage = usePagination(realisees, 5)
  const programmeesPage = usePagination(programmees, 5)
  const rejeteesPage = usePagination(rejetees, 5)

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500">Aucune séance enregistrée.</p>
  }

  const hasRejetees = rejetees.length > 0
  const groups = [
    { key: 'realisees', title: 'Réalisées', tone: 'green', sessions: realisees, page: realiseesPage },
    { key: 'programmees', title: 'À venir', tone: 'blue', sessions: programmees, page: programmeesPage },
    ...(hasRejetees
      ? [{ key: 'rejetees', title: 'Rejetées', tone: 'red', sessions: rejetees, page: rejeteesPage }]
      : []),
  ]

  return (
    <div className={`grid gap-4 ${hasRejetees ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {groups.map((group) => (
        <div key={group.key} className="rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
            <Badge tone={group.tone}>{group.sessions.length}</Badge>
          </div>
          <div className="px-4 py-3">
            {group.sessions.length === 0 ? (
              <p className="py-4 text-sm text-gray-400">Aucune séance.</p>
            ) : (
              <>
                {group.page.visible.map((session) => (
                  <SessionRow key={session.id} session={session} onSave={(patch) => onSave(session.id, patch)} />
                ))}
                <PaginationControls
                  {...group.page}
                  onShowMore={group.page.showMore}
                  onCollapse={group.page.collapse}
                  className="pt-2"
                />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [tab, setTab] = useState('fiche')
  const [form, setForm] = useState({ name: '', level: 'college', classe: '', subjects: '', objectives: '' })
  // { [teacherId]: string[] } — matieres couvertes par ce prof pour cet eleve.
  // Un prof present dans cette map (avec au moins 1 matiere) est "assigne".
  const [teacherAssignments, setTeacherAssignments] = useState({})
  const [sessionForm, setSessionForm] = useState({
    date: '',
    teacherId: '',
    subject: '',
    notes: '',
  })
  const [reportForm, setReportForm] = useState({ period: '', content: '', shareable: false })
  // Vide par defaut : le statut effectif est calcule a l'usage (voir
  // defaultProgressStatus) pour ne jamais pre-cocher "En progres" sur un
  // eleve qui n'a encore jamais eu de seance realisee.
  const [progressForm, setProgressForm] = useState({ subject: '', status: '' })
  const [documentForm, setDocumentForm] = useState({ file: null, type: 'bulletin' })
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)

  const load = () =>
    api.get(`/students/${id}`).then((data) => {
      setStudent(data)
      setForm({
        name: data.name,
        level: data.level,
        classe: data.classe ?? '',
        subjects: data.subjects.join(', '),
        objectives: data.objectives ?? '',
      })
      const grouped = {}
      for (const row of data.teachers) {
        const tid = row.teacher.id
        if (!grouped[tid]) grouped[tid] = []
        if (row.subject) grouped[tid].push(row.subject)
      }
      // Lignes historiques sans matiere precisee : par defaut on coche toutes
      // les matieres du prof pour ne rien perdre silencieusement au prochain
      // enregistrement.
      for (const row of data.teachers) {
        const tid = row.teacher.id
        if (!row.subject && grouped[tid].length === 0) {
          grouped[tid] = [...row.teacher.subjects]
        }
      }
      setTeacherAssignments(grouped)
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

  const toggleTeacher = (teacherId, teacherSubjects) => {
    setTeacherAssignments((prev) => {
      if (prev[teacherId]) {
        const { [teacherId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [teacherId]: [...teacherSubjects] }
    })
  }

  const toggleSubjectForTeacher = (teacherId, subject) => {
    setTeacherAssignments((prev) => {
      const current = prev[teacherId] ?? []
      const next = current.includes(subject)
        ? current.filter((s) => s !== subject)
        : [...current, subject]
      if (next.length === 0) {
        const { [teacherId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [teacherId]: next }
    })
  }

  if (!student) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  const hasRealizedSession = student.sessions.some((s) => s.status === 'realisee')
  const defaultProgressStatus = hasRealizedSession ? 'en_progres' : 'pas_commence'

  return (
    <div className="max-w-6xl">
      <Link
        to="/eleves"
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux élèves
      </Link>

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Colonne identité */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <PhotoUploader
                name={student.name}
                photoUrl={student.photoUrl}
                uploadPath={`/students/${id}/photo`}
                onChange={load}
              />
              <h1 className="mt-4 text-lg font-semibold text-gray-900">{student.name}</h1>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Badge tone="gray">{LEVEL_LABELS[student.level] ?? student.level}</Badge>
                <Badge tone={student.isActive ? 'green' : 'gray'}>
                  {student.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
            <Button
              variant={student.isActive ? 'danger' : 'secondary'}
              icon={Power}
              loading={savingAction === 'active'}
              className="mt-4 w-full"
              onClick={() =>
                run('active', () =>
                  api.patch(`/students/${id}/active`, { isActive: !student.isActive }),
                )
              }
            >
              {student.isActive ? 'Désactiver' : 'Activer'}
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <QrCode size={16} className="text-navy" />
              Pass Éducatif
            </h2>
            <div className="flex flex-col items-center gap-3">
              <PassEducatifCard student={student} />
              <Badge tone={PASS_STATUS_TONES[student.passStatus]}>
                {PASS_STATUS_LABELS[student.passStatus] ?? student.passStatus}
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={RefreshCw}
                loading={savingAction === 'qr-regenerate'}
                onClick={() => run('qr-regenerate', () => api.post(`/students/${id}/qr/regenerate`))}
              >
                Régénérer
              </Button>
              <Button
                variant={student.passStatus === 'active' ? 'danger' : 'success'}
                icon={student.passStatus === 'active' ? Ban : ShieldCheck}
                loading={savingAction === 'qr-status'}
                onClick={() =>
                  run('qr-status', () =>
                    api.patch(`/students/${id}/qr/status`, {
                      passStatus: student.passStatus === 'active' ? 'revoked' : 'active',
                    }),
                  )
                }
              >
                {student.passStatus === 'active' ? 'Révoquer' : 'Réactiver'}
              </Button>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Historique des scans</p>
              {student.attendanceLogs.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun scan pour l'instant.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                  {student.attendanceLogs.map((log) => (
                    <li key={log.id} className="border-b border-gray-100 pb-2">
                      <div className="text-gray-800">
                        {formatDateTime(log.createdAt)}
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                        <span>
                          {log.teacher.name} · {ATTENDANCE_METHOD_LABELS[log.method] ?? log.method}
                        </span>
                        <Badge tone={VERIFICATION_STATUS_TONES[log.verificationStatus]}>
                          {VERIFICATION_STATUS_LABELS[log.verificationStatus] ?? log.verificationStatus}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Colonne contenu */}
        <div>
          <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-200">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'border-navy text-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'fiche' && (
            <Card className="p-6">
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
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        level: e.target.value,
                        classe: CLASSE_OPTIONS_BY_LEVEL[e.target.value].includes(f.classe)
                          ? f.classe
                          : '',
                      }))
                    }
                    className={inputClass}
                  >
                    {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Classe</label>
                  <select
                    value={form.classe}
                    onChange={(e) => setForm((f) => ({ ...f, classe: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {CLASSE_OPTIONS_BY_LEVEL[form.level].map((value) => (
                      <option key={value} value={value}>
                        {CLASSE_LABELS[value]}
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
              <div className="mt-4">
                <Button
                  icon={Save}
                  loading={savingAction === 'info'}
                  onClick={() =>
                    run('info', () =>
                      api.patch(`/students/${id}`, {
                        name: form.name,
                        level: form.level,
                        classe: form.classe || undefined,
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
              </div>
            </Card>
          )}

          {tab === 'enseignants' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-1 font-semibold text-gray-900">Enseignant(s) assigné(s)</h2>
                <p className="mb-3 text-xs text-gray-500">
                  Un même professeur peut être coché pour plusieurs matières (ex : Maths et
                  Physique-Chimie) — chacune aura son propre planning côté enseignant.
                </p>
                <div className="mb-3 space-y-3">
                  {teachers.map((teacher) => {
                    const selectedSubjects = teacherAssignments[teacher.id] ?? []
                    const isChecked = Boolean(teacherAssignments[teacher.id])
                    return (
                      <div key={teacher.id} className="rounded-lg border border-gray-200 p-3">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTeacher(teacher.id, teacher.subjects)}
                            className="rounded border-gray-300 text-navy focus:ring-navy"
                          />
                          {teacher.name}
                        </label>
                        {isChecked && (
                          <div className="mt-2 flex flex-wrap gap-2 pl-5">
                            {teacher.subjects.length === 0 ? (
                              <p className="text-xs text-gray-400">
                                Ce professeur n'a aucune matière renseignée sur son profil.
                              </p>
                            ) : (
                              teacher.subjects.map((subject) => (
                                <label
                                  key={subject}
                                  className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedSubjects.includes(subject)}
                                    onChange={() => toggleSubjectForTeacher(teacher.id, subject)}
                                    className="rounded border-gray-300 text-navy focus:ring-navy"
                                  />
                                  {subject}
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {teachers.length === 0 && (
                    <p className="text-sm text-gray-500">Aucun enseignant vérifié pour l'instant.</p>
                  )}
                </div>
                <Button
                  icon={UserCheck}
                  loading={savingAction === 'teachers'}
                  onClick={() =>
                    run('teachers', () =>
                      api.patch(`/students/${id}/teachers`, {
                        assignments: Object.entries(teacherAssignments).map(
                          ([teacherId, subjects]) => ({ teacherId, subjects }),
                        ),
                      }),
                    )
                  }
                >
                  Enregistrer les enseignants
                </Button>
              </Card>

              <Card className="p-6">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <History size={16} className="text-navy" />
                  Historique
                </h2>
                <Timeline
                  items={student.teacherHistory}
                  emptyLabel="Aucun changement pour l'instant."
                  renderItem={(entry) => (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={entry.action === 'assigned' ? 'green' : 'red'}>
                        {entry.action === 'assigned' ? 'Assigné' : 'Retiré'}
                      </Badge>
                      <span className="font-medium text-gray-900">{entry.teacher.name}</span>
                      <span className="text-gray-500">
                        par {entry.adminAccount.name} ·{' '}
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                  )}
                />
              </Card>
            </div>
          )}

          {tab === 'seances' && (
            <div className="space-y-6">
              {student.recurringSchedules?.length > 0 && (
                <Card className="p-6">
                  <h2 className="mb-3 font-semibold text-gray-900">Programme</h2>
                  <div className="space-y-4">
                    {student.recurringSchedules.map((schedule) => (
                      <div key={schedule.id}>
                        <p className="mb-1.5 text-sm text-gray-700">
                          <span className="font-medium text-gray-900">
                            {schedule.teacher.name}
                          </span>{' '}
                          — {schedule.frequency} séance{schedule.frequency > 1 ? 's' : ''} par
                          semaine{schedule.subject && ` · ${schedule.subject}`}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[...schedule.slots]
                            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                            .map((slot, i) => (
                              <Badge key={i} tone="gold">
                                {DAY_LABELS[slot.dayOfWeek]} {slot.time}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <Card className="p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <CalendarPlus size={16} className="text-navy" />
                  Séances
                </h2>
                <span className="text-sm text-gray-500">
                  Heures cumulées :{' '}
                  <span className="font-semibold text-gray-800">
                    {formatMinutes(
                      student.sessions
                        .filter((s) => s.status === 'realisee' && s.attendanceLogs?.[0]?.checkoutAt)
                        .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
                    )}
                  </span>
                </span>
              </div>
              <div className="mb-4">
                <SessionsByStatusBoard
                  sessions={student.sessions}
                  onSave={(sessionId, patch) =>
                    run('session', () => api.patch(`/students/${id}/sessions/${sessionId}`, patch))
                  }
                />
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
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Matière</label>
                  <input
                    value={sessionForm.subject}
                    onChange={(e) => setSessionForm((f) => ({ ...f, subject: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <input
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Contenu abordé (optionnel)"
                  className={`${inputClass} min-w-[160px] flex-1`}
                />
                <Button
                  icon={CalendarPlus}
                  loading={savingAction === 'new-session'}
                  disabled={!sessionForm.date}
                  onClick={() =>
                    run('new-session', async () => {
                      await api.post(`/students/${id}/sessions`, {
                        date: new Date(sessionForm.date).toISOString(),
                        teacherId: sessionForm.teacherId || undefined,
                        subject: sessionForm.subject || undefined,
                        notes: sessionForm.notes || undefined,
                      })
                      setSessionForm({ date: '', teacherId: '', subject: '', notes: '' })
                    })
                  }
                >
                  Ajouter
                </Button>
              </div>
              </Card>
            </div>
          )}

          {tab === 'bilans' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <FileText size={16} className="text-navy" />
                  Bilans de progression
                </h2>
                <div className="mb-4">
                  <Timeline
                    items={student.progressReports}
                    emptyLabel="Aucun bilan pour l'instant."
                    renderItem={(report) => (
                      <>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {report.period && (
                            <span className="font-medium text-gray-600">{report.period}</span>
                          )}
                          <span>{report.adminAccount.name}</span>
                          <span>{formatDate(report.createdAt)}</span>
                          {report.shareable && <Badge tone="green">Partageable</Badge>}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                          {report.content}
                        </p>
                      </>
                    )}
                  />
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
                    loading={savingAction === 'report'}
                    disabled={!reportForm.content}
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
                  <Sparkles size={16} className="text-navy" />
                  Progression (par matière)
                </h2>
                <p className="mb-3 text-xs text-gray-500">
                  Statut affiché à la famille dans le portail. Une seule entrée par matière —
                  enregistrer à nouveau met à jour le statut existant.
                </p>
                <div className="mb-4 space-y-2">
                  {student.progressEntries.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucune matière suivie pour l'instant.</p>
                  ) : (
                    student.progressEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-800">{entry.subject}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {entry.teacher
                              ? `Enseignant : ${entry.teacher.name}`
                              : entry.adminAccount
                                ? `Admin : ${entry.adminAccount.name}`
                                : ''}
                          </span>
                        </div>
                        <Badge tone={PROGRESS_ENTRY_TONES[entry.status]}>
                          {PROGRESS_ENTRY_LABELS[entry.status] ?? entry.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Matière</label>
                    <input
                      value={progressForm.subject}
                      onChange={(e) => setProgressForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="Mathématiques"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Statut</label>
                    <select
                      value={progressForm.status || defaultProgressStatus}
                      onChange={(e) => setProgressForm((f) => ({ ...f, status: e.target.value }))}
                      className={inputClass}
                    >
                      {Object.entries(PROGRESS_ENTRY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    icon={Sparkles}
                    loading={savingAction === 'progress-entry'}
                    disabled={!progressForm.subject}
                    onClick={() =>
                      run('progress-entry', async () => {
                        await api.put(`/students/${id}/progress-entries`, {
                          ...progressForm,
                          status: progressForm.status || defaultProgressStatus,
                        })
                        setProgressForm({ subject: '', status: '' })
                      })
                    }
                  >
                    Enregistrer
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {tab === 'documents' && (
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
                          {formatDate(doc.createdAt)}
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
                  loading={savingAction === 'upload'}
                  disabled={!documentForm.file}
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
          )}
        </div>
      </div>
    </div>
  )
}
