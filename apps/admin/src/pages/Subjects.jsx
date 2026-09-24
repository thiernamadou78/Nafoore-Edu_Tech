import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Briefcase, Eye, EyeOff, GraduationCap, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { invalidateSubjects, SUBJECT_CATEGORY_LABELS } from '../lib/useSubjects'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const CATEGORY_ICONS = { scolaire: GraduationCap, professionnel: Briefcase }

// Catalogue des matieres proposees aux candidats, enseignants et familles.
// Un nom n'est jamais renomme (il est stocke tel quel sur les profils) : on
// masque une matiere, et on ne peut supprimer que celles jamais utilisees.
export function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'professionnel' })
  const [saving, setSaving] = useState(false)
  const [pendingId, setPendingId] = useState(null)
  const [search, setSearch] = useState('')

  const load = () => api.get('/admin/subjects').then(setSubjects)

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const run = async (id, fn, message) => {
    setPendingId(id)
    setError(null)
    setNotice(null)
    try {
      await fn()
      invalidateSubjects()
      await load()
      if (message) setNotice(message)
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingId(null)
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    await run(
      'new',
      () => api.post('/admin/subjects', form),
      `« ${form.name.trim()} » ajoutée : elle est proposée dès maintenant dans les formulaires.`,
    )
    setForm((f) => ({ ...f, name: '' }))
    setSaving(false)
  }

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase()
    const visible = term ? subjects.filter((s) => s.name.toLowerCase().includes(term)) : subjects
    return ['professionnel', 'scolaire'].map((category) => ({
      category,
      items: visible.filter((s) => s.category === category),
    }))
  }, [subjects, search])

  return (
    <div className="max-w-4xl">
      <div className="mb-2 flex items-center gap-2">
        <BookOpen size={20} className="text-navy" />
        <h1 className="text-xl font-semibold text-gray-900">Matières et domaines</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Liste proposée aux candidats et aux enseignants. Les domaines professionnels servent à
        constituer la banque de formateurs pour les missions en entreprise.
      </p>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <Card className="mb-6 p-5">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Nouvelle matière</label>
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex. Tableau Software, Cybersécurité…"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputClass}
            >
              <option value="professionnel">{SUBJECT_CATEGORY_LABELS.professionnel}</option>
              <option value="scolaire">{SUBJECT_CATEGORY_LABELS.scolaire}</option>
            </select>
          </div>
          <Button type="submit" icon={Plus} loading={saving}>
            Ajouter
          </Button>
        </form>
      </Card>

      <div className="relative mb-4 w-72">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une matière"
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="space-y-6">
        {groups.map(({ category, items }) => {
          const Icon = CATEGORY_ICONS[category]
          return (
            <Card key={category} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <Icon size={16} className="text-navy" />
                  {SUBJECT_CATEGORY_LABELS[category]}
                </h2>
                <span className="text-xs text-gray-400">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">Aucune matière.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((subject) => (
                    <li key={subject.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`font-medium ${subject.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {subject.name}
                        </span>
                        {!subject.isActive && <Badge tone="gray">Masquée</Badge>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {subject.teachersCount} enseignant{subject.teachersCount > 1 ? 's' : ''}
                          {subject.applicationsCount > 0 &&
                            ` · ${subject.applicationsCount} candidat${subject.applicationsCount > 1 ? 's' : ''}`}
                        </span>
                        <button
                          type="button"
                          disabled={pendingId === subject.id}
                          onClick={() =>
                            run(
                              subject.id,
                              () => api.patch(`/admin/subjects/${subject.id}`, { isActive: !subject.isActive }),
                              subject.isActive
                                ? `« ${subject.name} » masquée : elle n'est plus proposée (les profils existants la gardent).`
                                : `« ${subject.name} » de nouveau proposée.`,
                            )
                          }
                          className="text-gray-400 hover:text-navy disabled:opacity-50"
                          title={subject.isActive ? 'Masquer (ne plus proposer)' : 'Réafficher'}
                        >
                          {subject.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === subject.id}
                          onClick={() => {
                            if (!window.confirm(`Supprimer définitivement « ${subject.name} » ?`)) return
                            run(subject.id, () => api.del(`/admin/subjects/${subject.id}`), `« ${subject.name} » supprimée.`)
                          }}
                          className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                          title="Supprimer (seulement si jamais utilisée)"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
