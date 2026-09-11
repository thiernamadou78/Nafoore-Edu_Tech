import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const DEFAULT_FORM = { name: '', email: '', phone: '', address: '' }

export function CreateFamily() {
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const lead = await api.post('/leads', {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        address: form.address,
      })
      const params = new URLSearchParams({ leadId: lead.id, familyName: form.name })
      if (form.address) params.set('address', form.address)
      navigate(`/leads/nouvelle/enfants?${params.toString()}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        type="button"
        onClick={() => navigate('/leads')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux leads
      </button>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Créer une famille</h1>
      <p className="mb-6 text-sm text-gray-500">
        Ajoute d'abord les enfants sur l'écran suivant. L'email avec les identifiants de
        connexion ne part que lorsque tu cliques sur « Valider et créer le compte » depuis la
        fiche de la famille.
      </p>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom du contact
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Téléphone (optionnel)
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Quartier, commune, ville…"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Permet d'afficher la famille sur la carte du tableau de bord.
            </p>
          </div>

          <Button type="submit" icon={UserPlus} loading={submitting} className="w-full">
            {submitting ? 'Création…' : 'Créer la famille'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
