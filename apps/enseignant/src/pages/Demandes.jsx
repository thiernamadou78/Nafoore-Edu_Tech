import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, MapPin, RefreshCw, Send, Sparkles, ThumbsDown } from 'lucide-react'
import { api } from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { formatDate } from '../lib/format'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { LEVEL_LABELS } from './labels'

const FORMAT_LABELS = {
  presentiel: 'Présentiel',
  distanciel: 'Distanciel',
  hybride: 'Hybride',
}

const CLASSE_LABELS = {
  cp: 'CP',
  ce1: 'CE1',
  ce2: 'CE2',
  cm1: 'CM1',
  cm2: 'CM2',
  '6e': '6ème',
  '5e': '5ème',
  '4e': '4ème',
  '3e': '3ème',
  '2nde': '2nde',
  '1re': '1ère',
  terminale: 'Terminale',
}

const PROPOSAL_STATUS = {
  proposee: { label: 'En attente de la famille', tone: 'blue' },
  acceptee: { label: 'Acceptée', tone: 'green' },
  refusee: { label: 'Rejetée', tone: 'red' },
}

const PROPOSAL_FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'proposee', label: 'En attente' },
  { key: 'acceptee', label: 'Acceptées' },
  { key: 'refusee', label: 'Rejetées' },
]

const classLabel = (item) =>
  CLASSE_LABELS[item.classe] ?? LEVEL_LABELS[item.level] ?? item.level ?? null

// availability est stockee "jours · creneaux" (cf. formulaire famille).
function splitAvailability(availability) {
  if (!availability) return { days: null, slots: null }
  const [days, slots] = availability.split(' · ')
  return { days: days || null, slots: slots || null }
}

function RequestCard({ request, onReact, saving }) {
  const [open, setOpen] = useState(false)
  const { days, slots } = splitAvailability(request.availability)
  const place = [request.postalCode, request.city].filter(Boolean).join(' ')

  return (
    <Card className="p-5">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        Demande de prof pour cours de {request.subject}
      </h3>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="blue">{FORMAT_LABELS[request.format] ?? request.format}</Badge>
        {LEVEL_LABELS[request.level] && <Badge tone="gray">Niveau : {LEVEL_LABELS[request.level]}</Badge>}
        {CLASSE_LABELS[request.classe] && <Badge tone="gray">Classe : {CLASSE_LABELS[request.classe]}</Badge>}
      </div>
      {request.school && (
        <p className="mb-1 text-sm text-gray-600">
          <span className="text-gray-500">École : </span>
          {request.school}
        </p>
      )}
      {place && (
        <p className="flex items-center gap-1.5 text-sm text-gray-600">
          <MapPin size={14} className="shrink-0 text-gray-400" />
          {place}
        </p>
      )}
      <p className="mt-1 text-sm text-gray-600">
        Début souhaité :{' '}
        {request.desiredStartDate ? formatDate(request.desiredStartDate) : 'dès que possible'}
      </p>
      <p className="mt-2 text-xs text-gray-400">Demande du {formatDate(request.createdAt)}</p>

      {request.reaction && (
        <div className="mt-3">
          <Badge tone={request.reaction === 'interested' ? 'gold' : 'gray'}>
            {request.reaction === 'interested' ? 'Tu es intéressé' : "Tu n'es pas intéressé"}
          </Badge>
        </div>
      )}

      {!open ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            {request.reaction ? 'Modifier ma réaction' : 'Réagir à la demande'}
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <dl className="space-y-1.5 text-sm">
            <div>
              <dt className="inline text-gray-500">Disponibilités : </dt>
              <dd className="inline text-gray-800">{days ?? 'Non précisées'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-500">Créneau : </dt>
              <dd className="inline text-gray-800">{slots ?? 'Non précisé'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-500">Durée de l'accompagnement : </dt>
              <dd className="inline text-gray-800">
                {request.periodMonths ? `${request.periodMonths} mois` : 'Non précisée'}
              </dd>
            </div>
            <div>
              <dt className="inline text-gray-500">Durée par séance : </dt>
              <dd className="inline text-gray-800">
                {request.durationMinutes ? `${request.durationMinutes} min` : 'Non précisée'}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              icon={Check}
              loading={saving}
              onClick={() => onReact(request.id, true).then(() => setOpen(false))}
            >
              Intéressé
            </Button>
            <Button
              variant="secondary"
              icon={ThumbsDown}
              loading={saving}
              onClick={() => onReact(request.id, false).then(() => setOpen(false))}
            >
              Pas intéressé
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

const RENEWAL_STATUS = {
  en_attente_prof: { label: 'À traiter', tone: 'amber' },
  acceptee_prof: { label: 'Accepté — confirmation par Nafoore', tone: 'blue' },
  refusee_prof: { label: 'Décliné', tone: 'gray' },
  confirmee: { label: 'Confirmé', tone: 'green' },
  refusee_admin: { label: 'Refusé par Nafoore', tone: 'red' },
}

function RenewalCard({ renewal, onRespond, saving }) {
  const [declining, setDeclining] = useState(false)
  const [comment, setComment] = useState('')
  const status = RENEWAL_STATUS[renewal.status] ?? { label: renewal.status, tone: 'gray' }

  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Renouvellement · {renewal.studentName}
          {renewal.subject ? ` · ${renewal.subject}` : ''}
        </h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="text-sm text-gray-600">
        La famille souhaite poursuivre l'accompagnement pour {renewal.periodMonths} mois.
      </p>
      <p className="mt-1 text-xs text-gray-400">Demandé le {formatDate(renewal.createdAt)}</p>
      {renewal.teacherComment && (
        <p className="mt-2 text-xs text-gray-500">Ton commentaire : {renewal.teacherComment}</p>
      )}

      {renewal.status === 'en_attente_prof' &&
        (declining ? (
          <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">
              Si tu déclines, une nouvelle demande de professeur sera ouverte pour la famille.
            </p>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="Motif (facultatif)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                icon={ThumbsDown}
                loading={saving}
                onClick={() => onRespond(renewal.id, false, comment)}
              >
                Confirmer le refus
              </Button>
              <Button variant="secondary" disabled={saving} onClick={() => setDeclining(false)}>
                Retour
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button icon={Check} loading={saving} onClick={() => onRespond(renewal.id, true)}>
              Accepter
            </Button>
            <Button variant="secondary" icon={ThumbsDown} onClick={() => setDeclining(true)}>
              Décliner
            </Button>
          </div>
        ))}
    </Card>
  )
}

function ProposalCard({ proposal }) {
  const status = PROPOSAL_STATUS[proposal.status] ?? { label: proposal.status, tone: 'gray' }
  const place = proposal.postalCode ?? ''

  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Cours de {proposal.subject}
          {classLabel(proposal) ? ` · ${classLabel(proposal)}` : ''}
        </h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="text-sm text-gray-600">
        {FORMAT_LABELS[proposal.format] ?? proposal.format}
        {place ? ` · ${place}` : ''}
      </p>
      {proposal.hourlyRate && (
        <p className="mt-1 text-sm font-medium text-navy">Tarif proposé : {proposal.hourlyRate} €/h</p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        Proposé le {formatDate(proposal.createdAt)}
        {proposal.respondedAt && ` · réponse de la famille le ${formatDate(proposal.respondedAt)}`}
      </p>
      {proposal.status === 'refusee' && proposal.refusalReason && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Motif : {proposal.refusalReason}
        </p>
      )}
    </Card>
  )
}

export function Demandes() {
  const [tab, setTab] = useState('demandes')
  const [requests, setRequests] = useState(null)
  const [proposals, setProposals] = useState(null)
  const [renewals, setRenewals] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const loadRequests = () => api.get('/teacher/open-requests').then(setRequests)
  const loadProposals = () => api.get('/teacher/proposals').then(setProposals)
  const loadRenewals = () => api.get('/teacher/renewals').then(setRenewals)

  useEffect(() => {
    Promise.all([loadRequests(), loadProposals(), loadRenewals()]).catch((err) => setError(err.message))
  }, [])

  useAutoRefresh(() => {
    Promise.all([loadRequests(), loadProposals(), loadRenewals()]).catch(() => {})
  })

  const react = async (requestId, interested) => {
    setSavingId(requestId)
    setError(null)
    try {
      await api.post(
        `/teacher/open-requests/${requestId}/${interested ? 'interest' : 'not-interested'}`,
        {},
      )
      await loadRequests()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const respondRenewal = async (renewalId, accept, comment) => {
    setSavingId(renewalId)
    setError(null)
    try {
      await api.patch(`/teacher/renewals/${renewalId}/respond`, { accept, comment: comment || undefined })
      await loadRenewals()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  if (error && (!requests || !proposals || !renewals)) return <Alert>{error}</Alert>
  if (!requests || !proposals || !renewals) return <Spinner />

  const visibleProposals =
    filter === 'all' ? proposals : proposals.filter((p) => p.status === filter)
  const pendingCount = proposals.filter((p) => p.status === 'proposee').length
  const renewalsToHandle = renewals.filter((r) => r.status === 'en_attente_prof').length

  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-bold text-navy">Demandes</h1>
      <p className="mb-5 text-sm text-gray-500">
        Demandes de familles correspondant à tes matières (
        <Link to="/profil" className="text-navy underline">
          modifier mes matières
        </Link>
        ) et propositions qui t'ont été faites.
      </p>

      <div className="mb-5 flex gap-2 border-b border-gray-200">
        {[
          { key: 'demandes', label: 'Demandes', count: requests.length, icon: Sparkles },
          { key: 'propositions', label: 'Mes propositions', count: pendingCount, icon: Send },
          { key: 'renouvellements', label: 'Renouvellements', count: renewalsToHandle, icon: RefreshCw },
        ].map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === key
                ? 'border-navy text-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span className="rounded-full bg-gold-400/30 px-1.5 text-xs text-navy">{count}</span>
            )}
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}

      {tab === 'demandes' &&
        (requests.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Sparkles}
              title="Aucune demande pour l'instant"
              description="Aucune demande ouverte ne correspond actuellement à tes matières."
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                saving={savingId === request.id}
                onReact={react}
              />
            ))}
          </div>
        ))}

      {tab === 'renouvellements' &&
        (renewals.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={RefreshCw}
              title="Aucun renouvellement"
              description="Quand une famille souhaite poursuivre l'accompagnement, sa demande apparaît ici."
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {renewals.map((renewal) => (
              <RenewalCard
                key={renewal.id}
                renewal={renewal}
                saving={savingId === renewal.id}
                onRespond={respondRenewal}
              />
            ))}
          </div>
        ))}

      {tab === 'propositions' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {PROPOSAL_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  filter === key
                    ? 'border-navy bg-navy text-white'
                    : 'border-gray-200 text-gray-600 hover:border-navy/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {visibleProposals.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Send}
                title="Aucune proposition"
                description="Les propositions faites par l'équipe Nafoore et leur suite (acceptée ou rejetée avec motif) apparaîtront ici."
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
