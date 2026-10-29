import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, RadioTower, X } from 'lucide-react'
import { formatDateTime } from '../../lib/format'
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

function formatHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

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

function DetailList({ items }) {
  const page = usePagination(items, 20)
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">Aucun pointage sur cette période.</p>
  }
  return (
    <>
      <ul className="divide-y divide-gray-100">
        {page.visible.map((item) => {
          const minutes = minutesOf(item)
          return (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <Link to={`/eleves/${item.student.id}`} className="font-medium text-navy hover:underline">
                  {item.student.name}
                </Link>
                {item.family && <span className="text-xs text-gray-400"> · famille {item.family.name}</span>}
                <p className="text-xs text-gray-500">
                  {item.teacher.name}
                  {item.subject ? ` · ${item.subject}` : ''} — {item.scheduledDate ? formatDateTime(item.scheduledDate) : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="green">
                  {timeOf(item.checkinAt)} → {item.checkoutAt ? timeOf(item.checkoutAt) : 'en cours'}
                  {minutes > 0 ? ` (${minutes} min)` : ''}
                </Badge>
                <Badge tone="gray">{item.method === 'qr_scan' ? 'Scan QR' : 'Manuel'}</Badge>
                {item.checkoutAt && (
                  <Badge tone={item.hasReport ? 'green' : 'amber'}>
                    {item.hasReport ? 'Compte-rendu rédigé' : 'Compte-rendu à rédiger'}
                  </Badge>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <PaginationControls {...page} onShowMore={page.showMore} onCollapse={page.collapse} className="pt-2" />
    </>
  )
}

// Journal des pointages : vue globale par enseignant ou par famille sur la
// periode (le mois en cours par defaut), filtres, et detail des pointages.
export function PointagesJournal({ items, period, onPeriodChange, range, onRangeChange, loading }) {
  const [view, setView] = useState(() =>
    read(VIEW_KEY, 'enseignants', (v) => ['enseignants', 'familles', 'detail'].includes(v)),
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
      <div className="mb-3 inline-flex rounded-full bg-gray-100 p-1 text-xs" role="group" aria-label="Affichage">
        {[
          ['enseignants', 'Par enseignant'],
          ['familles', 'Par famille'],
          ['detail', 'Détail des pointages'],
        ].map(([key, label]) => (
          <button key={key} type="button" aria-pressed={view === key} onClick={() => changeView(key)} className={segButton(view === key)}>
            {label}
          </button>
        ))}
      </div>

      {view === 'detail' ? (
        <DetailList key={`${teacherId}|${familyId}|${studentId}`} items={filtered} />
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
