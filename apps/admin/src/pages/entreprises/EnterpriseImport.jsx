import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { UNITE_CREDIT_LABELS } from './labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const TEMPLATE_COLUMNS = [
  'Nom employé',
  'Prénom employé',
  'Email pro',
  'Nom enfant',
  'Prénom enfant',
  'Date de naissance (JJ/MM/AAAA)',
  'Niveau scolaire (primaire, college ou lycee)',
]

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '—'
}

export function EnterpriseImport() {
  const { id } = useParams()
  const fileInputRef = useRef(null)

  const [enterprise, setEnterprise] = useState(null)
  const [batches, setBatches] = useState([])
  const [contractId, setContractId] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)

  const loadBatches = () => api.get(`/enterprises/${id}/import/batches`).then(setBatches)

  useEffect(() => {
    api
      .get(`/enterprises/${id}`)
      .then(setEnterprise)
      .catch((err) => setError(err.message))
    loadBatches().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handlePreview = async (event) => {
    event.preventDefault()
    if (!file || !contractId) return
    setPreviewing(true)
    setError(null)
    setSuccess(null)
    setPreview(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('contractId', contractId)
      const result = await api.upload(`/enterprises/${id}/import/preview`, formData)
      setPreview(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleCommit = async () => {
    if (!preview || preview.toCreate.length === 0) return
    setCommitting(true)
    setError(null)
    try {
      const result = await api.post(`/enterprises/${id}/import/commit`, {
        contractId,
        fileName: file?.name ?? 'import.xlsx',
        rows: preview.toCreate,
      })
      setSuccess(
        `Import validé : ${result.createdCount} bénéficiaire(s) créé(s), ${result.skippedCount} ignoré(s).`,
      )
      setPreview(null)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadBatches()
    } catch (err) {
      setError(err.message)
    } finally {
      setCommitting(false)
    }
  }

  if (!enterprise) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="max-w-4xl">
      <Link
        to={`/entreprises/${id}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour à {enterprise.raisonSociale}
      </Link>

      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        Importer des bénéficiaires — {enterprise.raisonSociale}
      </h1>

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Fichier RH</h2>
        <p className="mb-3 text-sm text-gray-500">
          Colonnes attendues (dans n'importe quel ordre) : {TEMPLATE_COLUMNS.join(' · ')}
        </p>
        <form onSubmit={handlePreview} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contrat</label>
            <select
              required
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className={inputClass}
            >
              <option value="">Choisir un contrat</option>
              {enterprise.contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.formula.nom} ({contract.budgetCreditOverride ?? contract.formula.budgetCreditDefault}{' '}
                  {UNITE_CREDIT_LABELS[contract.formula.uniteCredit]}) — du{' '}
                  {formatDate(contract.dateDebut)} au {formatDate(contract.dateExpiration)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fichier Excel</label>
            <input
              ref={fileInputRef}
              required
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <Button type="submit" icon={Upload} loading={previewing} disabled={!file || !contractId}>
            Prévisualiser
          </Button>
        </form>
      </Card>

      {preview && (
        <>
          <Card className="mb-6 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                À créer <span className="text-gray-400">({preview.toCreate.length})</span>
              </h2>
              <Button onClick={handleCommit} loading={committing} disabled={preview.toCreate.length === 0}>
                Valider l'import
              </Button>
            </div>
            {preview.toCreate.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune nouvelle ligne à créer.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ligne</th>
                    <th className="px-3 py-2 font-medium">Employé</th>
                    <th className="px-3 py-2 font-medium">Email pro</th>
                    <th className="px-3 py-2 font-medium">Enfant</th>
                    <th className="px-3 py-2 font-medium">Naissance</th>
                    <th className="px-3 py-2 font-medium">Niveau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.toCreate.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                      <td className="px-3 py-2 text-gray-800">
                        {row.prenomEmploye} {row.nomEmploye}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.emailPro}</td>
                      <td className="px-3 py-2 text-gray-800">
                        {row.prenomEnfant} {row.nomEnfant}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{formatDate(row.dateNaissance)}</td>
                      <td className="px-3 py-2 text-gray-700">{row.niveauScolaire}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {preview.duplicates.length > 0 && (
            <Card className="mb-6 p-6">
              <h2 className="mb-3 font-semibold text-gray-900">
                Doublons ignorés <span className="text-gray-400">({preview.duplicates.length})</span>
              </h2>
              <ul className="space-y-1 text-sm text-gray-600">
                {preview.duplicates.map((row) => (
                  <li key={row.rowNumber}>
                    Ligne {row.rowNumber} — {row.prenomEnfant} {row.nomEnfant} ({row.emailPro}) déjà importé
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {preview.errors.length > 0 && (
            <Card className="mb-6 p-6">
              <h2 className="mb-3 font-semibold text-gray-900">
                Erreurs <span className="text-gray-400">({preview.errors.length})</span>
              </h2>
              <ul className="space-y-1 text-sm text-red-600">
                {preview.errors.map((err) => (
                  <li key={err.rowNumber}>
                    Ligne {err.rowNumber} — {err.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <Card className="p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Historique des imports</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun import pour cette entreprise.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {batches.map((batch) => (
              <li key={batch.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{batch.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(batch.createdAt)} par {batch.createdBy.name} · Formule{' '}
                    {batch.contract.formula.nom}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="green">{batch.createdCount} créés</Badge>
                  {batch.skippedCount > 0 && (
                    <Badge tone="gray">{batch.skippedCount} ignorés</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
