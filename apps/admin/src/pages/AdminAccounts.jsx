import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Mail, MapPin, Pencil, Plus, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { ROLE_LABELS } from '../config/roles'
import { ADMIN_MODULES } from '../config/permissions'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_FORM = {
  email: '',
  name: '',
  role: 'admin',
  permissions: [],
  zoneAddress: '',
  zoneRadiusKm: 30,
}

function accountToForm(account) {
  return {
    email: account.email,
    name: account.name,
    role: account.role,
    permissions: account.permissions ?? [],
    zoneAddress: account.zoneAddress ?? '',
    zoneRadiusKm: account.zoneRadiusKm ?? 30,
  }
}

function permissionSummary(account) {
  if (account.role === 'super_admin') return 'Tous les droits'
  const modules = ADMIN_MODULES.filter((m) => account.permissions?.includes(`${m.key}:view`))
  if (modules.length === 0) return 'Aucun droit'
  return modules
    .map((m) => (account.permissions.includes(`${m.key}:edit`) ? m.label : `${m.label} (lecture)`))
    .join(', ')
}

function PermissionsGrid({ permissions, onChange }) {
  const has = (key, level) => permissions.includes(`${key}:${level}`)

  const toggle = (key, level) => {
    const next = new Set(permissions)
    if (has(key, level)) {
      next.delete(`${key}:${level}`)
      // Sans consultation, pas de modification possible.
      if (level === 'view') next.delete(`${key}:edit`)
    } else {
      next.add(`${key}:${level}`)
      if (level === 'edit') next.add(`${key}:view`)
    }
    onChange([...next])
  }

  const setAll = (levels) =>
    onChange(ADMIN_MODULES.flatMap((m) => levels.map((level) => `${m.key}:${level}`)))

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">Droits</span>
        <div className="flex gap-3 text-xs">
          <button type="button" onClick={() => setAll(['view'])} className="text-navy hover:underline">
            Tout en consultation
          </button>
          <button type="button" onClick={() => setAll(['view', 'edit'])} className="text-navy hover:underline">
            Tout cocher
          </button>
          <button type="button" onClick={() => onChange([])} className="text-gray-500 hover:underline">
            Tout décocher
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Rubrique</th>
              <th className="w-20 px-3 py-2 text-center font-medium">Voir</th>
              <th className="w-20 px-3 py-2 text-center font-medium">Modifier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ADMIN_MODULES.map((module) => (
              <tr key={module.key}>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900">{module.label}</div>
                  <div className="text-xs text-gray-500">{module.hint}</div>
                </td>
                {['view', 'edit'].map((level) => (
                  <td key={level} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={has(module.key, level)}
                      onChange={() => toggle(module.key, level)}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                      aria-label={`${module.label} — ${level === 'view' ? 'voir' : 'modifier'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ZoneMap({ latitude, longitude, radiusKm }) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180))
  return (
    <div className="h-48 overflow-hidden rounded-lg border border-gray-200">
      <MapContainer
        key={`${latitude}-${longitude}-${radiusKm}`}
        bounds={[
          [latitude - latDelta, longitude - lngDelta],
          [latitude + latDelta, longitude + lngDelta],
        ]}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[latitude, longitude]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#1E3A8A', fillColor: '#EAB308', fillOpacity: 0.15 }}
        />
      </MapContainer>
    </div>
  )
}

function AccountForm({ account, onSaved, onCancel }) {
  const isEdit = Boolean(account)
  const [form, setForm] = useState(() => (account ? accountToForm(account) : EMPTY_FORM))
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    if (form.role === 'admin' && form.permissions.length === 0) {
      setError('Cochez au moins un droit pour ce compte.')
      return
    }
    setSaving(true)
    const hasZone = form.role === 'admin' && form.zoneAddress.trim()
    const body = {
      name: form.name,
      role: form.role,
      permissions: form.role === 'admin' ? form.permissions : [],
      zoneAddress: hasZone ? form.zoneAddress.trim() : null,
      zoneRadiusKm: hasZone ? Number(form.zoneRadiusKm) || null : null,
    }
    try {
      const saved = isEdit
        ? await api.patch(`/admin-accounts/${account.id}`, body)
        : await api.post('/admin-accounts', { ...body, email: form.email })
      onSaved(saved, isEdit)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Apercu de la zone enregistree (coordonnees connues cote serveur).
  const showSavedZone =
    isEdit &&
    account.zoneLatitude != null &&
    form.zoneAddress.trim() === (account.zoneAddress ?? '') &&
    Number(form.zoneRadiusKm) === account.zoneRadiusKm

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              disabled={isEdit}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Type de compte</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: 'admin', hint: 'Droits cochés ci-dessous, limité à sa zone' },
              { value: 'super_admin', hint: 'Tous les droits, toutes les zones, gère les comptes' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  form.role === option.value ? 'border-navy bg-navy/5' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  checked={form.role === option.value}
                  onChange={() => set('role', option.value)}
                  className="mt-0.5 text-navy focus:ring-navy"
                />
                <span>
                  <span className="block font-medium text-gray-900">{ROLE_LABELS[option.value]}</span>
                  <span className="block text-xs text-gray-500">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {form.role === 'admin' && (
          <>
            <PermissionsGrid
              permissions={form.permissions}
              onChange={(permissions) => set('permissions', permissions)}
            />

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Zone</span>
              <p className="mb-2 text-xs text-gray-500">
                Le délégué ne verra que les élèves, enseignants, leads et candidatures situés dans ce
                cercle. Laisser l'adresse vide donne accès à toutes les zones.
              </p>
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <input
                  value={form.zoneAddress}
                  onChange={(e) => set('zoneAddress', e.target.value)}
                  placeholder="Ex. 12 rue de la République, Lyon — ou Dakar, Sénégal"
                  className={inputClass}
                />
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={form.zoneRadiusKm}
                    onChange={(e) => set('zoneRadiusKm', e.target.value)}
                    disabled={!form.zoneAddress.trim()}
                    className={`${inputClass} pr-10 disabled:bg-gray-50`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    km
                  </span>
                </div>
              </div>
              {showSavedZone && (
                <div className="mt-3">
                  <ZoneMap
                    latitude={account.zoneLatitude}
                    longitude={account.zoneLongitude}
                    radiusKm={account.zoneRadiusKm}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          {isEdit ? 'Enregistrer' : 'Créer et inviter'}
        </Button>
      </div>
    </form>
  )
}

export function AdminAccounts() {
  const { adminAccount: me } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | compte
  const [pendingId, setPendingId] = useState(null)

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
        account.email.toLowerCase().includes(term) ||
        (account.zoneAddress ?? '').toLowerCase().includes(term),
    )
  }, [accounts, search])

  const handleSaved = async (saved, isEdit) => {
    setEditing(null)
    setError(null)
    setNotice(isEdit ? `Compte de ${saved.name} mis à jour.` : `Invitation envoyée à ${saved.email}.`)
    await load().catch((err) => setError(err.message))
  }

  const resendInvitation = async (account) => {
    if (!window.confirm(`Renvoyer un lien d'accès à ${account.email} ?`)) return
    setPendingId(account.id)
    setError(null)
    setNotice(null)
    try {
      await api.post(`/admin-accounts/${account.id}/resend-invitation`, {})
      setNotice(`Nouveau lien d'accès envoyé à ${account.email}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingId(null)
    }
  }

  const toggleActive = async (account) => {
    if (
      account.isActive &&
      !window.confirm(`Suspendre le compte de ${account.name} ? Il ne pourra plus se connecter.`)
    ) {
      return
    }
    setPendingId(account.id)
    setError(null)
    setNotice(null)
    try {
      await api.patch(`/admin-accounts/${account.id}/active`, {
        isActive: !account.isActive,
      })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Comptes admin</h1>
          <span className="text-sm text-gray-400">{accounts.length}</span>
        </div>
        <Button icon={Plus} onClick={() => setEditing('new')}>
          Nouveau compte
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className="mb-4">
        <div className="relative w-72">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un compte ou une zone"
            className={`${inputClass} py-2 pl-9`}
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
                <th className="px-4 py-3 font-medium">Droits</th>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleAccounts.map((account) => (
                <tr key={account.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={account.name} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {account.name}
                          {account.id === me?.id && (
                            <span className="ml-1 text-xs font-normal text-gray-400">(vous)</span>
                          )}
                        </div>
                        <div className="text-gray-500">{account.email}</div>
                        <Badge tone={account.role === 'super_admin' ? 'gold' : 'blue'} className="mt-1">
                          {ROLE_LABELS[account.role]}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-gray-600">{permissionSummary(account)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {account.role === 'super_admin' || !account.zoneAddress ? (
                      <span className="text-gray-400">Toutes zones</span>
                    ) : (
                      <span className="inline-flex items-start gap-1">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-navy" />
                        <span>
                          {account.zoneAddress}
                          <span className="block text-xs text-gray-400">
                            rayon {account.zoneRadiusKm} km
                          </span>
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={account.isActive ? 'green' : 'red'}>
                      {account.isActive ? 'Actif' : 'Suspendu'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        icon={Pencil}
                        onClick={() => setEditing(account)}
                        className="px-2 py-1"
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        icon={Mail}
                        disabled={pendingId === account.id || !account.isActive}
                        onClick={() => resendInvitation(account)}
                        className="px-2 py-1"
                        title="Renvoyer un lien pour choisir le mot de passe"
                      >
                        Renvoyer l'invitation
                      </Button>
                      {account.id !== me?.id && (
                        <Button
                          variant="ghost"
                          icon={account.isActive ? UserX : UserCheck}
                          loading={pendingId === account.id}
                          onClick={() => toggleActive(account)}
                          className="px-2 py-1"
                        >
                          {account.isActive ? 'Suspendre' : 'Réactiver'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nouveau compte admin' : `Modifier — ${editing?.name ?? ''}`}
        size="lg"
      >
        {editing !== null && (
          <AccountForm
            key={editing === 'new' ? 'new' : editing.id}
            account={editing === 'new' ? null : editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
