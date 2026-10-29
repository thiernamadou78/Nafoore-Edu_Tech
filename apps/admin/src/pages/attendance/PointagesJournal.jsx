import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Download, RadioTower, ShieldAlert, X } from 'lucide-react'
import { formatDateTime } from '../../lib/format'
import { api } from '../../lib/api'
import { SessionReport } from '../../components/SessionReport'
import { CorrectAction, RemindButton } from './AttendanceActions'
import { usePagination } from '../../lib/usePagination'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PaginationControls } from '../../components/ui/PaginationControls'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'

// Periodes proposees : mois civils (vue mensuelle demandee par Nafoore),
// periodes glissantes et intervalle libre.
export const PERIODS = [
  { key: 'month', label: 'Ce mois' },
  { key: 'lastMonth', label: 'Mois dernier' },
  { key: 1, label: '24 h' },
  { key: 3, label: '3 jours' },
  { key: 7, label: '7 jours' },
  { key: 90, label: '3 mois' },
  { key: 'range', label: 'Intervalle' },
]

const PERIOD_KEY = 'nafoore.pointages.period'
const RANGE_KEY = 'nafoore.pointages.range'
const VIEW_KEY = 'nafoore.pointages.view'

// Date au format AAAA-MM-JJ (heure locale), pour <input type="date">.
export const isoDay = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dayLabel = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const monthLabel = (date) => date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

function read(key, fallback, isValid) {
  try {
    const raw = localStorage.getItem(key)
    const value = raw === null ? fallback : JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // stockage indisponible : le choix n'est simplement pas memorise
  }
}

export const readPeriod = () => read(PERIOD_KEY, 'month', (v) => PERIODS.some((p) => p.key === v))
export const readRange = () =>
  read(
    RANGE_KEY,
    { from: isoDay(Date.now() - 6 * 86_400_000), to: isoDay(Date.now()) },
    (v) => Boolean(v?.from && v?.to),
  )
export const savePeriod = (value) => store(PERIOD_KEY, value)
export const saveRange = (value) => store(RANGE_KEY, value)

// Bornes de la periode en dates (to exclu).
export function periodBounds(period, range) {
  if (typeof period === 'number') {
    const to = new Date()
    return { from: new Date(to.getTime() - period * 86_400_000), to }
  }
  const query = new URLSearchParams(periodQuery(period, range))
  return { from: new Date(query.get('from')), to: new Date(query.get('to')) }
}

// Bornes de la periode : { from, to } (to exclu) ou { days }.
export function periodQuery(period, range) {
  const now = new Date()
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return `from=${from.toISOString()}&to=${to.toISOString()}`
  }
  if (period === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 1)
    return `from=${from.toISOString()}&to=${to.toISOString()}`
  }
  if (period === 'range') {
    const from = new Date(`${range.from}T00:00:00`)
    const to = new Date(`${range.to}T00:00:00`)
    to.setDate(to.getDate() + 1)
    if (to <= from) throw new Error('La date de fin doit être après la date de début.')
    return `from=${from.toISOString()}&to=${to.toISOString()}`
  }
  return `days=${period}`
}

function periodText(period, range) {
  const now = new Date()
  if (period === 'month') return monthLabel(now)
  if (period === 'lastMonth') return monthLabel(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  if (period === 'range') return `du ${dayLabel(range.from)} au ${dayLabel(range.to)}`
  return PERIODS.find((p) => p.key === period)?.label ?? ''
}

// Duree lisible : 93 -> "1 h 33 min", 45 -> "45 min", 120 -> "2 h".
export function formatHours(minutes) {
  const total = Math.round(Math.abs(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`
}

const METHOD_LABELS = { qr_scan: 'Scan QR', manuel: 'Manuel (prof)', admin: 'Saisi par l’équipe' }
const MANUAL_REASONS = { qr_oublie: 'QR oublié', probleme_technique: 'Problème technique', autre: 'Autre' }
const CORRECTION_LABELS = {
  cloture: 'Départ pointé par l’équipe',
  correction: 'Heures corrigées',
  saisie: 'Pointage saisi par l’équipe',
  non_donnee: 'Marquée non donnée',
}
const REFUSED_LABELS = {
  pass_revoked: 'Pass suspendu ou inconnu',
  funding_expired: 'Financement expiré',
  no_session_found: 'Aucune séance à cet horaire',
}
// Au-dela, l'arrivee compte comme un retard (meme seuil que le serveur).
const LATE_MINUTES = 15

const timeOf = (date) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const minutesOf = (item) =>
  item.checkoutAt && item.checkinAt
    ? Math.max(0, Math.round((new Date(item.checkoutAt) - new Date(item.checkinAt)) / 60000))
    : 0

// Totaux d'un ensemble de pointages.
function totals(items) {
  const closed = items.filter((i) => i.checkoutAt)
  return {
    count: items.length,
    minutes: closed.reduce((sum, i) => sum + minutesOf(i), 0),
    open: items.length - closed.length,
    missingReports: closed.filter((i) => !i.hasReport).length,
    qrShare: items.length ? Math.round((items.filter((i) => i.method === 'qr_scan').length / items.length) * 100) : null,
    students: new Set(items.map((i) => i.student.id)).size,
  }
}

// Regroupe les pointages par enseignant ou par famille, tries par heures.
function groupBy(items, kind) {
  const map = new Map()
  for (const item of items) {
    const owner =
      kind === 'enseignants'
        ? { id: item.teacher.id, name: item.teacher.name, link: `/enseignants/${item.teacher.id}` }
        : item.family
          ? { id: item.family.id, name: item.family.name, link: `/leads/${item.family.id}` }
          : { id: 'none', name: 'Sans famille rattachée', link: null }
    if (!map.has(owner.id)) map.set(owner.id, { ...owner, items: [] })
    map.get(owner.id).items.push(item)
  }
  return [...map.values()]
    .map((group) => ({ ...group, ...totals(group.items) }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'fr'))
}

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const segButton = (active) =>
  `rounded-full px-3 py-1.5 font-medium transition-colors ${
    active ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
  }`

function GroupTable({ groups, kind, onOpen }) {
  if (groups.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">Aucun pointage sur cette période.</p>
  }
  return (
    <Table>
      <Thead>
        <Th>{kind === 'enseignants' ? 'Enseignant' : 'Famille'}</Th>
        <Th className="text-right">{kind === 'enseignants' ? 'Élèves' : 'Enfants'}</Th>
        <Th className="text-right">Séances</Th>
        <Th className="text-right">Heures</Th>
        <Th className="text-right">En cours</Th>
        <Th className="text-right">CR à rédiger</Th>
        <Th className="text-right">Scan QR</Th>
        <Th />
      </Thead>
      <Tbody>
        {groups.map((group) => (
          <Tr key={group.id} onClick={() => onOpen(group)} className="cursor-pointer">
            <Td>
              <span className="font-medium text-gray-900">{group.name}</span>
            </Td>
            <Td className="text-right tabular-nums">{group.students}</Td>
            <Td className="text-right tabular-nums">{group.count}</Td>
            <Td className="text-right font-semibold tabular-nums text-navy">{formatHours(group.minutes)}</Td>
            <Td className="text-right tabular-nums">
              {group.open > 0 ? <Badge tone="amber">{group.open}</Badge> : <span className="text-gray-300">0</span>}
            </Td>
            <Td className="text-right tabular-nums">
              {group.missingReports > 0 ? (
                <Badge tone="amber">{group.missingReports}</Badge>
              ) : (
                <span className="text-gray-300">0</span>
              )}
            </Td>
            <Td className="text-right tabular-nums text-gray-500">{group.qrShare ?? '—'} %</Td>
            <Td className="text-right">
              <ChevronRight size={16} className="inline text-gray-300" />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}

function PointageRow({ item, canEdit, onChanged }) {
  const [showReport, setShowReport] = useState(false)
  const minutes = minutesOf(item)
  const late = item.lateMinutes !== null && item.lateMinutes > LATE_MINUTES
  const short = item.checkoutAt && item.gapMinutes !== null && item.gapMinutes <= -LATE_MINUTES
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/eleves/${item.student.id}`} className="font-medium text-navy hover:underline">
            {item.student.name}
          </Link>
          {item.family && <span className="text-xs text-gray-400"> · famille {item.family.name}</span>}
          <p className="text-xs text-gray-500">
            {item.teacher.name}
            {item.subject ? ` · ${item.subject}` : ''} — prévue {item.scheduledDate ? formatDateTime(item.scheduledDate) : ''}
            {item.plannedMinutes ? ` (${formatHours(item.plannedMinutes)})` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">
            {timeOf(item.checkinAt)} → {item.checkoutAt ? timeOf(item.checkoutAt) : 'en cours'}
            {minutes > 0 ? ` (${formatHours(minutes)})` : ''}
          </Badge>
          {late && <Badge tone="red">Retard {formatHours(item.lateMinutes)}</Badge>}
          {short && <Badge tone="amber">{formatHours(item.gapMinutes)} de moins que prévu</Badge>}
          <Badge tone="gray">{METHOD_LABELS[item.method] ?? item.method}</Badge>
          {item.checkoutAt && (
            <Badge tone={item.hasReport ? 'green' : 'amber'}>
              {item.hasReport ? 'Compte-rendu rédigé' : 'Compte-rendu à rédiger'}
            </Badge>
          )}
        </div>
      </div>

      {(item.manualReason || item.earlyEndReason) && (
        <p className="mt-1 text-xs text-gray-500">
          {item.manualReason && <>Pointage manuel : {MANUAL_REASONS[item.manualReason] ?? item.manualReason}. </>}
          {item.earlyEndReason && <>Fin anticipée : « {item.earlyEndReason} »</>}
        </p>
      )}
      {item.corrections?.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
          {item.corrections.map((c) => (
            <li key={c.id}>
              {CORRECTION_LABELS[c.action] ?? c.action} par {c.adminName ?? 'l’équipe'} le {formatDateTime(c.createdAt)}
              {c.previousCheckinAt && c.action === 'correction'
                ? ` (avant : ${timeOf(c.previousCheckinAt)} → ${c.previousCheckoutAt ? timeOf(c.previousCheckoutAt) : '—'})`
                : ''}
              {' '}: « {c.reason} »
            </li>
          ))}
        </ul>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {item.hasReport && item.report && (
          <button
            type="button"
            onClick={() => setShowReport((v) => !v)}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-navy hover:underline"
          >
            {showReport ? 'Masquer le compte-rendu' : 'Voir le compte-rendu'}
            <ChevronDown size={13} className={`transition-transform ${showReport ? 'rotate-180' : ''}`} />
          </button>
        )}
        {canEdit && <CorrectAction item={item} onDone={onChanged} />}
        {canEdit && item.checkoutAt && !item.hasReport && item.sessionId && (
          <RemindButton sessionId={item.sessionId} kind="compte_rendu" />
        )}
      </div>
      {showReport && (
        <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
          <SessionReport session={item.report} />
        </div>
      )}
    </li>
  )
}

function DetailList({ items, canEdit, onChanged }) {
  const page = usePagination(items, 20)
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">Aucun pointage sur cette période.</p>
  }
  return (
    <>
      <ul className="divide-y divide-gray-100">
        {page.visible.map((item) => (
          <PointageRow key={item.id} item={item} canEdit={canEdit} onChanged={onChanged} />
        ))}
      </ul>
      <PaginationControls {...page} onShowMore={page.showMore} onCollapse={page.collapse} className="pt-2" />
    </>
  )
}

// Scans refuses de la periode : pass suspendu, financement expire, hors creneau.
function RefusedList({ period, range }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    setRows(null)
    setError(null)
    try {
      const { from, to } = periodBounds(period, range)
      api
        .get(`/admin/attendance/refused?from=${from.toISOString()}&to=${to.toISOString()}`)
        .then((data) => active && setRows(data))
        .catch((err) => active && setError(err.message))
    } catch (err) {
      setError(err.message)
    }
    return () => {
      active = false
    }
  }, [period, range])
  if (error) return <p className="py-4 text-sm text-red-600">{error}</p>
  if (!rows) return <p className="py-4 text-sm text-gray-400">Chargement…</p>
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">Aucun scan refusé sur cette période.</p>
  }
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div>
            <Link to={`/eleves/${row.student.id}`} className="font-medium text-navy hover:underline">
              {row.student.name}
            </Link>
            <p className="text-xs text-gray-500">
              Scanné par {row.teacher.name} le {formatDateTime(row.at)}
            </p>
          </div>
          <Badge tone={row.status === 'no_session_found' ? 'amber' : 'red'}>
            {REFUSED_LABELS[row.status] ?? row.status}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

// Export tableur des pointages filtres (separateur ";" + BOM : ouverture
// directe dans Excel en francais).
function exportCsv(items, label) {
  const header = [
    'Date prévue', 'Enseignant', 'Élève', 'Famille', 'Matière', 'Arrivée', 'Départ',
    'Durée (min)', 'Durée', 'Durée prévue (min)', 'Retard (min)', 'Méthode', 'Compte-rendu',
  ]
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = items.map((i) =>
    [
      i.scheduledDate ? formatDateTime(i.scheduledDate) : '',
      i.teacher.name,
      i.student.name,
      i.family?.name ?? '',
      i.subject ?? '',
      i.checkinAt ? formatDateTime(i.checkinAt) : '',
      i.checkoutAt ? formatDateTime(i.checkoutAt) : 'en cours',
      i.checkoutAt ? minutesOf(i) : '',
      i.checkoutAt ? formatHours(minutesOf(i)) : '',
      i.plannedMinutes ?? '',
      i.lateMinutes !== null && i.lateMinutes > 0 ? i.lateMinutes : 0,
      METHOD_LABELS[i.method] ?? i.method,
      i.hasReport ? 'Rédigé' : 'À rédiger',
    ]
      .map(cell)
      .join(';'),
  )
  const blob = new Blob(['\uFEFF' + [header.map(cell).join(';'), ...lines].join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pointages-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Journal des pointages : vue globale par enseignant ou par famille sur la
// periode (le mois en cours par defaut), filtres, et detail des pointages.
export function PointagesJournal({
  items,
  period,
  onPeriodChange,
  range,
  onRangeChange,
  loading,
  canEdit,
  canExport,
  onChanged,
}) {
  const [view, setView] = useState(() =>
    read(VIEW_KEY, 'enseignants', (v) => ['enseignants', 'familles', 'detail', 'refuses'].includes(v)),
  )
  const [teacherId, setTeacherId] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [studentId, setStudentId] = useState('')

  const changeView = (value) => {
    setView(value)
    store(VIEW_KEY, value)
  }

  // Choix des filtres construits a partir des pointages de la periode.
  const options = useMemo(() => {
    const byId = (list) =>
      [...new Map(list.filter(Boolean).map((x) => [x.id, x])).values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr'),
      )
    return {
      teachers: byId(items.map((i) => i.teacher)),
      families: byId(items.map((i) => i.family)),
      students: byId(items.filter((i) => !familyId || i.family?.id === familyId).map((i) => i.student)),
    }
  }, [items, familyId])

  const filtered = items.filter(
    (i) =>
      (!teacherId || i.teacher.id === teacherId) &&
      (!familyId || i.family?.id === familyId) &&
      (!studentId || i.student.id === studentId),
  )
  const sum = totals(filtered)
  const hasFilter = Boolean(teacherId || familyId || studentId)
  const rangeInvalid = period === 'range' && range.from > range.to

  const openGroup = (group) => {
    if (view === 'enseignants') setTeacherId(group.id)
    else if (group.id !== 'none') setFamilyId(group.id)
    setStudentId('')
    changeView('detail')
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RadioTower size={18} className="text-navy" />
          <h2 className="font-semibold text-gray-900">Pointages</h2>
          <span className="text-sm capitalize text-gray-400">{periodText(period, range)}</span>
        </div>
        <div className="inline-flex flex-wrap rounded-full bg-gray-100 p-1 text-xs" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => onPeriodChange(p.key)}
              className={segButton(period === p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'range' && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg bg-gray-50 p-3 text-sm">
          <div>
            <label htmlFor="range-from" className="mb-1 block text-xs font-medium text-gray-500">
              Du
            </label>
            <input
              id="range-from"
              type="date"
              value={range.from}
              max={isoDay(Date.now())}
              onChange={(e) => e.target.value && onRangeChange({ ...range, from: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label htmlFor="range-to" className="mb-1 block text-xs font-medium text-gray-500">
              Au
            </label>
            <input
              id="range-to"
              type="date"
              value={range.to}
              min={range.from}
              max={isoDay(Date.now())}
              onChange={(e) => e.target.value && onRangeChange({ ...range, to: e.target.value })}
              className={selectClass}
            />
          </div>
          <p className={`pb-2 text-xs ${rangeInvalid ? 'text-red-600' : 'text-gray-400'}`}>
            {rangeInvalid ? 'La date de fin doit être après la date de début.' : 'Bornes incluses, 1 an maximum.'}
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="Enseignant"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className={selectClass}
        >
          <option value="">Tous les enseignants</option>
          {options.teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Famille"
          value={familyId}
          onChange={(e) => {
            setFamilyId(e.target.value)
            setStudentId('')
          }}
          className={selectClass}
        >
          <option value="">Toutes les familles</option>
          {options.families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Élève"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={selectClass}
        >
          <option value="">Tous les élèves</option>
          {options.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setTeacherId('')
              setFamilyId('')
              setStudentId('')
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
          >
            <X size={12} />
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Resume */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-navy/5 px-3 py-1 font-medium text-navy">
          {sum.count} pointage{sum.count > 1 ? 's' : ''}
        </span>
        <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
          {formatHours(sum.minutes)} pointées
        </span>
        {sum.open > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{sum.open} en cours</span>}
        {sum.missingReports > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
            {sum.missingReports} compte{sum.missingReports > 1 ? 's' : ''}-rendu{sum.missingReports > 1 ? 's' : ''} à rédiger
          </span>
        )}
        {sum.qrShare !== null && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{sum.qrShare} % par scan QR</span>
        )}
        {loading && <span className="px-1 py-1 text-gray-400">Chargement…</span>}
      </div>

      {/* Vue */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded-full bg-gray-100 p-1 text-xs" role="group" aria-label="Affichage">
          {[
            ['enseignants', 'Par enseignant'],
            ['familles', 'Par famille'],
            ['detail', 'Détail des pointages'],
            ['refuses', 'Scans refusés'],
          ].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={view === key} onClick={() => changeView(key)} className={segButton(view === key)}>
              {key === 'refuses' && <ShieldAlert size={12} className="mr-1 inline" />}
              {label}
            </button>
          ))}
        </div>
        {canExport && view !== 'refuses' && filtered.length > 0 && (
          <button
            type="button"
            onClick={() => exportCsv(filtered, periodText(period, range))}
            className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
          >
            <Download size={13} />
            Exporter (CSV)
          </button>
        )}
      </div>

      {view === 'refuses' ? (
        <RefusedList period={period} range={range} />
      ) : view === 'detail' ? (
        <DetailList key={`${teacherId}|${familyId}|${studentId}`} items={filtered} canEdit={canEdit} onChanged={onChanged} />
      ) : (
        <>
          <GroupTable groups={groupBy(filtered, view)} kind={view} onOpen={openGroup} />
          <p className="mt-2 text-xs text-gray-400">
            Cliquez sur une ligne pour voir le détail de ses pointages. Les heures comptent les séances terminées
            (arrivée et départ pointés).
          </p>
        </>
      )}
    </Card>
  )
}
