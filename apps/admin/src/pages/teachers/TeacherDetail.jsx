import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, FileText, Power, Save, Trash2, Upload, Eye } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Collapsible } from '../../components/ui/Collapsible'
import { EmptyState } from '../../components/ui/EmptyState'
import { PaginationControls } from '../../components/ui/PaginationControls'
import { PlanningCalendar } from '../../components/ui/PlanningCalendar'
import { SessionReport } from '../../components/SessionReport'
import { PhotoUploader } from '../../components/ui/PhotoUploader'
import { usePagination } from '../../lib/usePagination'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from '../students/labels'
import { SubjectPicker } from './SubjectPicker'
import { LevelPicker } from '../../components/LevelPicker'
import { formatLevels } from '../../lib/levels'
import { DocumentViewer } from '../../components/DocumentViewer'
import { useCitySuggestions } from '../../lib/useCitySuggestions'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const PHONE_PATTERN = /^(\+33 ?|0)[1-9]([ .-]?\d{2}){4}$/

const TEACHER_DOCUMENT_TYPE_LABELS = {
  cv: 'CV',
  piece_identite: "Pièce d'identité",
  diplome: 'Diplôme',
  casier_judiciaire: 'Casier judiciaire',
  autre: 'Autre',
}

const timeOf = (date) =>
  new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function pointageLabel(session) {
  if (!session.checkinAt) return null
  return `${timeOf(session.checkinAt)} → ${session.checkoutAt ? timeOf(session.checkoutAt) : 'en cours'} · ${
    session.pointageMethod === 'qr_scan' ? 'Scan QR' : 'Manuel'
  }`
}

export function TeacherDetail() {
  const { id } = useParams()
  const [viewing, setViewing] = useState(null) // document ouvert dans le lecteur
  const [teacher, setTeacher] = useState(null)
  const [form, setForm] = useState({
    name: '',
    gender: '',
    subjects: [],
    levels: [],
    classes: [],
    bio: '',
    address: '',
    postalCode: '',
    city: '',
    email: '',
    phone: '',
  })
  // Ville proposee / remplie a partir du code postal.
  const { listId: cityListId, options: cityOptions } = useCitySuggestions(
    form?.postalCode,
    form?.city,
    (city) => setForm((f) => (f ? { ...f, city } : f)),
  )
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)
  const [documentForm, setDocumentForm] = useState({ file: null, type: 'diplome' })

  const load = () =>
    api.get(`/teachers/${id}`).then((data) => {
      setTeacher(data)
      setForm({
        name: data.name,
        gender: data.gender ?? '',
        subjects: data.subjects,
        levels: data.levels ?? [],
        classes: data.classes ?? [],
        bio: data.bio ?? '',
        address: data.address ?? '',
        postalCode: data.postalCode ?? '',
        city: data.city ?? '',
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
  const [sessionsView, setSessionsView] = useState('calendrier')

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
      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>
          <span className="text-gray-400">Matières : </span>
          {teacher.subjects.join(', ') || '—'}
        </span>
        <span>
          <span className="text-gray-400">Niveaux : </span>
          {formatLevels(teacher.levels, teacher.classes) || (
            <span className="text-amber-700">non renseignés (l'enseignant ne recevra aucune demande)</span>
          )}
        </span>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Genre *</label>
            <select
              required
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              className={inputClass}
            >
              <option value="">Choisir…</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Ville / Commune *</label>
            <input
              required
              minLength={2}
              list={cityListId}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Ex : Chevilly-Larue"
              className={inputClass}
            />
            <datalist id={cityListId}>
              {cityOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Niveaux et classes enseignés
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Utilisés pour proposer les demandes des familles : un prof de 6e ne reçoit pas les
              demandes de 5e.
            </p>
            <LevelPicker
              levels={form.levels}
              classes={form.classes}
              onChange={({ levels, classes }) => setForm((f) => ({ ...f, levels, classes }))}
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
                !form.gender ||
                !form.address.trim() ||
                !form.postalCode.trim() ||
                !form.city.trim() ||
                !form.email.trim() ||
                !form.phone.trim() ||
                form.subjects.length === 0
              ) {
                setError('Nom, genre, ville, adresse, code postal, email, téléphone et au moins une matière sont obligatoires.')
                return
              }
              if (!PHONE_PATTERN.test(form.phone.trim())) {
                setError('Numéro de téléphone invalide (ex : 06 12 34 56 78).')
                return
              }
              run('info', () =>
                api.patch(`/teachers/${id}`, {
                  name: form.name,
                  gender: form.gender,
                  subjects: form.subjects,
                  levels: form.levels,
                  classes: form.classes,
                  bio: form.bio.trim(),
                  address: form.address,
                  postalCode: form.postalCode,
                  city: form.city.trim(),
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
                    onClick={() => setViewing({ path: `/teachers/${id}/documents/${doc.id}/view`, fileName: doc.fileName })}
                    className="inline-flex items-center gap-1 text-navy hover:underline"
                  >
                    <Eye size={14} />
                    Voir
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Supprimer définitivement « ${doc.fileName} » ?`)) return
                      run('delete-doc', () => api.del(`/teachers/${id}/documents/${doc.id}`))
                    }}
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
              accept=".pdf,.jpg,.jpeg,.png"
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
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-3">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <CalendarClock size={16} className="text-navy" />
            Séances
          </h2>
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
          {[
            ['calendrier', 'Calendrier'],
            ['tableau', 'Tableau'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSessionsView(key)}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                sessionsView === key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        </div>
        {sessionsView === 'calendrier' && teacher.sessions.length > 0 ? (
          <div className="p-6 pt-2">
            <PlanningCalendar
              sessions={teacher.sessions}
              renderSession={(session) => (
                <Card className="p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">
                      {new Date(session.date).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {session.subject ? ` · ${session.subject}` : ''}
                    </p>
                    <Badge tone={SESSION_STATUS_TONES[session.status]}>
                      {SESSION_STATUS_LABELS[session.status] ?? session.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {session.studentName} · {session.familyName}
                  </p>
                  {pointageLabel(session) && (
                    <p className="mt-1 text-xs text-gray-500">Pointage : {pointageLabel(session)}</p>
                  )}
                  <div className="mt-1">
                    <SessionReport session={session} />
                  </div>
                  {session.status === 'annulee' && session.cancellationReason && (
                    <p className="mt-1 text-xs text-gray-600">Motif : {session.cancellationReason}</p>
                  )}
                </Card>
              )}
            />
          </div>
        ) : teacher.sessions.length === 0 ? (
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
                <th className="px-4 py-3 font-medium">Pointage</th>
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
                  <td className="px-4 py-3 text-gray-700">{pointageLabel(session) ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {session.status === 'annulee' ? (session.cancellationReason ?? '—') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {sessionsView !== 'calendrier' && <PaginationControls
          {...sessionsPage}
          onShowMore={sessionsPage.showMore}
          onCollapse={sessionsPage.collapse}
          className="px-4 pb-4 pt-1"
        />}
      </Card>
      {viewing && (
        <DocumentViewer
          path={viewing.path}
          fileName={viewing.fileName}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
