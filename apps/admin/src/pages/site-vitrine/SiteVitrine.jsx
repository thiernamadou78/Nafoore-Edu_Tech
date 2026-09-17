import { useEffect, useState } from 'react'
import { MessageSquareQuote, Plus, Star, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_TESTIMONIAL_FORM = {
  author: '',
  role: '',
  quote: '',
  rating: 5,
  order: 0,
  published: true,
}

function toFormValues(testimonial) {
  return {
    author: testimonial.author,
    role: testimonial.role,
    quote: testimonial.quote,
    rating: testimonial.rating,
    order: testimonial.order,
    published: testimonial.published,
  }
}

function HourlyRateCard() {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .get('/admin/settings')
      .then((settings) => setValue(settings.hourlyRateFrom ?? ''))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await api.patch('/admin/settings/hourlyRateFrom', { value })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 font-semibold text-gray-900">Tarif affiché sur la vitrine</h2>
      <p className="mb-4 text-sm text-gray-500">
        Utilisé dans la FAQ du site : "À partir de {value || 'X'} €/h pour les cours particuliers."
      </p>
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <form onSubmit={handleSave} className="flex items-end gap-3">
          <div className="w-40">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tarif de départ (€/h)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setSaved(false)
              }}
              className={inputClass}
            />
          </div>
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
          {saved && <span className="text-sm text-green-600">Enregistré ✓</span>}
        </form>
      )}
    </Card>
  )
}

function TestimonialsCard() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_TESTIMONIAL_FORM)
  const [submitting, setSubmitting] = useState(null)

  const load = () => api.get('/admin/testimonials').then(setTestimonials)

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_TESTIMONIAL_FORM)
    setModalOpen(true)
  }

  const openEdit = (testimonial) => {
    setEditingId(testimonial.id)
    setForm(toFormValues(testimonial))
    setModalOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting('form')
    setError(null)
    try {
      const payload = { ...form, rating: Number(form.rating), order: Number(form.order) }
      if (editingId) {
        await api.patch(`/admin/testimonials/${editingId}`, payload)
      } else {
        await api.post('/admin/testimonials', payload)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(null)
    }
  }

  const togglePublished = async (testimonial) => {
    setSubmitting(testimonial.id)
    setError(null)
    try {
      await api.patch(`/admin/testimonials/${testimonial.id}`, { published: !testimonial.published })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(null)
    }
  }

  const handleDelete = async (testimonial) => {
    if (!window.confirm(`Supprimer le témoignage de ${testimonial.author} ?`)) return
    setSubmitting(testimonial.id)
    setError(null)
    try {
      await api.del(`/admin/testimonials/${testimonial.id}`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h2 className="font-semibold text-gray-900">Témoignages</h2>
          <p className="mt-1 text-sm text-gray-500">
            Seuls les témoignages "Publié" apparaissent sur la vitrine.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Nouveau témoignage
        </Button>
      </div>

      {error && (
        <div className="px-6 pt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : testimonials.length === 0 ? (
          <EmptyState
            icon={MessageSquareQuote}
            title="Aucun témoignage"
            description="Ajoutez le premier témoignage à afficher sur la vitrine."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Auteur</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Extrait</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Ordre</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {testimonials.map((testimonial) => (
                <tr key={testimonial.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{testimonial.author}</td>
                  <td className="px-4 py-3 text-gray-700">{testimonial.role}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-500">{testimonial.quote}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <Star size={13} className="fill-gold-400 text-gold-400" />
                      {testimonial.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{testimonial.order}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => togglePublished(testimonial)}
                      disabled={submitting === testimonial.id}
                      className="disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Badge tone={testimonial.published ? 'green' : 'gray'}>
                        {testimonial.published ? 'Publié' : 'Brouillon'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={() => openEdit(testimonial)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        icon={Trash2}
                        className="px-2 py-1 text-red-600 hover:bg-red-50"
                        loading={submitting === testimonial.id}
                        onClick={() => handleDelete(testimonial)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier le témoignage' : 'Nouveau témoignage'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Auteur</label>
              <input
                required
                placeholder="Sophie M."
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Rôle</label>
              <input
                required
                placeholder="Mère d'élève · Paris 13ème"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Témoignage</label>
            <textarea
              required
              rows={4}
              value={form.quote}
              onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                required
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ordre</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
              <select
                value={form.published ? 'true' : 'false'}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.value === 'true' }))}
                className={inputClass}
              >
                <option value="true">Publié</option>
                <option value="false">Brouillon</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting === 'form'}>
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

export function SiteVitrine() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Site vitrine</h1>
      <HourlyRateCard />
      <TestimonialsCard />
    </div>
  )
}
