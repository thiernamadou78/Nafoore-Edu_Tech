import { useEffect, useRef, useState } from 'react'
import { Plus, Save, Upload, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { SUBJECT_CATEGORY_LABELS, useSubjects } from '../lib/useSubjects'

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

function getInitials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

// Pastilles + recherche-au-clic (meme pattern que le selecteur de matieres
// cote famille) : les matieres actuelles restent visibles, "+ Ajouter"
// declenche un champ de recherche qui filtre la liste fermee au fur et a
// mesure de la saisie (ex: "Ma" -> Mathematiques).
function SubjectQuickAdd({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const catalog = useSubjects()
  // Recherche insensible aux accents et a la casse ("powe" -> "Power BI").
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const normalizedQuery = normalize(query.trim())
  const filtered = catalog
    .filter(({ name }) => !selected.includes(name) && normalize(name).includes(normalizedQuery))
    .map(({ name }) => name)
  const categoryOf = (name) => catalog.find((s) => s.name === name)?.category

  const addSubject = (subject) => {
    onChange([...selected, subject])
    setQuery('')
    setOpen(false)
  }

  const removeSubject = (subject) => onChange(selected.filter((s) => s !== subject))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((subject) => (
          <span
            key={subject}
            className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2.5 py-1 text-xs font-medium text-navy"
          >
            {subject}
            <button
              type="button"
              onClick={() => removeSubject(subject)}
              className="rounded-full hover:opacity-70"
              aria-label={`Retirer ${subject}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-navy/40 px-2.5 py-1 text-xs font-medium text-navy hover:bg-navy/5"
          >
            <Plus size={12} />
            Ajouter
          </button>
        )}
      </div>

      {open && (
        <div className="relative mt-2 max-w-xs">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered.length > 0) addSubject(filtered[0])
              }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Rechercher (ex : Maths, Power BI…)"
            className={inputClass}
          />
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">Aucune matière trouvée.</p>
            ) : (
              ['scolaire', 'professionnel'].map((category) => {
                const names = filtered.filter((name) => categoryOf(name) === category)
                if (names.length === 0) return null
                return (
                  <div key={category}>
                    <p className="sticky top-0 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {SUBJECT_CATEGORY_LABELS[category]}
                    </p>
                    {names.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => addSubject(subject)}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Profil() {
  const { refreshAccount } = useAuth()
  const photoInputRef = useRef(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    api
      .get('/teacher/me/profile')
      .then((data) =>
        setForm({
          name: data.name ?? '',
          gender: data.gender ?? '',
          address: data.address ?? '',
          postalCode: data.postalCode ?? '',
          city: data.city ?? '',
          availabilityDays: data.availabilityDays ?? [],
          email: data.email ?? '',
          phone: data.phone ?? '',
          bio: data.bio ?? '',
          subjects: data.subjects ?? [],
          photoUrl: data.photoUrl ?? null,
        }),
      )
      .catch((err) => setError(err.message))
  }, [])

  const handlePickPhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError(
        `Le fichier « ${file.name} » n'est pas pris en compte. Formats acceptés pour la photo : JPG ou PNG, 5 Mo maximum.`,
      )
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`Le fichier « ${file.name} » est trop volumineux (JPG ou PNG, 5 Mo maximum).`)
      return
    }
    setUploadingPhoto(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { photoUrl } = await api.upload('/teacher/me/photo', formData)
      setForm((f) => ({ ...f, photoUrl }))
      refreshAccount()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaved(false)
    if (
      !form.name.trim() ||
      !form.gender ||
      !form.address.trim() ||
      !form.postalCode.trim() ||
      !form.city.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      form.subjects.length === 0 ||
      form.bio.trim().length < 20
    ) {
      setError(
        'Nom, genre, ville, adresse, code postal, email, téléphone, au moins une matière et une présentation (20 caractères minimum) sont obligatoires.',
      )
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await api.patch('/teacher/me/profile', form)
      setForm((f) => ({ ...f, ...updated }))
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error && !form) return <Alert>{error}</Alert>
  if (!form) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-serif text-2xl font-bold text-navy">Mon profil</h1>
      <p className="mb-6 text-sm text-gray-500">
        Tes informations et tes matières enseignées — visibles par l'équipe Nafoore pour te
        proposer des familles, et utilisées pour filtrer les demandes dans l'onglet Demandes.
      </p>

      <form onSubmit={handleSave}>
        <Card className="mb-6 p-6">
          {error && <Alert className="mb-4">{error}</Alert>}

          <div className="mb-5 flex items-center gap-4 rounded-xl border border-dashed border-gray-200 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-medium text-gold-400">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(form.name)
              )}
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                icon={Upload}
                loading={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                className="px-3 py-1.5"
              >
                {form.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickPhoto}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Genre *</label>
              <select
                required
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className={inputClass}
              >
                <option value="">Choisir…</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom complet</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Ville / Commune *</label>
              <input
                required
                minLength={2}
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Ex : Chevilly-Larue"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[1fr_130px] gap-3 sm:col-span-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Ex : Paris 15e"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Code postal</label>
                <input
                  required
                  pattern="\d{5}"
                  maxLength={5}
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  placeholder="75015"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Jours de disponibilité
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const active = form.availabilityDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          availabilityDays: active
                            ? f.availabilityDays.filter((d) => d !== day)
                            : [...f.availabilityDays, day],
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-navy bg-navy text-white'
                          : 'border-gray-300 text-gray-600 hover:border-navy/40'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Sert à te prévenir quand une séance est planifiée un jour où tu as indiqué ne pas
                être disponible.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Bio *</label>
              <textarea
                rows={3}
                required
                minLength={20}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Présentation courte, expérience, spécialités…"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </Card>

        <Card className="mb-6 p-6">
          <p className="mb-3 text-sm font-medium text-gray-700">Matières enseignées</p>
          <SubjectQuickAdd
            selected={form.subjects}
            onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
          />
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" icon={Save} loading={saving}>
            Enregistrer
          </Button>
          {saved && <span className="text-sm text-leaf-700">Enregistré.</span>}
        </div>
      </form>
    </div>
  )
}
