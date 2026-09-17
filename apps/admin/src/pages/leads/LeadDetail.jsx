import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  MapPin,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Timeline } from '../../components/ui/Timeline'
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONES, PROFILE_LABELS, SERVICE_LABELS } from './statusLabels'
import { CLASSE_LABELS, LEVEL_LABELS } from '../students/labels'

const VALIDATABLE_STATUSES = ['en_verification', 'valide']

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // null | 'validate' | 'resend'
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressDraft, setAddressDraft] = useState('')
  const [postalCodeDraft, setPostalCodeDraft] = useState('')

  const load = () => api.get(`/leads/${id}`).then(setLead)

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
      setConfirmModal(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAction(null)
    }
  }

  const handleStatusChange = async (newStatus) => {
    const previousStatus = lead.status
    // Mise à jour optimiste : le badge/select change tout de suite, pas
    // besoin d'attendre le PATCH puis un second GET complet de la fiche.
    setLead((prev) => ({ ...prev, status: newStatus }))
    setSavingAction('status')
    setError(null)
    try {
      const updated = await api.patch(`/leads/${id}/status`, { status: newStatus })
      setLead((prev) => ({ ...prev, ...updated }))
    } catch (err) {
      setLead((prev) => ({ ...prev, status: previousStatus }))
      setError(err.message)
    } finally {
      setSavingAction(null)
    }
  }

  const startEditingAddress = () => {
    setAddressDraft(lead.address ?? '')
    setPostalCodeDraft(lead.postalCode ?? '')
    setEditingAddress(true)
  }

  const handleSaveAddress = () =>
    run('address', async () => {
      const updated = await api.patch(`/leads/${id}/address`, {
        address: addressDraft,
        postalCode: postalCodeDraft,
      })
      setLead((prev) => ({ ...prev, ...updated }))
      setEditingAddress(false)
    })

  if (!lead) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="max-w-5xl">
      <Link
        to="/leads"
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux leads
      </Link>

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Colonne identité */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-6">
            <h1 className="text-lg font-semibold text-gray-900">{lead.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={LEAD_STATUS_TONES[lead.status]}>
                {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
              </Badge>
              <Badge tone="gray">{PROFILE_LABELS[lead.profile] ?? lead.profile}</Badge>
              {lead.services?.map((service) => (
                <Badge key={service} tone="gold">
                  {SERVICE_LABELS[service] ?? service}
                </Badge>
              ))}
            </div>
            <div className="mt-3 space-y-0.5 text-sm text-gray-600">
              <p>{lead.email}</p>
              {lead.phone && <p>{lead.phone}</p>}
            </div>
            {lead.profile === 'famille' && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {editingAddress ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={addressDraft}
                      onChange={(e) => setAddressDraft(e.target.value)}
                      placeholder="Quartier, commune, ville…"
                      className={inputClass}
                    />
                    <input
                      value={postalCodeDraft}
                      onChange={(e) => setPostalCodeDraft(e.target.value)}
                      placeholder="Code postal (75015)"
                      pattern="\d{5}"
                      maxLength={5}
                      className={inputClass}
                    />
                    <div className="flex gap-2">
                      <Button
                        loading={savingAction === 'address'}
                        disabled={!addressDraft.trim() || !postalCodeDraft.trim()}
                        onClick={handleSaveAddress}
                        className="px-3 py-1.5 text-xs"
                      >
                        Enregistrer
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingAddress(false)}
                        className="px-3 py-1.5 text-xs"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : lead.address ? (
                  <div className="flex items-start justify-between gap-2 text-sm text-gray-700">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
                      <span>
                        {lead.address}
                        {lead.postalCode && ` (${lead.postalCode})`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={startEditingAddress}
                      className="shrink-0 text-gray-400 hover:text-navy"
                      title="Modifier l'adresse"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditingAddress}
                    className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:underline"
                  >
                    <MapPin size={15} />
                    Ajouter une adresse
                  </button>
                )}
              </div>
            )}
            {(lead.desiredStartDate || lead.childrenCount) && (
              <div className="mt-3 flex gap-6 border-t border-gray-100 pt-3">
                {lead.desiredStartDate && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Début souhaité
                    </p>
                    <p className="text-sm text-gray-700">
                      {formatDate(lead.desiredStartDate)}
                    </p>
                  </div>
                )}
                {lead.childrenCount && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Enfants à inscrire
                    </p>
                    <p className="text-sm text-gray-700">{lead.childrenCount}</p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Message
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{lead.message}</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-gray-900">Statut</h2>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={inputClass}
            >
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-gray-900">Compte portail</h2>
            {lead.portalAccount ? (
              <div className="space-y-3">
                <Badge tone="green">Compte actif</Badge>
                <Button
                  variant="secondary"
                  icon={RefreshCw}
                  className="w-full"
                  loading={savingAction === 'resend'}
                  onClick={() => setConfirmModal('resend')}
                >
                  Renvoyer les identifiants
                </Button>
              </div>
            ) : VALIDATABLE_STATUSES.includes(lead.status) ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Aucun compte {PROFILE_LABELS[lead.profile] ?? lead.profile} n'a encore été créé.
                </p>
                <Button
                  icon={KeyRound}
                  className="w-full"
                  loading={savingAction === 'validate'}
                  onClick={() => setConfirmModal('validate')}
                >
                  Valider et créer le compte
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Passez le statut du lead à « En vérification » ou « Validé » pour pouvoir créer
                son compte.
              </p>
            )}
          </Card>
        </div>

        {/* Colonne contenu */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Enfants</h2>
              <Button
                variant="secondary"
                icon={UserPlus}
                onClick={() => {
                  const params = new URLSearchParams({ leadId: id, familyName: lead.name })
                  if (lead.address) params.set('address', lead.address)
                  if (lead.postalCode) params.set('postalCode', lead.postalCode)
                  navigate(`/leads/nouvelle/enfants?${params.toString()}`)
                }}
              >
                Ajouter un enfant
              </Button>
            </div>
            {lead.students.length > 0 ? (
              <ul className="divide-y divide-gray-100 text-sm text-gray-700">
                {lead.students.map((student) => (
                  <li key={student.id} className="py-2">
                    <span className="font-medium text-gray-900">{student.name}</span> —{' '}
                    {student.classe
                      ? (CLASSE_LABELS[student.classe] ?? student.classe)
                      : (LEVEL_LABELS[student.level] ?? student.level)}
                    {student.school ? ` · ${student.school}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun enfant renseigné pour l'instant.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-gray-900">Historique des échanges</h2>
            <div className="mb-4">
              <Timeline
                items={lead.notes}
                emptyLabel="Aucune note pour l'instant."
                renderItem={(note) => (
                  <>
                    <p className="text-sm text-gray-700">{note.note}</p>
                    <p className="text-xs text-gray-400">
                      {note.adminAccount.name} ·{' '}
                      {formatDateTime(note.createdAt)}
                    </p>
                  </>
                )}
              />
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
        </div>
      </div>

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
            loading={savingAction === 'validate'}
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
            loading={savingAction === 'resend'}
            onClick={() => run('resend', () => api.post(`/leads/${id}/resend-credentials`, {}))}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
