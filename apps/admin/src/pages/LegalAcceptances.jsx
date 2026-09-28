import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCheck2, Search } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/Table'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const STATUS = {
  accepted: { label: 'Acceptée', tone: 'green' },
  outdated: { label: 'Ancienne version', tone: 'amber' },
  pending: { label: 'À accepter', tone: 'gray' },
}

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'À accepter' },
  { value: 'accepted', label: 'À jour' },
]

function StatusCell({ acceptance }) {
  const status = STATUS[acceptance.status]
  return (
    <div>
      <Badge tone={status.tone}>{status.label}</Badge>
      {acceptance.acceptedAt && (
        <p className="mt-0.5 text-xs text-gray-400">
          le {formatDateTime(acceptance.acceptedAt)}
          {acceptance.status === 'outdated' && ` (v. ${acceptance.version})`}
        </p>
      )}
    </div>
  )
}

// Un compte est "a jour" si tous ses documents (CGU, et charte pour les
// enseignants) sont acceptes dans leur version en vigueur.
const isUpToDate = (row) => row.terms.status === 'accepted' && (!row.charter || row.charter.status === 'accepted')

function StatCard({ label, done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">
        {done}
        <span className="text-base font-normal text-gray-400"> / {total}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
    </Card>
  )
}

// Super Admin : qui a accepte les CGU (familles, enseignants) et la charte
// de confidentialite (enseignants), dans quelle version et quand.
export function LegalAcceptances() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('teachers')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api
      .get('/admin/legal-acceptances')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    return data[tab].filter((row) => {
      if (filter === 'pending' && isUpToDate(row)) return false
      if (filter === 'accepted' && !isUpToDate(row)) return false
      return !term || [row.name, row.email].some((v) => v?.toLowerCase().includes(term))
    })
  }, [data, tab, filter, search])

  const teachersDone = data ? data.teachers.filter(isUpToDate).length : 0
  const familiesDone = data ? data.families.filter(isUpToDate).length : 0

  return (
    <div className="max-w-5xl">
      <div className="mb-2 flex items-center gap-2">
        <FileCheck2 size={20} className="text-navy" />
        <h1 className="text-xl font-semibold text-gray-900">CGU et charte de confidentialité</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Acceptations enregistrées à la première connexion (puis à chaque nouvelle version). Un compte qui
        n’a pas encore accepté y est invité automatiquement à sa prochaine connexion.
        {data && ` Versions en vigueur : CGU du ${data.termsVersion}, charte du ${data.charterVersion}.`}
      </p>

      {error && <Alert>{error}</Alert>}

      {data && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <StatCard label="Enseignants à jour (CGU + charte)" done={teachersDone} total={data.teachers.length} />
            <StatCard label="Familles à jour (CGU)" done={familiesDone} total={data.families.length} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
              {[
                ['teachers', `Enseignants (${data.teachers.length})`],
                ['families', `Familles (${data.families.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                    tab === key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputClass} w-auto`}>
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <div className="relative w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom ou email"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            {rows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Aucun compte.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>{tab === 'teachers' ? 'Enseignant' : 'Famille'}</Th>
                    <Th>CGU</Th>
                    {tab === 'teachers' && <Th>Charte de confidentialité</Th>}
                    <Th>Connexion</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((row) => {
                    const href =
                      tab === 'teachers'
                        ? row.teacherId && `/enseignants/${row.teacherId}`
                        : row.leadId && `/leads/${row.leadId}`
                    return (
                      <Tr key={row.id}>
                        <Td>
                          {href ? (
                            <Link to={href} className="font-medium text-navy hover:underline">
                              {row.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{row.name}</span>
                          )}
                          <p className="text-xs text-gray-500">{row.email}</p>
                        </Td>
                        <Td>
                          <StatusCell acceptance={row.terms} />
                        </Td>
                        {tab === 'teachers' && (
                          <Td>
                            <StatusCell acceptance={row.charter} />
                          </Td>
                        )}
                        <Td>
                          {row.neverLoggedIn ? (
                            <span className="text-xs text-amber-700">Jamais connecté</span>
                          ) : (
                            <span className="text-xs text-gray-500">Déjà connecté</span>
                          )}
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
