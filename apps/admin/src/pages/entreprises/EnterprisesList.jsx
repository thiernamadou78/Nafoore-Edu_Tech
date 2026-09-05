import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONES } from './labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_FORM = {
  raisonSociale: '',
  siret: '',
  secteurActivite: '',
  emailDomain: '',
  adresseFacturation: '',
}

export function EnterprisesList() {
  const navigate = useNavigate()
  const [enterprises, setEnterprises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    return api.get(`/enterprises${params}`).then(setEnterprises)
  }

  useEffect(() => {
    setLoading(true)
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleCreate = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/enterprises', form)
      setForm(EMPTY_FORM)
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Entreprises</h1>
          <span className="text-sm text-gray-400">{enterprises.length}</span>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Nouvelle entreprise
        </Button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise"
          className={`${inputClass} max-w-xs`}
        />
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : enterprises.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aucune entreprise"
            description="Les entreprises du Pass Éducatif apparaîtront ici."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Raison sociale</th>
                <th className="px-4 py-3 font-medium">Secteur</th>
                <th className="px-4 py-3 font-medium">Contrat actif</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enterprises.map((enterprise) => (
                <tr
                  key={enterprise.id}
                  onClick={() => navigate(`/entreprises/${enterprise.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {enterprise.raisonSociale}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{enterprise.secteurActivite ?? '—'}</td>
                  <td className="px-4 py-3">
                    {enterprise.activeContract ? (
                      <Badge tone={CONTRACT_STATUS_TONES[enterprise.activeContract.statut]}>
                        {CONTRACT_STATUS_LABELS[enterprise.activeContract.statut] ??
                          enterprise.activeContract.statut}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">Aucun contrat</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={16} className="text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle entreprise">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom de l'entreprise (raison sociale)
            </label>
            <input
              required
              placeholder="Acme Corp"
              value={form.raisonSociale}
              onChange={(e) => setForm((f) => ({ ...f, raisonSociale: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SIRET</label>
            <input
              value={form.siret}
              onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Secteur d'activité
            </label>
            <input
              value={form.secteurActivite}
              onChange={(e) => setForm((f) => ({ ...f, secteurActivite: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Domaine email (affiliation)
            </label>
            <input
              placeholder="acme.com"
              value={form.emailDomain}
              onChange={(e) => setForm((f) => ({ ...f, emailDomain: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Adresse de facturation <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <p className="mb-1 text-xs text-gray-500">
              Adresse postale à laquelle seront envoyées les factures de cette entreprise (utile
              plus tard pour la facturation).
            </p>
            <input
              value={form.adresseFacturation}
              onChange={(e) => setForm((f) => ({ ...f, adresseFacturation: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
