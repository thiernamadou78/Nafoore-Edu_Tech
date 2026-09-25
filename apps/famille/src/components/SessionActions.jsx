import { useState } from 'react'
import { CalendarX, Clock3 } from 'lucide-react'
import { api } from '../lib/api'

const LATE_HOURS = 3

// "Decaler" / "Annuler" une seance a venir cote famille.
// - Decaler : pas de creneau a choisir (la famille appelle generalement
//   l'enseignant avant) ; la seance passe "a replanifier" et l'enseignant
//   choisit la nouvelle date.
// - Annuler : motif obligatoire.
// Dans les deux cas, l'enseignant et Nafoore sont prevenus par email.
export function SessionActions({ session, onChanged }) {
  const [mode, setMode] = useState(null) // null | 'postpone' | 'cancel'
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const start = new Date(session.date)
  const canChange =
    ['planifiee', 'confirmee'].includes(session.status) && start.getTime() > Date.now()
  if (!canChange) return null

  const hoursLeft = (start.getTime() - Date.now()) / 3_600_000
  const late = hoursLeft < LATE_HOURS

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated =
        mode === 'postpone'
          ? await api.post(`/family/sessions/${session.id}/postpone`, { reason: reason.trim() || undefined })
          : await api.post(`/family/sessions/${session.id}/cancel`, { reason: reason.trim() })
      setMode(null)
      setReason('')
      onChanged?.({ ...session, ...updated })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!mode) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('postpone')}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-navy hover:border-navy/40 hover:bg-navy/5"
        >
          <Clock3 size={12} />
          Décaler
        </button>
        <button
          type="button"
          onClick={() => setMode('cancel')}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:border-red-200 hover:bg-red-50"
        >
          <CalendarX size={12} />
          Annuler
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs">
      <p className="font-medium text-gray-800">
        {mode === 'postpone' ? 'Décaler cette séance' : 'Annuler cette séance'}
      </p>
      <p className="text-gray-500">
        {mode === 'postpone'
          ? "L'enseignant choisira un nouveau créneau (pensez à l'appeler pour convenir d'une date). Il sera prévenu par email, ainsi que Nafoore."
          : "L'enseignant et Nafoore seront prévenus par email."}
      </p>
      {late && (
        <p className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
          Moins de {LATE_HOURS} h avant la séance : ce sera signalé comme {mode === 'postpone' ? 'report tardif' : 'annulation tardive'}.
        </p>
      )}
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={mode === 'postpone' ? 'Motif (facultatif)' : "Motif de l'annulation (obligatoire)"}
        className="w-full resize-none rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
      />
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving || (mode === 'cancel' && reason.trim().length < 2)}
          className={`rounded-full px-3 py-1 font-medium text-white disabled:opacity-50 ${
            mode === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-navy hover:bg-navy/90'
          }`}
        >
          {saving ? 'Envoi…' : mode === 'postpone' ? 'Confirmer le report' : "Confirmer l'annulation"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(null)
            setError(null)
          }}
          className="rounded-full px-3 py-1 font-medium text-gray-600 hover:bg-gray-100"
        >
          Retour
        </button>
      </div>
    </div>
  )
}

// Motif / auteur affiches sous une seance decalee ou annulee.
export function SessionChangeNote({ session }) {
  const who = { famille: 'par vous', enseignant: "par l'enseignant", admin: 'par Nafoore' }[session.changedBy] ?? ''
  if (session.status === 'reportee') {
    return (
      <p className="mt-1 text-[11px] text-amber-700">
        À replanifier {who && `(demande ${who})`} — l'enseignant va proposer un nouveau créneau.
        {session.postponeReason && ` Motif : ${session.postponeReason}`}
      </p>
    )
  }
  if (session.rescheduledFrom && session.status !== 'annulee') {
    return (
      <p className="mt-1 text-[11px] text-gray-500">
        Déplacée — initialement le{' '}
        {new Date(session.rescheduledFrom).toLocaleString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    )
  }
  if (session.status === 'annulee' && session.cancellationReason) {
    return (
      <p className="mt-1 text-[11px] text-red-600">
        Annulée {who} — {session.cancellationReason}
      </p>
    )
  }
  return null
}
