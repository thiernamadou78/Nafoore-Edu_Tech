import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  GraduationCap,
  KeyRound,
  MessageSquarePlus,
  RefreshCw,
  Save,
  UserCheck,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONES, PROFILE_LABELS } from './statusLabels'

const VALIDATABLE_STATUSES = ['en_verification', 'valide']

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function LeadDetail() {
  const { id } = useParams()
  const [lead, setLead] = useState(null)
  const [assignableAccounts, setAssignableAccounts] = useState([])
  const [status, setStatus] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [noteText, setNoteText] = useState('')
  const [studentLevel, setStudentLevel] = useState('college')
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // null | 'validate' | 'resend'

  const load = () =>
    api.get(`/leads/${id}`).then((data) => {
      setLead(data)
      setStatus(data.status)
      setAssignedToId(data.assignedTo?.id ?? '')
    })

  useEffect(() => {
    load().catch((err) => setError(err.message))
    api
      .get('/admin-accounts/assignable')
      .then(setAssignableAccounts)
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const run = async (action, fn) => {
    setSavingAction(action)
    setError(null)
    try {
      await fn()
      await load()
      setConfirmModal(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAction(null)
    }
  }

  if (!lead) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="max-w-3xl">
      <Link
        to="/leads"
        className="mb-2 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux leads
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{lead.name}</h1>
        <Badge tone={LEAD_STATUS_TONES[lead.status]}>
          {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
        </Badge>
      </div>
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        {lead.email}
        {lead.phone ? ` · ${lead.phone}` : ''} · {PROFILE_LABELS[lead.profile] ?? lead.profile}
      </p>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Message</h2>
        <p className="whitespace-pre-wrap text-sm text-gray-700">{lead.message}</p>
      </Card>

      {error && <Alert>{error}</Alert>}

      <div className="mb-6 flex flex-wrap gap-4">
        <Card className="min-w-[220px] flex-1 p-6">
          <h2 className="mb-3 font-semibold text-gray-900">Statut</h2>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${inputClass} flex-1`}
            >
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              icon={Save}
              disabled={status === lead.status || savingAction === 'status'}
              onClick={() =>
                run('status', () => api.patch(`/leads/${id}/status`, { status }))
              }
            >
              Mettre à jour
            </Button>
          </div>
        </Card>

        <Card className="min-w-[220px] flex-1 p-6">
          <h2 className="mb-3 font-semibold text-gray-900">Assigné à</h2>
          <div className="flex gap-2">
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className={`${inputClass} flex-1`}
            >
              <option value="">Non assigné</option>
              {assignableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <Button
              icon={UserCheck}
              disabled={savingAction === 'assign'}
              onClick={() =>
                run('assign', () =>
                  assignedToId
                    ? api.patch(`/leads/${id}/assign`, { assignedToId })
                    : api.patch(`/leads/${id}/unassign`, {}),
                )
              }
            >
              Enregistrer
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Compte portail</h2>
        {lead.portalAccount ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone="green">Compte actif</Badge>
            <Button
              variant="secondary"
              icon={RefreshCw}
              disabled={savingAction === 'resend'}
              onClick={() => setConfirmModal('resend')}
            >
              Renvoyer les identifiants
            </Button>
          </div>
        ) : VALIDATABLE_STATUSES.includes(lead.status) ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Aucun compte {PROFILE_LABELS[lead.profile] ?? lead.profile} n'a encore été créé.
            </p>
            <Button
              icon={KeyRound}
              disabled={savingAction === 'validate'}
              onClick={() => setConfirmModal('validate')}
            >
              Valider et créer le compte
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Passez le statut du lead à « En vérification » ou « Validé » pour pouvoir créer son compte.
          </p>
        )}
      </Card>

      <Modal
        open={confirmModal === 'validate'}
        onClose={() => setConfirmModal(null)}
        title="Valider et créer le compte"
      >
        <p className="mb-5 text-sm text-gray-600">
          Un compte <strong>{PROFILE_LABELS[lead.profile] ?? lead.profile}</strong> sera créé pour{' '}
          <strong>{lead.email}</strong>, avec un mot de passe temporaire envoyé par email.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmModal(null)}>
            Annuler
          </Button>
          <Button
            icon={KeyRound}
            disabled={savingAction === 'validate'}
            onClick={() => run('validate', () => api.post(`/leads/${id}/validate`, {}))}
          >
            Confirmer
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmModal === 'resend'}
        onClose={() => setConfirmModal(null)}
        title="Renvoyer les identifiants"
      >
        <p className="mb-5 text-sm text-gray-600">
          Un nouveau mot de passe temporaire sera généré et envoyé à <strong>{lead.email}</strong>,
          invalidant l'ancien.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmModal(null)}>
            Annuler
          </Button>
          <Button
            icon={RefreshCw}
            disabled={savingAction === 'resend'}
            onClick={() => run('resend', () => api.post(`/leads/${id}/resend-credentials`, {}))}
          >
            Confirmer
          </Button>
        </div>
      </Modal>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Historique des échanges</h2>
        <div className="mb-4 space-y-3">
          {lead.notes.length === 0 && (
            <p className="text-sm text-gray-500">Aucune note pour l'instant.</p>
          )}
          {lead.notes.map((note) => (
            <div key={note.id} className="border-l-2 border-gold-400 pl-3">
              <p className="text-sm text-gray-700">{note.note}</p>
              <p className="text-xs text-gray-400">
                {note.adminAccount.name} · {new Date(note.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          className={`${inputClass} mb-3`}
          placeholder="Ajouter une note (appel, email, échange...)"
        />
        <Button
          icon={MessageSquarePlus}
          disabled={!noteText || savingAction === 'note'}
          onClick={() =>
            run('note', async () => {
              await api.post(`/leads/${id}/notes`, { note: noteText })
              setNoteText('')
            })
          }
        >
          Ajouter la note
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Élève</h2>
        {lead.students.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-gray-700">
            {lead.students.map((student) => (
              <li key={student.id}>
                {student.name} — {student.level}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Niveau</label>
              <select
                value={studentLevel}
                onChange={(e) => setStudentLevel(e.target.value)}
                className={inputClass}
              >
                <option value="college">Collège</option>
                <option value="lycee">Lycée</option>
              </select>
            </div>
            <Button
              icon={GraduationCap}
              disabled={savingAction === 'convert'}
              onClick={() =>
                run('convert', () =>
                  api.post(`/leads/${id}/convert-to-student`, { level: studentLevel }),
                )
              }
            >
              Convertir en élève
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
