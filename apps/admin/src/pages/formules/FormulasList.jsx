import { useEffect, useState } from 'react'
import { LayoutList, Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { UNITE_CREDIT_LABELS } from '../entreprises/labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_FORM = {
  nom: '',
  budgetCreditDefault: '',
  uniteCredit: 'euros',
  plafondBeneficiairesParEmploye: '',
  matieresEligibles: '',
}

function toFormValues(formula) {
  return {
    nom: formula.nom,
    budgetCreditDefault: String(formula.budgetCreditDefault),
    uniteCredit: formula.uniteCredit,
    plafondBeneficiairesParEmploye: formula.plafondBeneficiairesParEmploye
      ? String(formula.plafondBeneficiairesParEmploye)
      : '',
    matieresEligibles: (formula.matieresEligibles ?? []).join(', '),
  }
}

function toPayload(form) {
  return {
    nom: form.nom,
    budgetCreditDefault: Number(form.budgetCreditDefault),
    uniteCredit: form.uniteCredit,
    plafondBeneficiairesParEmploye: form.plafondBeneficiairesParEmploye
      ? Number(form.plafondBeneficiairesParEmploye)
      : undefined,
    matieresEligibles: form.matieresEligibles
      ? form.matieresEligibles.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  }
}

export function FormulasList() {
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const load = () => api.get('/formulas').then(setFormulas)

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (formula) => {
    setEditingId(formula.id)
    setForm(toFormValues(formula))
    setModalOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = toPayload(form)
      if (editingId) {
        await api.patch(`/formulas/${editingId}`, payload)
      } else {
        await api.post('/formulas', payload)
      }
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
          <h1 className="text-xl font-semibold text-gray-900">Catalogue Formules</h1>
          <span className="text-sm text-gray-400">{formulas.length}</span>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Nouvelle Formule
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : formulas.length === 0 ? (
          <EmptyState
            icon={LayoutList}
            title="Aucune Formule"
            description="Le catalogue de Formules apparaîtra ici."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Budget par défaut</th>
                <th className="px-4 py-3 font-medium">Plafond bénéficiaires/employé</th>
                <th className="px-4 py-3 font-medium">Matières éligibles</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {formulas.map((formula) => (
                <tr key={formula.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{formula.nom}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {formula.budgetCreditDefault} {UNITE_CREDIT_LABELS[formula.uniteCredit]}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formula.plafondBeneficiairesParEmploye ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formula.matieresEligibles.length > 0
                      ? formula.matieresEligibles.join(', ')
                      : 'Toutes'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      className="px-2 py-1"
                      onClick={() => openEdit(formula)}
                    >
                      Modifier
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier la Formule' : 'Nouvelle Formule'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Budget par défaut
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.budgetCreditDefault}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgetCreditDefault: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Unité de crédit
              </label>
              <select
                value={form.uniteCredit}
                onChange={(e) => setForm((f) => ({ ...f, uniteCredit: e.target.value }))}
                className={inputClass}
              >
                <option value="euros">Euros</option>
                <option value="heures">Heures</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Plafond bénéficiaires par employé
            </label>
            <input
              type="number"
              min="1"
              value={form.plafondBeneficiairesParEmploye}
              onChange={(e) =>
                setForm((f) => ({ ...f, plafondBeneficiairesParEmploye: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Matières éligibles (séparées par une virgule, vide = toutes)
            </label>
            <input
              value={form.matieresEligibles}
              onChange={(e) => setForm((f) => ({ ...f, matieresEligibles: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
