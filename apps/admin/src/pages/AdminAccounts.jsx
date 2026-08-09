import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { api } from '../lib/api'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ROLE_LABELS, ROLE_OPTIONS } from '../config/roles'

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function AdminAccounts() {
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ email: '', name: '', roles: [] })
  const [submitting, setSubmitting] = useState(false)

  const load = () => api.get('/admin-accounts').then(setAccounts)

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const visibleAccounts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return accounts
    return accounts.filter(
      (account) =>
        account.name.toLowerCase().includes(term) ||
        account.email.toLowerCase().includes(term),
    )
  }, [accounts, search])

  const toggleFormRole = (role) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/admin-accounts', form)
      setForm({ email: '', name: '', roles: [] })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleRole = async (account, role) => {
    const nextRoles = account.roles.includes(role)
      ? account.roles.filter((r) => r !== role)
      : [...account.roles, role]
    if (nextRoles.length === 0) return
    try {
      await api.patch(`/admin-accounts/${account.id}/roles`, { roles: nextRoles })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleActive = async (account) => {
    try {
      await api.patch(`/admin-accounts/${account.id}/active`, {
        isActive: !account.isActive,
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Comptes admin</h1>
        <span className="text-sm text-gray-400">{accounts.length}</span>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="mb-6 p-6">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rôles</label>
            <div className="flex gap-3 py-2">
              {ROLE_OPTIONS.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.roles.includes(role)}
                    onChange={() => toggleFormRole(role)}
                    className="rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" icon={Plus} disabled={submitting || form.roles.length === 0}>
            Inviter
          </Button>
        </form>
      </Card>

      <div className="mb-4">
        <div className="relative w-64">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un compte"
            className={`${inputClass} w-full py-2 pl-9`}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {visibleAccounts.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucun compte" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Compte</th>
                <th className="px-4 py-3 font-medium">Rôles</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={account.name} />
                      <div>
                        <div className="font-medium text-gray-900">{account.name}</div>
                        <div className="text-gray-500">{account.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-1 text-xs text-gray-600"
                        >
                          <input
                            type="checkbox"
                            checked={account.roles.includes(role)}
                            onChange={() => toggleRole(account, role)}
                            className="rounded border-gray-300 text-navy focus:ring-navy"
                          />
                          {ROLE_LABELS[role]}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={account.isActive ? 'green' : 'red'}>
                      {account.isActive ? 'Actif' : 'Suspendu'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      icon={account.isActive ? UserX : UserCheck}
                      onClick={() => toggleActive(account)}
                      className="px-2 py-1"
                    >
                      {account.isActive ? 'Suspendre' : 'Réactiver'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
