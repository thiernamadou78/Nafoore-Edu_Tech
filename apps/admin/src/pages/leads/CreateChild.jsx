import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, GraduationCap, RotateCcw, Upload, X } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CLASSE_OPTIONS_BY_LEVEL, CLASSE_LABELS } from '../students/labels'
import { Badge } from '../../components/ui/Badge'
import { SUBJECTS_BY_LEVEL } from '../../lib/curriculum'
import { useCitySuggestions } from '../../lib/useCitySuggestions'

const GENDERS = [
  { value: 'homme', label: 'Garçon' },
  { value: 'femme', label: 'Fille' },
]

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

// Memes champs que l'ajout d'enfant cote famille (AddStudent).
const DEFAULT_FORM = {
  name: '',
  gender: '',
  subjects: [],
  level: 'college',
  classe: '',
  school: '',
  address: '',
  postalCode: '',
  city: '',
  dateNaissance: '',
}

export function CreateChild() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get('leadId')
  const familyName = searchParams.get('familyName')
  // Preremplie depuis l'adresse donnee par la famille au formulaire de
  // contact : l'enfant vit generalement au meme endroit, et c'est ce champ
  // qui sert a proposer un enseignant proche geographiquement.
  const leadAddress = searchParams.get('address') ?? ''
  const leadPostalCode = searchParams.get('postalCode') ?? ''
  const leadCity = searchParams.get('city') ?? ''

  const formRef = useRef(null)
  const photoInputRef = useRef(null)
  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    address: leadAddress,
    postalCode: leadPostalCode,
    city: leadCity,
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [addedCount, setAddedCount] = useState(0)
  // Ville proposee / remplie a partir du code postal.
  const { listId: cityListId, options: cityOptions } = useCitySuggestions(
    form?.postalCode,
    form?.city,
    (city) => setForm((f) => (f ? { ...f, city } : f)),
  )

  const classeOptions = CLASSE_OPTIONS_BY_LEVEL[form.level] ?? []
  const availableSubjects = SUBJECTS_BY_LEVEL[form.level] ?? []

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

  const resetPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handlePickPhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const submitChild = async () => {
    if (!form.gender) {
      setError("Précisez le genre de l'enfant.")
      return false
    }
    setSubmitting(true)
    setError(null)
    try {
      const student = await api.post('/students', {
        name: form.name,
        gender: form.gender,
        level: form.level,
        classe: form.classe,
        school: form.school,
        address: form.address,
        postalCode: form.postalCode,
        city: form.city.trim(),
        dateNaissance: form.dateNaissance || undefined,
        subjects: form.subjects,
        parentLeadId: leadId,
      })
      if (photoFile) {
        const formData = new FormData()
        formData.append('file', photoFile)
        // La photo n'est pas bloquante : l'élève est déjà créé, on pourra
        // toujours l'ajouter/changer depuis sa fiche si l'upload échoue.
        await api.upload(`/students/${student.id}/photo`, formData).catch(() => {})
      }
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
      setForm({ ...DEFAULT_FORM, address: leadAddress, postalCode: leadPostalCode, city: leadCity })
      resetPhoto()
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

          <div className="flex items-center gap-4 rounded-xl border border-dashed border-gray-200 p-3">
            <Avatar name={form.name || '?'} photoUrl={photoPreview} size="lg" />
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
              value={form.dateNaissance}
              onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
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
              autoComplete="street-address"
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
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="75015"
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
                placeholder="Ex : Chevilly-Larue"
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
            Pré-remplie avec l'adresse de la famille — modifiable si l'enfant vit ailleurs.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Matières d'intérêt (optionnel)
            </label>
            <select
              value=""
              onChange={(e) => {
                const subject = e.target.value
                if (subject && !form.subjects.includes(subject)) {
                  setForm((f) => ({ ...f, subjects: [...f.subjects, subject] }))
                }
              }}
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
                {form.subjects.map((subject) => (
                  <Badge key={subject} tone="blue">
                    {subject}
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, subjects: f.subjects.filter((s) => s !== subject) }))}
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
