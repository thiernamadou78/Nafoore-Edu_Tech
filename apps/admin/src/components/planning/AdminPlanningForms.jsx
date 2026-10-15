import { useState } from 'react'
import { AlertTriangle, CalendarClock, CalendarPlus, Plus, Repeat, Trash2, X } from 'lucide-react'
import { api, availabilityWarnings } from '../../lib/api'
import { Button } from '../ui/Button'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2h' },
]

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

const pad = (n) => String(n).padStart(2, '0')
// Valeur d'un <input type="datetime-local"> (heure locale).
export function toLocalInput(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Une seance peut etre decalee ou annulee tant qu'elle n'a pas commence.
export function isChangeable(session) {
  const started = session.checkinAt || session.attendanceLogs?.[0]?.checkinAt
  if (started) return false
  if (session.status === 'reportee') return true
  return ['planifiee', 'confirmee'].includes(session.status) && new Date(session.date) > new Date()
}

// Libelle d'une affectation : "Eleve · Matiere · Enseignant".
export const assignmentLabel = (a, withStudent = true) =>
  [withStudent ? a.student.name : null, a.subject, a.teacher.name].filter(Boolean).join(' · ')

// Bandeau "hors disponibilites" : l'admin peut confirmer en connaissance de cause.
function AvailabilityWarning({ warnings, onConfirm, saving }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <AlertTriangle size={14} />
        Créneau hors des disponibilités déclarées
      </p>
      <ul className="mb-2 list-disc pl-5">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <Button variant="secondary" loading={saving} onClick={onConfirm} className="px-3 py-1.5 text-xs">
        Planifier quand même
      </Button>
    </div>
  )
}

// Appel avec gestion de l'alerte de disponibilite : 1er envoi sans
// confirmation ; si le serveur avertit, on affiche l'alerte et on renvoie
// avec confirmOutOfAvailability apres accord de l'admin.
function useGuardedSubmit(request, onDone) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState(null)
  const submit = async (confirm = false) => {
    setSaving(true)
    setError(null)
    try {
      await request(confirm)
      setWarnings(null)
      await onDone()
    } catch (err) {
      const w = availabilityWarnings(err)
      if (w) setWarnings(w)
      else setError(err.message)
    } finally {
      setSaving(false)
    }
  }
  return { saving, error, warnings, submit }
}

// --------------------------------------------------------- seance ponctuelle

export function SessionCreateForm({ assignments, defaultDate, showStudent = true, onCreated, onCancel }) {
  const [assignmentId, setAssignmentId] = useState(assignments.length === 1 ? assignments[0].id : '')
  const [date, setDate] = useState(() => {
    const d = defaultDate ? new Date(defaultDate) : new Date()
    d.setHours(17, 0, 0, 0)
    return toLocalInput(d)
  })
  const [durationMinutes, setDurationMinutes] = useState(60)
  const assignment = assignments.find((a) => a.id === assignmentId)

  const { saving, error, warnings, submit } = useGuardedSubmit(
    (confirm) =>
      api.post(`/students/${assignment.student.id}/sessions`, {
        date: new Date(date).toISOString(),
        teacherId: assignment.teacher.id,
        subject: assignment.subject,
        durationMinutes,
        confirmOutOfAvailability: confirm || undefined,
      }),
    onCreated,
  )

  if (assignments.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
        Aucun accompagnement actif : affectez d’abord un enseignant à l’élève (onglet Enseignants de sa fiche).
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-navy/15 bg-navy/[0.03] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-navy">
        <CalendarPlus size={16} />
        Planifier une séance
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="create-assignment">
            {showStudent ? 'Élève · matière · enseignant' : 'Matière · enseignant'}
          </label>
          <select id="create-assignment" value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className={inputClass}>
            <option value="">Choisir…</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {assignmentLabel(a, showStudent)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="create-date">Date et heure</label>
          <input id="create-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="create-duration">Durée</label>
          <select id="create-duration" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputClass}>
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-500">La famille et l’enseignant reçoivent un email de confirmation.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {warnings && <AvailabilityWarning warnings={warnings} saving={saving} onConfirm={() => submit(true)} />}
      <div className="flex gap-2">
        <Button icon={CalendarPlus} loading={saving && !warnings} disabled={!assignment || !date} onClick={() => submit(false)}>
          Planifier
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------- decaler / annuler

export function SessionChangeActions({ session, studentId, onDone }) {
  const [mode, setMode] = useState(null) // null | 'move' | 'cancel'
  const [date, setDate] = useState(() => toLocalInput(session.date))
  const [durationMinutes, setDurationMinutes] = useState(session.durationMinutes ?? 60)
  const [reason, setReason] = useState('')
  const toReplan = session.status === 'reportee'

  const done = async () => {
    setMode(null)
    setReason('')
    await onDone()
  }
  const move = useGuardedSubmit(
    (confirm) =>
      api.post(`/students/${studentId}/sessions/${session.id}/reschedule`, {
        date: new Date(date).toISOString(),
        durationMinutes,
        reason: reason.trim() || undefined,
        confirmOutOfAvailability: confirm || undefined,
      }),
    done,
  )
  const cancel = useGuardedSubmit(
    () => api.post(`/students/${studentId}/sessions/${session.id}/cancel`, { reason: reason.trim() }),
    done,
  )

  if (!isChangeable(session)) return null

  if (!mode) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant={toReplan ? 'primary' : 'secondary'} icon={CalendarClock} onClick={() => setMode('move')} className="px-3 py-1.5 text-xs">
          {toReplan ? 'Choisir un nouveau créneau' : 'Décaler'}
        </Button>
        <Button variant="secondary" icon={X} onClick={() => setMode('cancel')} className="px-3 py-1.5 text-xs">
          Annuler la séance
        </Button>
      </div>
    )
  }

  if (mode === 'cancel') {
    return (
      <div className="mt-2 space-y-2 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs text-gray-600">La famille et l’enseignant seront prévenus par email, avec le motif.</p>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif de l’annulation (obligatoire)" className={`${inputClass} resize-none`} />
        {cancel.error && <p className="text-xs text-red-600">{cancel.error}</p>}
        <div className="flex gap-2">
          <Button variant="danger" loading={cancel.saving} disabled={reason.trim().length < 2} onClick={() => cancel.submit()} className="px-3 py-1.5 text-xs">
            Confirmer l’annulation
          </Button>
          <Button variant="secondary" onClick={() => setMode(null)} className="px-3 py-1.5 text-xs">
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-navy/15 bg-navy/[0.03] p-3">
      {toReplan && session.postponeReason && (
        <p className="text-xs text-amber-800">Demande de la famille : {session.postponeReason}</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} aria-label="Nouvelle date et heure" />
        <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputClass} aria-label="Durée">
          {DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={toReplan ? 'Message (facultatif)' : 'Motif du déplacement (obligatoire, envoyé à la famille et à l’enseignant)'}
        className={`${inputClass} resize-none`}
      />
      {move.error && <p className="text-xs text-red-600">{move.error}</p>}
      {move.warnings && <AvailabilityWarning warnings={move.warnings} saving={move.saving} onConfirm={() => move.submit(true)} />}
      <div className="flex gap-2">
        <Button loading={move.saving && !move.warnings} disabled={!date || (!toReplan && reason.trim().length < 2)} onClick={() => move.submit(false)} className="px-3 py-1.5 text-xs">
          Déplacer la séance
        </Button>
        <Button variant="secondary" onClick={() => setMode(null)} className="px-3 py-1.5 text-xs">
          Retour
        </Button>
      </div>
    </div>
  )
}

// --------------------------------------------------- programme hebdomadaire

export function ScheduleForm({ studentId, assignments, existing, onSaved, onCancel }) {
  const initial = existing
    ? assignments.find((a) => a.teacher.id === existing.teacherId && a.subject === existing.subject)
    : assignments.length === 1
      ? assignments[0]
      : null
  const [assignmentId, setAssignmentId] = useState(initial?.id ?? '')
  const [slots, setSlots] = useState(existing?.slots?.length ? existing.slots : [{ dayOfWeek: 3, time: '17:00' }])
  const [durationMinutes, setDurationMinutes] = useState(existing?.durationMinutes ?? 60)
  const [startsOn, setStartsOn] = useState('')
  const assignment = assignments.find((a) => a.id === assignmentId)

  const { saving, error, warnings, submit } = useGuardedSubmit(
    (confirm) =>
      api.put(`/students/${studentId}/schedules`, {
        teacherId: assignment.teacher.id,
        subject: assignment.subject,
        frequency: slots.length,
        slots,
        durationMinutes,
        startsOn: startsOn ? new Date(`${startsOn}T00:00:00`).toISOString() : undefined,
        confirmOutOfAvailability: confirm || undefined,
      }),
    onSaved,
  )

  const setSlot = (i, patch) => setSlots((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <div className="space-y-3 rounded-xl border border-navy/15 bg-navy/[0.03] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-navy">
        <Repeat size={16} />
        {existing ? 'Modifier le programme' : 'Programme hebdomadaire'}
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="sched-assignment">Matière · enseignant</label>
        <select id="sched-assignment" value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} disabled={Boolean(existing)} className={inputClass}>
          <option value="">Choisir…</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {assignmentLabel(a, false)}
              {a.endsAt ? ` (jusqu’au ${new Date(a.endsAt).toLocaleDateString('fr-FR')})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">Créneaux chaque semaine</p>
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={slot.dayOfWeek} onChange={(e) => setSlot(i, { dayOfWeek: Number(e.target.value) })} className={inputClass} aria-label={`Jour du créneau ${i + 1}`}>
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <input type="time" value={slot.time} onChange={(e) => setSlot(i, { time: e.target.value })} className={`${inputClass} w-32`} aria-label={`Heure du créneau ${i + 1}`} />
            {slots.length > 1 && (
              <button type="button" onClick={() => setSlots((list) => list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" aria-label="Retirer ce créneau">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {slots.length < 5 && (
          <button type="button" onClick={() => setSlots((list) => [...list, { dayOfWeek: 6, time: '10:00' }])} className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline">
            <Plus size={13} />
            Ajouter un créneau
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="sched-duration">Durée d’une séance</label>
          <select id="sched-duration" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputClass}>
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="sched-start">À partir du (facultatif)</label>
          <input id="sched-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Les séances sont créées chaque semaine jusqu’à la fin de l’accompagnement. La famille et l’enseignant sont prévenus par email.
        {existing && ' Les séances à venir non commencées sont recalculées sur les nouveaux créneaux.'}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {warnings && <AvailabilityWarning warnings={warnings} saving={saving} onConfirm={() => submit(true)} />}
      <div className="flex gap-2">
        <Button icon={Repeat} loading={saving && !warnings} disabled={!assignment || slots.some((s) => !s.time)} onClick={() => submit(false)}>
          {existing ? 'Enregistrer le programme' : 'Créer le programme'}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  )
}
