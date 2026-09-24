import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap, Upload, X } from 'lucide-react'
import { api } from '../lib/api'
import { useStudents } from '../context/StudentsContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CLASSE_LABELS } from './labels'
import { CLASSE_OPTIONS_BY_LEVEL, SUBJECTS_BY_LEVEL } from './curriculum'
import { useCitySuggestions } from '../lib/useCitySuggestions'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
]

// Un eleve ne peut raisonnablement pas avoir moins de 5 ans (avant CP) ni
// plus de 20 ans — meme regle que la validation backend
// (IsPlausibleBirthDate), juste pour guider la saisie du calendrier.
function isoDateYearsAgo(years) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}
const MIN_BIRTHDATE = isoDateYearsAgo(20)
const MAX_BIRTHDATE = isoDateYearsAgo(5)

const DEFAULT_FORM = {
  name: '',
  gender: '',
  level: 'college',
  classe: '',
  school: '',
  address: '',
  postalCode: '',
  city: '',
  dateNaissance: '',
  subjects: [],
}

const PILL_TONES = ['blue', 'indigo', 'green', 'amber', 'sky', 'leaf', 'clay', 'amberStrong']

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function AddStudent() {
  const navigate = useNavigate()
  const { refresh } = useStudents()
  const photoInputRef = useRef(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  // Ville proposee / remplie a partir du code postal.
  const { listId: cityListId, options: cityOptions } = useCitySuggestions(
    form?.postalCode,
    form?.city,
    (city) => setForm((f) => (f ? { ...f, city } : f)),
  )
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Adresse par defaut = celle de la famille (le plus courant), mais reste
  // modifiable si l'enfant vit ailleurs (ex: chez l'autre parent).
  useEffect(() => {
    api
      .get('/family/me')
      .then((me) => {
        if (me.address || me.postalCode || me.city) {
          setForm((f) => ({
            ...f,
            address: f.address || me.address || '',
            postalCode: f.postalCode || me.postalCode || '',
            city: f.city || me.city || '',
          }))
        }
      })
      .catch(() => {})
  }, [])

  const availableSubjects = SUBJECTS_BY_LEVEL[form.level] ?? []
  const classeOptions = CLASSE_OPTIONS_BY_LEVEL[form.level] ?? []

  const handlePickPhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const addSubject = (subject) => {
    if (!subject || form.subjects.includes(subject)) return
    setForm((f) => ({ ...f, subjects: [...f.subjects, subject] }))
  }

  const removeSubject = (subject) => {
    setForm((f) => ({ ...f, subjects: f.subjects.filter((s) => s !== subject) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.gender) {
      setError('Merci de préciser le genre de l’enfant.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const student = await api.post('/family/students', {
        name: form.name,
        gender: form.gender,
        level: form.level,
        classe: form.classe,
        school: form.school,
        address: form.address,
        postalCode: form.postalCode,
        city: form.city,
        dateNaissance: form.dateNaissance || undefined,
        subjects: form.subjects,
      })
      if (photoFile) {
        const formData = new FormData()
        formData.append('file', photoFile)
        await api.upload(`/family/students/${student.id}/photo`, formData).catch(() => {})
      }
      await refresh()
      navigate(`/eleves/${student.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour
      </Link>
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Ajouter un enfant</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-4 rounded-xl border border-dashed border-gray-200 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-medium text-gold-400">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(form.name || '?')
              )}
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                icon={Upload}
                onClick={() => photoInputRef.current?.click()}
                className="px-3 py-1.5"
              >
                {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
              </Button>
              <p className="mt-1 text-xs text-gray-400">Optionnel — modifiable plus tard</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickPhoto}
                className="hidden"
              />
            </div>
          </div>

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
              Date de naissance
            </label>
            <input
              type="date"
              required
              min={MIN_BIRTHDATE}
              max={MAX_BIRTHDATE}
              value={form.dateNaissance}
              onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Niveau scolaire</label>
            <select
              value={form.level}
              onChange={(e) => {
                const level = e.target.value
                setForm((f) => ({
                  ...f,
                  level,
                  classe: '',
                  subjects: f.subjects.filter((s) => (SUBJECTS_BY_LEVEL[level] ?? []).includes(s)),
                }))
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Ex : 3 rue de la République"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-[130px_1fr] gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Code postal</label>
              <input
                type="text"
                required
                pattern="\d{5}"
                maxLength={5}
                placeholder="75015"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className={inputClass}
              />
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
                className={inputClass}
              />
              <datalist id={cityListId}>
                {cityOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>
          <p className="-mt-2 text-xs text-gray-400">
            Pré-rempli avec votre adresse — modifiable si l'enfant vit ailleurs.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Matières d'intérêt (optionnel)
            </label>
            <select
              value=""
              onChange={(e) => addSubject(e.target.value)}
              className={inputClass}
            >
              <option value="">Ajouter une matière…</option>
              {availableSubjects
                .filter((subject) => !form.subjects.includes(subject))
                .map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
            </select>
            {form.subjects.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.subjects.map((subject, index) => (
                  <Badge key={subject} tone={PILL_TONES[index % PILL_TONES.length]}>
                    {subject}
                    <button
                      type="button"
                      onClick={() => removeSubject(subject)}
                      className="ml-0.5 rounded-full hover:opacity-70"
                      aria-label={`Retirer ${subject}`}
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Link to="/" className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Annuler
              </Button>
            </Link>
            <Button type="submit" icon={GraduationCap} loading={submitting} className="flex-1">
              {submitting ? 'Création…' : 'Ajouter cet enfant'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
