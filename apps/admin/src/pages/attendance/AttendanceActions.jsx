import { useState } from 'react'
import { BellRing, CalendarX, Check, Pencil, UserCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

// Valeur pour <input type="datetime-local"> (heure locale).
export function toLocalInput(date) {
  if (!date) return ''
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const linkButton = 'inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline disabled:opacity-50'

function ReasonField({ id, value, onChange, placeholder }) {
  return (
    <div className="min-w-[200px] flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-500">
        Motif (transmis à l’enseignant)
      </label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </div>
  )
}

function TimeField({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  )
}

// Formulaire commun : heures (selon le cas) + motif, envoi, erreur.
function InlineForm({ title, fields, submitLabel, tone = 'primary', onSubmit, onCancel }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSubmit()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <div className="flex flex-wrap items-end gap-2">{fields}</div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant={tone} loading={saving} onClick={submit} className="px-3 py-1.5 text-xs">
          {submitLabel}
        </Button>
        <Button variant="secondary" disabled={saving} onClick={onCancel} className="px-3 py-1.5 text-xs">
          Annuler
        </Button>
      </div>
    </div>
  )
}

// Relance du prof par email (pointage ou compte-rendu manquant).
export function RemindButton({ sessionId, kind }) {
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')
  const send = async () => {
    setState('sending')
    try {
      const result = await api.post(`/admin/attendance/sessions/${sessionId}/remind`, { kind })
      setState('sent')
      setMessage(`Relance envoyée à ${result.email}`)
    } catch (err) {
      setState('error')
      setMessage(err.message)
    }
  }
  if (state === 'sent' || state === 'error') {
    return <span className={`text-xs ${state === 'sent' ? 'text-green-700' : 'text-red-600'}`}>{message}</span>
  }
  return (
    <button type="button" onClick={send} disabled={state === 'sending'} className={linkButton}>
      <BellRing size={12} />
      {state === 'sending' ? 'Envoi…' : kind === 'pointage' ? 'Relancer le prof' : 'Relancer pour le compte-rendu'}
    </button>
  )
}

// Seance restee "en cours" : l'equipe pointe le depart.
export function CloseOpenAction({ logId, scheduledDate, durationMinutes, onDone }) {
  const defaultEnd = scheduledDate
    ? new Date(new Date(scheduledDate).getTime() + (durationMinutes ?? 60) * 60000)
    : new Date()
  const [open, setOpen] = useState(false)
  const [checkoutAt, setCheckoutAt] = useState(toLocalInput(defaultEnd))
  const [reason, setReason] = useState('Départ non pointé par le prof')
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={linkButton}>
        <Check size={12} />
        Clôturer
      </button>
    )
  }
  return (
    <InlineForm
      title="Pointer le départ à la place du prof"
      submitLabel="Clôturer la séance"
      onCancel={() => setOpen(false)}
      onSubmit={async () => {
        await api.post(`/admin/attendance/logs/${logId}/close`, {
          checkoutAt: new Date(checkoutAt).toISOString(),
          reason,
        })
        setOpen(false)
        await onDone()
      }}
      fields={
        <>
          <TimeField id={`close-${logId}`} label="Heure de départ" value={checkoutAt} onChange={setCheckoutAt} />
          <ReasonField id={`close-reason-${logId}`} value={reason} onChange={setReason} />
        </>
      }
    />
  )
}

// Seance jamais pointee : saisir la presence, ou marquer la seance non donnee.
export function NeverPointedActions({ sessionId, scheduledDate, durationMinutes, onDone }) {
  const start = new Date(scheduledDate)
  const end = new Date(start.getTime() + (durationMinutes ?? 60) * 60000)
  const [mode, setMode] = useState(null) // null | 'enter' | 'notHeld'
  const [checkinAt, setCheckinAt] = useState(toLocalInput(start))
  const [checkoutAt, setCheckoutAt] = useState(toLocalInput(end))
  const [reason, setReason] = useState('')

  if (mode === 'enter') {
    return (
      <InlineForm
        title="Pointer la séance à la place du prof"
        submitLabel="Enregistrer le pointage"
        onCancel={() => setMode(null)}
        onSubmit={async () => {
          await api.post(`/admin/attendance/sessions/${sessionId}/enter`, {
            checkinAt: new Date(checkinAt).toISOString(),
            checkoutAt: new Date(checkoutAt).toISOString(),
            reason,
          })
          setMode(null)
          await onDone()
        }}
        fields={
          <>
            <TimeField id={`in-${sessionId}`} label="Arrivée" value={checkinAt} onChange={setCheckinAt} />
            <TimeField id={`out-${sessionId}`} label="Départ" value={checkoutAt} onChange={setCheckoutAt} />
            <ReasonField id={`enter-reason-${sessionId}`} value={reason} onChange={setReason} placeholder="Ex : QR oublié, confirmé par la famille" />
          </>
        }
      />
    )
  }
  if (mode === 'notHeld') {
    return (
      <InlineForm
        title="Marquer la séance non donnée (la famille et le prof sont prévenus)"
        submitLabel="Marquer non donnée"
        tone="danger"
        onCancel={() => setMode(null)}
        onSubmit={async () => {
          await api.post(`/admin/attendance/sessions/${sessionId}/not-held`, { reason })
          setMode(null)
          await onDone()
        }}
        fields={<ReasonField id={`nh-reason-${sessionId}`} value={reason} onChange={setReason} placeholder="Ex : prof absent, élève malade" />}
      />
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => setMode('enter')} className={linkButton}>
        <UserCheck size={12} />
        Pointer pour le prof
      </button>
      <button type="button" onClick={() => setMode('notHeld')} className={`${linkButton} text-red-600`}>
        <CalendarX size={12} />
        Non donnée
      </button>
      <RemindButton sessionId={sessionId} kind="pointage" />
    </span>
  )
}

// Correction des heures d'un pointage (tracee, prof prevenu).
export function CorrectAction({ item, onDone }) {
  const [open, setOpen] = useState(false)
  const [checkinAt, setCheckinAt] = useState(toLocalInput(item.checkinAt))
  const [checkoutAt, setCheckoutAt] = useState(toLocalInput(item.checkoutAt))
  const [reason, setReason] = useState('')
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={linkButton}>
        <Pencil size={12} />
        Corriger
      </button>
    )
  }
  return (
    <InlineForm
      title="Corriger les heures du pointage"
      submitLabel="Enregistrer la correction"
      onCancel={() => setOpen(false)}
      onSubmit={async () => {
        await api.patch(`/admin/attendance/logs/${item.id}`, {
          checkinAt: new Date(checkinAt).toISOString(),
          checkoutAt: checkoutAt ? new Date(checkoutAt).toISOString() : undefined,
          reason,
        })
        setOpen(false)
        await onDone()
      }}
      fields={
        <>
          <TimeField id={`c-in-${item.id}`} label="Arrivée" value={checkinAt} onChange={setCheckinAt} />
          <TimeField id={`c-out-${item.id}`} label="Départ" value={checkoutAt} onChange={setCheckoutAt} />
          <ReasonField id={`c-reason-${item.id}`} value={reason} onChange={setReason} placeholder="Ex : scan de départ fait en retard" />
        </>
      }
    />
  )
}
