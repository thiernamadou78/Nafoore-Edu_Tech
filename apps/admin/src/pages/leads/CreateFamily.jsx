import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SERVICE_LABELS } from './statusLabels'
import { useCitySuggestions } from '../../lib/useCitySuggestions'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
]

// Memes exigences que le formulaire de contact public : une famille creee
// manuellement par l'admin doit avoir un dossier aussi complet qu'une
// famille auto-inscrite.
const DEFAULT_FORM = {
  gender: '',
  name: '',
  email: '',
  phone: '',
  services: [],
  city: '',
  address: '',
  postalCode: '',
  message: '',
}

export function CreateFamily() {
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_FORM)
  // Ville proposee / remplie a partir du code postal.
  const { listId: cityListId, options: cityOptions } = useCitySuggestions(
    form?.postalCode,
    form?.city,
    (city) => setForm((f) => (f ? { ...f, city } : f)),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const toggleService = (value) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(value)
        ? f.services.filter((s) => s !== value)
        : [...f.services, value],
    }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.gender) {
      setError('Merci de préciser le genre du contact.')
      return
    }
    if (form.services.length === 0) {
      setError('Choisissez au moins un service.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const lead = await api.post('/leads', {
        gender: form.gender,
        name: form.name,
        email: form.email,
        phone: form.phone,
        services: form.services,
        city: form.city,
        address: form.address,
        postalCode: form.postalCode,
        message: form.message,
      })
      const params = new URLSearchParams({ leadId: lead.id, familyName: form.name })
      if (form.address) params.set('address', form.address)
      if (form.postalCode) params.set('postalCode', form.postalCode)
      if (form.city) params.set('city', form.city)
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Genre</label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, gender: value })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.gender === value
                      ? 'border-navy bg-navy text-white'
                      : 'border-gray-300 text-gray-600 hover:border-navy/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

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
            <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
            <input
              type="tel"
              required
              pattern="^(\+33 ?|0)[1-9]([ .-]?\d{2}){4}$"
              title="Numéro de téléphone français (ex : 06 12 34 56 78)"
              placeholder="06 12 34 56 78"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Services souhaités
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleService(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.services.includes(value)
                      ? 'border-navy bg-navy text-white'
                      : 'border-gray-300 text-gray-600 hover:border-navy/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ville / Commune</label>
            <input
              type="text"
              required
              minLength={2}
              list={cityListId}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Ex : Chevilly-Larue"
              className={inputClass}
            />
            <datalist id={cityListId}>
              {cityOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-[1fr_130px] gap-3">
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
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Code postal</label>
              <input
                type="text"
                required
                pattern="\d{5}"
                maxLength={5}
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="75015"
                className={inputClass}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-gray-400">
            Permet d'afficher la famille sur la carte du tableau de bord.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Message / note interne
            </label>
            <textarea
              required
              minLength={10}
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Contexte de la demande, besoin exprimé lors de l'appel…"
              className={`${inputClass} resize-none`}
            />
          </div>

          <Button type="submit" icon={UserPlus} loading={submitting} className="w-full">
            {submitting ? 'Création…' : 'Créer la famille'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
