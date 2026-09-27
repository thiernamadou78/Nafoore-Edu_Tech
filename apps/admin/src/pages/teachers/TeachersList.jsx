import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Contact2, Download, Loader2, Pencil, Plus, Power, Search, Trash2, UserPlus } from 'lucide-react'
import { api } from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table'
import { SubjectPicker } from './SubjectPicker'
import { SUBJECT_CATEGORY_LABELS, useSubjects } from '../../lib/useSubjects'
import { CLASS_LABELS, LEVELS, formatLevels, matchLevel } from '../../lib/levels'
import { useCitySuggestions } from '../../lib/useCitySuggestions'
import { LevelPicker } from '../../components/LevelPicker'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

// Memes champs que le formulaire de candidature de la vitrine : un prof cree
// par l'admin doit avoir un profil aussi complet qu'un candidat valide.
const EMPTY_FORM = {
  name: '',
  gender: '',
  subjects: [],
  levels: [],
  classes: [],
  availabilityDays: [],
  address: '',
  postalCode: '',
  city: '',
  email: '',
  phone: '',
  bio: '',
}

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// Choix d'un ou plusieurs fichiers (bouton + nom du fichier choisi).
function FileField({ label, multiple = false, files, onChange }) {
  const inputRef = useRef(null)
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} className="max-w-full px-3 py-1.5">
        <span className="truncate">
          {files.length === 0
            ? multiple
              ? 'Choisir des fichiers'
              : 'Choisir un fichier'
            : files.length === 1
              ? files[0].name
              : `${files.length} fichiers`}
        </span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
        className="hidden"
      />
    </div>
  )
}

const PROFILE_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'scolaire', label: 'Soutien scolaire' },
  { value: 'professionnel', label: 'Formateurs pro' },
]

// Export tableur de la banque (separateur ";" + BOM : ouverture directe dans
// Excel en francais).
function exportCsv(rows, isPro) {
  const header = ['Nom', 'Email', 'Téléphone', 'Ville', 'Code postal', 'Soutien scolaire', 'Niveaux', 'Domaines professionnels', 'Statut']
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((t) =>
    [
      t.name,
      t.email,
      t.phone,
      t.city,
      t.postalCode,
      t.subjects.filter((s) => !isPro(s)).join(', '),
      formatLevels(t.levels, t.classes),
      t.subjects.filter(isPro).join(', '),
      t.verified ? 'Actif' : 'Inactif',
    ]
      .map(cell)
      .join(';'),
  )
  const blob = new Blob(['\uFEFF' + [header.map(cell).join(';'), ...lines].join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `banque-enseignants-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function TeachersList() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  // Banque de formateurs : filtre par profil (scolaire / pro) et par matiere.
  const [profile, setProfile] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('')
  // Niveau ('level:college') ou classe precise ('classe:5e').
  const [levelFilter, setLevelFilter] = useState('')
  const catalog = useSubjects()
  const proSubjects = useMemo(
    () => new Set(catalog.filter((s) => s.category === 'professionnel').map((s) => s.name)),
    [catalog],
  )
  const isPro = useCallback((name) => proSubjects.has(name), [proSubjects])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  // Ville proposee / remplie a partir du code postal.
  const { listId: cityListId, options: cityOptions } = useCitySuggestions(
    form?.postalCode,
    form?.city,
    (city) => setForm((f) => (f ? { ...f, city } : f)),
  )
  // Documents facultatifs, comme sur la candidature.
  const [cvFiles, setCvFiles] = useState([])
  const [identityFiles, setIdentityFiles] = useState([])
  const [diplomaFiles, setDiplomaFiles] = useState([])
  const [criminalRecordFiles, setCriminalRecordFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  // Niveaux demandes seulement si une matiere de soutien scolaire est choisie
  // (inutiles pour un formateur pro), comme sur la candidature.
  const needsLevels = form.subjects.some((name) => !isPro(name))

  const load = useCallback(
    () =>
      api
        .get('/teachers')
        .then(setTeachers)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  useAutoRefresh(() => {
    api
      .get('/teachers')
      .then(setTeachers)
      .catch(() => {})
  })

  const toggleVerified = async (event, teacher) => {
    event.stopPropagation()
    const key = `${teacher.id}:verify`
    setPendingAction(key)
    setError(null)
    try {
      await api.patch(`/teachers/${teacher.id}/verified`, { verified: !teacher.verified })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingAction(null)
    }
  }

  const handleDelete = async (event, teacher) => {
    event.stopPropagation()
    if (!window.confirm(`Supprimer définitivement ${teacher.name} ?`)) return
    const key = `${teacher.id}:delete`
    setPendingAction(key)
    setError(null)
    try {
      await api.del(`/teachers/${teacher.id}`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingAction(null)
    }
  }

  const visibleTeachers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return teachers.filter((teacher) => {
      const pro = teacher.subjects.some(isPro)
      const school = teacher.subjects.some((s) => !isPro(s))
      if (profile === 'professionnel' && !pro) return false
      if (profile === 'scolaire' && !school) return false
      if (subjectFilter && !teacher.subjects.includes(subjectFilter)) return false
      if (levelFilter) {
        const [kind, value] = levelFilter.split(':')
        if (kind === 'level' && !(teacher.levels ?? []).includes(value)) return false
        if (kind === 'classe') {
          const level = LEVELS.find((l) => l.classes.includes(value))?.value
          // Meme regle que le matching des demandes (prof de 6e != demande de 5e).
          if (matchLevel(teacher, { level, classe: value }) !== 'match') return false
        }
      }
      if (!term) return true
      return [teacher.name, teacher.city, teacher.postalCode, ...teacher.subjects]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [teachers, search, profile, subjectFilter, levelFilter, isPro])
  const proCount = useMemo(() => teachers.filter((t) => t.subjects.some(isPro)).length, [teachers, isPro])

  const closeCreate = () => {
    setShowCreate(false)
    setForm(EMPTY_FORM)
    setCvFiles([])
    setIdentityFiles([])
    setDiplomaFiles([])
    setCriminalRecordFiles([])
    setError(null)
  }

  const uploadDocument = (teacherId, file, type) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    // Best-effort : le compte enseignant est déjà créé, un échec d'upload ne
    // doit pas bloquer le flux (le document reste ajoutable depuis sa fiche).
    return api.upload(`/teachers/${teacherId}/documents`, formData).catch(() => {})
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (form.subjects.length === 0) {
      setError('Choisissez au moins une matière.')
      return
    }
    if (needsLevels && form.levels.length === 0) {
      setError('Choisissez au moins un niveau scolaire.')
      return
    }
    if (form.availabilityDays.length === 0) {
      setError('Choisissez au moins un jour de disponibilité.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const teacher = await api.post('/teachers', {
        name: form.name,
        gender: form.gender,
        subjects: form.subjects,
        levels: needsLevels ? form.levels : [],
        classes: needsLevels ? form.classes : [],
        availabilityDays: form.availabilityDays,
        address: form.address,
        postalCode: form.postalCode,
        city: form.city.trim(),
        email: form.email,
        phone: form.phone,
        bio: form.bio.trim(),
      })
      await Promise.all([
        ...cvFiles.map((file) => uploadDocument(teacher.id, file, 'cv')),
        ...identityFiles.map((file) => uploadDocument(teacher.id, file, 'piece_identite')),
        ...diplomaFiles.map((file) => uploadDocument(teacher.id, file, 'diplome')),
        ...criminalRecordFiles.map((file) => uploadDocument(teacher.id, file, 'casier_judiciaire')),
      ])
      closeCreate()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Enseignants</h1>
          <span className="text-sm text-gray-400">{teachers.length}</span>
        </div>
        <Button icon={UserPlus} onClick={() => setShowCreate(true)}>
          Ajouter un enseignant
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PROFILE_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setProfile(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              profile === option.value
                ? 'bg-navy text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-navy/30'
            }`}
          >
            {option.value === 'professionnel' && <Briefcase size={14} />}
            {option.label}
            {option.value === 'professionnel' && (
              <span className={profile === option.value ? 'text-white/70' : 'text-gray-400'}>{proCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, ville, matière…"
            className={`${inputClass} py-2 pl-9`}
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        >
          <option value="">Toutes les matières</option>
          {['professionnel', 'scolaire'].map((category) => (
            <optgroup key={category} label={SUBJECT_CATEGORY_LABELS[category]}>
              {catalog
                .filter((s) => s.category === category)
                .map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        >
          <option value="">Tous les niveaux</option>
          {LEVELS.map((level) => (
            <optgroup key={level.value} label={level.label}>
              <option value={`level:${level.value}`}>Tout le {level.label.toLowerCase()}</option>
              {level.classes.map((classe) => (
                <option key={classe} value={`classe:${classe}`}>
                  {CLASS_LABELS[classe]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {(subjectFilter || levelFilter) && (
          <button
            type="button"
            onClick={() => {
              setSubjectFilter('')
              setLevelFilter('')
            }}
            className="text-sm text-gray-500 hover:text-navy hover:underline"
          >
            Réinitialiser
          </button>
        )}
        <span className="text-sm text-gray-500">
          {visibleTeachers.length} résultat{visibleTeachers.length > 1 ? 's' : ''}
        </span>
        <Button
          variant="secondary"
          icon={Download}
          onClick={() => exportCsv(visibleTeachers, isPro)}
          disabled={visibleTeachers.length === 0}
          className="ml-auto"
        >
          Exporter (Excel)
        </Button>
      </div>

      {error && !showCreate && <Alert>{error}</Alert>}

      {loading ? (
        <Card className="p-6">
          <p className="text-sm text-gray-500">Chargement…</p>
        </Card>
      ) : visibleTeachers.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Contact2}
            title="Aucun enseignant"
            description="Ajoute-en un directement, ou valide une candidature depuis Recrutement."
          />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Th>Enseignant</Th>
            <Th>Matières / domaines</Th>
            <Th>Niveaux</Th>
            <Th>Ville</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </Thead>
          <Tbody>
            {visibleTeachers.map((teacher) => (
              <Tr key={teacher.id} onClick={() => navigate(`/enseignants/${teacher.id}`)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-6 w-1 shrink-0 rounded-full ${
                        teacher.verified ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                    <Avatar name={teacher.name} photoUrl={teacher.photoUrl} size="sm" />
                    <span className="font-medium text-gray-900">{teacher.name}</span>
                    {teacher.subjects.some(isPro) && (
                      <Badge tone="gold" icon={Briefcase}>
                        Formateur
                      </Badge>
                    )}
                  </div>
                </Td>
                <Td className="max-w-[320px]">
                  {teacher.subjects.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {[...teacher.subjects]
                        .sort((a, b) => Number(isPro(b)) - Number(isPro(a)))
                        .map((subject) => (
                          <span
                            key={subject}
                            className={`rounded-md px-1.5 py-0.5 text-xs ${
                              isPro(subject) ? 'bg-gold-400/20 font-medium text-navy' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {subject}
                          </span>
                        ))}
                    </div>
                  )}
                </Td>
                <Td className="max-w-[200px] text-sm text-gray-600">
                  {formatLevels(teacher.levels, teacher.classes) ||
                    (teacher.subjects.some((subject) => !isPro(subject)) ? (
                      <span className="text-xs text-amber-700">Non renseignés</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    ))}
                </Td>
                <Td className="whitespace-nowrap text-gray-600">
                  {teacher.city ? `${teacher.city}${teacher.postalCode ? ` (${teacher.postalCode})` : ''}` : teacher.address || '—'}
                </Td>
                <Td>
                  <Badge tone={teacher.verified ? 'green' : 'gray'}>
                    {teacher.verified ? 'Actif' : 'Inactif'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      title="Modifier"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/enseignants/${teacher.id}`)
                      }}
                      className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-navy active:scale-90"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      title={teacher.verified ? 'Désactiver' : 'Activer'}
                      onClick={(event) => toggleVerified(event, teacher)}
                      disabled={pendingAction === `${teacher.id}:verify`}
                      className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-navy active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    >
                      {pendingAction === `${teacher.id}:verify` ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Power size={16} />
                      )}
                    </button>
                    <button
                      title="Supprimer"
                      onClick={(event) => handleDelete(event, teacher)}
                      disabled={pendingAction === `${teacher.id}:delete`}
                      className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-red-50 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    >
                      {pendingAction === `${teacher.id}:delete` ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={showCreate} onClose={closeCreate} title="Ajouter un enseignant" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {/* Identite et contact */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone *</label>
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
          </div>

          {/* Adresse : meme bloc que le formulaire de contact (adresse, puis
              code postal et ville proposee a partir du code postal). */}
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Adresse *</label>
              <input
                required
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Ex : 3 rue de la République"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Code postal *</label>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  pattern="\d{5}"
                  maxLength={5}
                  placeholder="75015"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ville / Commune *</label>
                <input
                  required
                  minLength={2}
                  list={cityListId}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
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
            <p className="text-xs text-gray-400">
              Sert au matching des demandes (distance) et à la carte du tableau de bord.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Matières / domaines *</label>
            <SubjectPicker
              selected={form.subjects}
              onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
            />
          </div>

          {needsLevels && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Niveaux scolaires *</label>
              <LevelPicker
                levels={form.levels}
                classes={form.classes}
                onChange={({ levels, classes }) => setForm((f) => ({ ...f, levels, classes }))}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Disponibilités *</label>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                      active ? 'border-navy bg-navy text-white' : 'border-gray-200 text-gray-600 hover:border-navy/30'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Présentation (visible par les familles) *</label>
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

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs text-gray-500">
              Documents facultatifs (PDF, JPG ou PNG), ajoutables aussi plus tard depuis la fiche.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FileField label="CV" files={cvFiles} onChange={setCvFiles} />
              <FileField label="Pièce d'identité" files={identityFiles} onChange={setIdentityFiles} />
              <FileField label="Diplômes" multiple files={diplomaFiles} onChange={setDiplomaFiles} />
              <FileField label="Casier judiciaire (B3)" files={criminalRecordFiles} onChange={setCriminalRecordFiles} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeCreate}>
              Annuler
            </Button>
            <Button type="submit" icon={Plus} loading={submitting}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
