import { useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_FORM = { subject: '', message: '' }

export function Support() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    api
      .post('/teacher/support', form)
      .then(() => {
        setStatus('success')
        setForm(EMPTY_FORM)
      })
      .catch((err) => {
        setError(err.message)
        setStatus('idle')
      })
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 font-serif text-2xl font-bold text-navy">Support</h1>
      <p className="mb-6 text-sm text-gray-500">
        Une question, un souci technique, un imprévu avec une famille ? L'équipe Nafoore te
        répond dès que possible.
      </p>

      <Card className="p-6">
        {status === 'success' ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-700">
              <LifeBuoy size={22} />
            </div>
            <p className="font-medium text-gray-900">Message envoyé</p>
            <p className="mt-1 text-sm text-gray-500">
              L'équipe Nafoore reviendra vers toi bientôt.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm font-medium text-navy hover:underline"
            >
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sujet</label>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex : problème pour rédiger un compte-rendu"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Décris ta demande…"
                className={`${inputClass} resize-none`}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={status === 'loading'}>
              Envoyer
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
