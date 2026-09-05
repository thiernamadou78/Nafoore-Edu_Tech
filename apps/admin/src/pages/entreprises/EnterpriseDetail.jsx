import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Upload, UserPlus } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import {
  AMENDMENT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  RH_ROLE_LABELS,
  RH_STATUS_LABELS,
  RH_STATUS_TONES,
  UNITE_CREDIT_LABELS,
} from './labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_CONTRACT_FORM = {
  formulaId: '',
  budgetCreditOverride: '',
  dateDebut: '',
  dateExpiration: '',
  statut: 'brouillon',
}

const EMPTY_RH_FORM = { fullName: '', email: '' }

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '—'
}

function toContractFormValues(contract) {
  return {
    formulaId: contract.formulaId,
    budgetCreditOverride:
      contract.budgetCreditOverride != null ? String(contract.budgetCreditOverride) : '',
    dateDebut: contract.dateDebut.slice(0, 10),
    dateExpiration: contract.dateExpiration.slice(0, 10),
    statut: contract.statut,
  }
}

export function EnterpriseDetail() {
  const { id } = useParams()
  const [enterprise, setEnterprise] = useState(null)
  const [formulas, setFormulas] = useState([])
  const [infoForm, setInfoForm] = useState(null)
  const [error, setError] = useState(null)
  const [savingInfo, setSavingInfo] = useState(false)

  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [editingContractId, setEditingContractId] = useState(null)
  const [contractForm, setContractForm] = useState(EMPTY_CONTRACT_FORM)
  const [savingContract, setSavingContract] = useState(false)

  const [rhModalOpen, setRhModalOpen] = useState(false)
  const [rhForm, setRhForm] = useState(EMPTY_RH_FORM)
  const [savingRh, setSavingRh] = useState(false)

  const load = () =>
    api.get(`/enterprises/${id}`).then((data) => {
      setEnterprise(data)
      setInfoForm({
        raisonSociale: data.raisonSociale,
        siret: data.siret ?? '',
        secteurActivite: data.secteurActivite ?? '',
        emailDomain: data.emailDomain ?? '',
        adresseFacturation: data.adresseFacturation ?? '',
      })
    })

  useEffect(() => {
    load().catch((err) => setError(err.message))
    api
      .get('/formulas')
      .then(setFormulas)
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSaveInfo = async (event) => {
    event.preventDefault()
    setSavingInfo(true)
    setError(null)
    try {
      await api.patch(`/enterprises/${id}`, infoForm)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingInfo(false)
    }
  }

  const openCreateContract = () => {
    setEditingContractId(null)
    setContractForm(EMPTY_CONTRACT_FORM)
    setContractModalOpen(true)
  }

  const openEditContract = (contract) => {
    setEditingContractId(contract.id)
    setContractForm(toContractFormValues(contract))
    setContractModalOpen(true)
  }

  const handleSubmitContract = async (event) => {
    event.preventDefault()
    setSavingContract(true)
    setError(null)
    try {
      const payload = {
        formulaId: contractForm.formulaId,
        budgetCreditOverride: contractForm.budgetCreditOverride
          ? Number(contractForm.budgetCreditOverride)
          : undefined,
        dateDebut: contractForm.dateDebut,
        dateExpiration: contractForm.dateExpiration,
      }
      if (editingContractId) {
        await api.patch(`/contracts/${editingContractId}`, {
          formulaId: payload.formulaId,
          budgetCreditOverride: payload.budgetCreditOverride,
          dateExpiration: payload.dateExpiration,
          statut: contractForm.statut,
        })
      } else {
        await api.post(`/enterprises/${id}/contracts`, payload)
      }
      setContractModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingContract(false)
    }
  }

  const handleCreateRhOwner = async (event) => {
    event.preventDefault()
    setSavingRh(true)
    setError(null)
    try {
      await api.post(`/enterprises/${id}/rh-accounts`, rhForm)
      setRhForm(EMPTY_RH_FORM)
      setRhModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingRh(false)
    }
  }

  if (!enterprise || !infoForm) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="max-w-3xl">
      <Link
        to="/entreprises"
        className="mb-2 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux entreprises
      </Link>

      <h1 className="mb-6 text-xl font-semibold text-gray-900">{enterprise.raisonSociale}</h1>

      {error && <Alert>{error}</Alert>}

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Informations générales</h2>
        <form onSubmit={handleSaveInfo} className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom de l'entreprise (raison sociale)
            </label>
            <input
              required
              value={infoForm.raisonSociale}
              onChange={(e) =>
                setInfoForm((f) => ({ ...f, raisonSociale: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SIRET</label>
            <input
              value={infoForm.siret}
              onChange={(e) => setInfoForm((f) => ({ ...f, siret: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Secteur d'activité
            </label>
            <input
              value={infoForm.secteurActivite}
              onChange={(e) =>
                setInfoForm((f) => ({ ...f, secteurActivite: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Domaine email
            </label>
            <input
              value={infoForm.emailDomain}
              onChange={(e) => setInfoForm((f) => ({ ...f, emailDomain: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Adresse de facturation <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <p className="mb-1 text-xs text-gray-500">
              Adresse postale à laquelle seront envoyées les factures de cette entreprise.
            </p>
            <input
              value={infoForm.adresseFacturation}
              onChange={(e) =>
                setInfoForm((f) => ({ ...f, adresseFacturation: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" loading={savingInfo}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mb-6 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Contrats</h2>
          <div className="flex gap-2">
            <Link to={`/entreprises/${id}/import`}>
              <Button variant="secondary" icon={Upload}>
                Importer des bénéficiaires
              </Button>
            </Link>
            <Button icon={Plus} onClick={openCreateContract}>
              Nouveau contrat
            </Button>
          </div>
        </div>
        {enterprise.contracts.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun contrat pour cette entreprise.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {enterprise.contracts.map((contract) => (
              <li key={contract.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">
                      {contract.formula.nom} ·{' '}
                      {contract.budgetCreditOverride ?? contract.formula.budgetCreditDefault}{' '}
                      {UNITE_CREDIT_LABELS[contract.formula.uniteCredit]}
                    </p>
                    <p className="text-xs text-gray-400">
                      Du {formatDate(contract.dateDebut)} au {formatDate(contract.dateExpiration)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={CONTRACT_STATUS_TONES[contract.statut]}>
                      {CONTRACT_STATUS_LABELS[contract.statut] ?? contract.statut}
                    </Badge>
                    <Button
                      variant="ghost"
                      className="px-2 py-1"
                      onClick={() => openEditContract(contract)}
                    >
                      Modifier
                    </Button>
                  </div>
                </div>
                {contract.amendments.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 border-gray-100 pl-3 text-xs text-gray-500">
                    {contract.amendments.map((amendment) => (
                      <li key={amendment.id}>
                        {AMENDMENT_TYPE_LABELS[amendment.type] ?? amendment.type} : «{' '}
                        {amendment.ancienneValeur ?? '—'} » → « {amendment.nouvelleValeur} » le{' '}
                        {formatDate(amendment.dateEffet)} par {amendment.createdBy?.name ?? '—'}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        title={editingContractId ? 'Modifier le contrat' : 'Nouveau contrat'}
      >
        <form onSubmit={handleSubmitContract} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Formule</label>
            <select
              required
              value={contractForm.formulaId}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, formulaId: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">Choisir une Formule</option>
              {formulas.map((formula) => (
                <option key={formula.id} value={formula.id}>
                  {formula.nom} ({formula.budgetCreditDefault} {UNITE_CREDIT_LABELS[formula.uniteCredit]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Budget override (optionnel)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={contractForm.budgetCreditOverride}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, budgetCreditOverride: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date de début
              </label>
              <input
                required
                type="date"
                disabled={Boolean(editingContractId)}
                value={contractForm.dateDebut}
                onChange={(e) =>
                  setContractForm((f) => ({ ...f, dateDebut: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date d'expiration
              </label>
              <input
                required
                type="date"
                value={contractForm.dateExpiration}
                onChange={(e) =>
                  setContractForm((f) => ({ ...f, dateExpiration: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          {editingContractId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
              <select
                value={contractForm.statut}
                onChange={(e) => setContractForm((f) => ({ ...f, statut: e.target.value }))}
                className={inputClass}
              >
                {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setContractModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={savingContract}>
              {editingContractId ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Comptes RH</h2>
          <Button icon={UserPlus} onClick={() => setRhModalOpen(true)}>
            Créer RH Owner
          </Button>
        </div>
        {enterprise.rhAccounts.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun compte RH pour cette entreprise.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {enterprise.rhAccounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{account.fullName}</p>
                  <p className="text-xs text-gray-400">{account.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="indigo">{RH_ROLE_LABELS[account.role] ?? account.role}</Badge>
                  <Badge tone={RH_STATUS_TONES[account.status]}>
                    {RH_STATUS_LABELS[account.status] ?? account.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={rhModalOpen} onClose={() => setRhModalOpen(false)} title="Créer un RH Owner">
        <form onSubmit={handleCreateRhOwner} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom complet</label>
            <input
              required
              value={rhForm.fullName}
              onChange={(e) => setRhForm((f) => ({ ...f, fullName: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              required
              type="email"
              value={rhForm.email}
              onChange={(e) => setRhForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRhModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={savingRh}>
              Créer et envoyer les identifiants
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
