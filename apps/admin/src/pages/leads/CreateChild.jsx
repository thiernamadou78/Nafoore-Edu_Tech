import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, GraduationCap, RotateCcw } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CLASSE_OPTIONS_BY_LEVEL, CLASSE_LABELS } from '../students/labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const DEFAULT_FORM = { name: '', level: 'college', classe: '', school: '', address: '' }

export function CreateChild() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get('leadId')
  const familyName = searchParams.get('familyName')

  const formRef = useRef(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [addedCount, setAddedCount] = useState(0)

  const classeOptions = CLASSE_OPTIONS_BY_LEVEL[form.level] ?? []

  if (!leadId) {
    return (
      <Alert>
        Aucune famille sélectionnée. Reprends depuis{' '}
        <button className="underline" onClick={() => navigate('/leads/nouvelle')}>
          Créer une famille
        </button>
        .
      </Alert>
    )
  }

  const submitChild = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/students', {
        name: form.name,
        level: form.level,
        classe: form.classe,
        school: form.school,
        address: form.address || undefined,
        parentLeadId: leadId,
      })
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const handleValidate = async (event) => {
    event.preventDefault()
    if (!formRef.current.reportValidity()) return
    const ok = await submitChild()
    if (ok) navigate(`/leads/${leadId}`)
  }

  const handleValidateAndRepeat = async (event) => {
    event.preventDefault()
    if (!formRef.current.reportValidity()) return
    const ok = await submitChild()
    if (ok) {
      setAddedCount((count) => count + 1)
      setForm(DEFAULT_FORM)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        type="button"
        onClick={() => navigate(`/leads/${leadId}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour à la famille
      </button>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Ajouter un enfant</h1>
      <p className="mb-6 text-sm text-gray-500">
        {familyName ? `Famille ${familyName}` : 'Famille sélectionnée'}
        {addedCount > 0 && ` — ${addedCount} enfant${addedCount > 1 ? 's' : ''} déjà ajouté${addedCount > 1 ? 's' : ''}`}
        . « Valider et terminer » t'amène sur la fiche famille pour envoyer les identifiants.
      </p>
      <Card className="p-6">
        <form ref={formRef} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Prénom et nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Niveau scolaire
              </label>
              <select
                value={form.level}
                onChange={(e) => {
                  const level = e.target.value
                  setForm((f) => ({ ...f, level, classe: '' }))
                }}
                className={inputClass}
              >
                <option value="primaire">Primaire</option>
                <option value="college">Collège</option>
                <option value="lycee">Lycée</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Classe</label>
              <select
                required
                value={form.classe}
                onChange={(e) => setForm({ ...form, classe: e.target.value })}
                className={inputClass}
              >
                <option value="" disabled>
                  Choisir une classe
                </option>
                {classeOptions.map((classe) => (
                  <option key={classe} value={classe}>
                    {CLASSE_LABELS[classe]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">École</label>
            <input
              type="text"
              required
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Adresse (optionnel)
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              icon={RotateCcw}
              loading={submitting}
              onClick={handleValidateAndRepeat}
              className="flex-1"
            >
              Valider et ajouter un autre
            </Button>
            <Button
              type="button"
              icon={GraduationCap}
              loading={submitting}
              onClick={handleValidate}
              className="flex-1"
            >
              Valider et terminer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
