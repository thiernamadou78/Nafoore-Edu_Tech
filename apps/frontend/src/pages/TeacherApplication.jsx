import { useEffect, useRef, useState } from 'react'
import { validateUploads } from '../lib/fileValidation'
import { useCitySuggestions } from '../lib/useCitySuggestions'

const LEVELS = [
  { value: 'primaire', label: 'Primaire' },
  { value: 'college', label: 'Collège' },
  { value: 'lycee', label: 'Lycée' },
]

// Classes precises par niveau — chaque niveau coche doit avoir au moins une
// classe precisee (verifie a la soumission), et peut cumuler des classes de
// plusieurs niveaux differents (ex: CM2 et 1ère).
const CLASSES_BY_LEVEL = {
  primaire: [
    { value: 'cp', label: 'CP' },
    { value: 'ce1', label: 'CE1' },
    { value: 'ce2', label: 'CE2' },
    { value: 'cm1', label: 'CM1' },
    { value: 'cm2', label: 'CM2' },
  ],
  college: [
    { value: '6e', label: '6ème' },
    { value: '5e', label: '5ème' },
    { value: '4e', label: '4ème' },
    { value: '3e', label: '3ème' },
  ],
  lycee: [
    { value: '2nde', label: '2nde' },
    { value: '1re', label: '1ère' },
    { value: 'terminale', label: 'Terminale' },
  ],
}

const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
]

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const BENEFITS = [
  { icon: '💰', text: 'Rémunération attractive' },
  { icon: '🗓️', text: 'Horaires flexibles' },
  { icon: '📍', text: 'Présentiel ou distanciel' },
  { icon: '🤝', text: 'Accompagnement dédié' },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const DEFAULT_FORM = {
  gender: '',
  candidateName: '',
  candidateEmail: '',
  phone: '',
  subjects: [],
  levels: [],
  classes: [],
  zone: '',
  postalCode: '',
  city: '',
  bio: '',
  availabilityDays: [],
}

const CATEGORY_LABELS = {
  scolaire: 'Soutien scolaire',
  professionnel: 'Formation professionnelle',
}

// Recherche insensible aux accents et a la casse ("powe" -> "Power BI").
const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

// Liste fermee (pas de saisie libre) chargee depuis le catalogue gere par le
// Super Admin : indispensable pour que les demandes des familles (et les
// besoins des entreprises) puissent etre comparees aux matieres d'un prof.
function useSubjectCatalog() {
  const [catalog, setCatalog] = useState([])
  useEffect(() => {
    fetch(`${API_URL}/subjects`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setCatalog)
      .catch(() => setCatalog([]))
  }, [])
  return catalog
}

// Pastilles + recherche au clic (meme pattern que "Mon profil" cote enseignant) :
// evite d'afficher les 24 matieres d'un coup et allonger le formulaire.
function SubjectQuickAdd({ catalog, selected, onChange }) {
  // Champ visible par defaut ; une fois une matiere choisie il se replie et
  // laisse la place au bouton "+ Ajouter".
  const [open, setOpen] = useState(true)
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  const normalizedQuery = normalize(query.trim())
  const filtered = catalog
    .filter(({ name }) => !selected.includes(name) && normalize(name).includes(normalizedQuery))
    .map(({ name }) => name)
  const groups = ['scolaire', 'professionnel']
    .map((category) => ({
      category,
      names: catalog
        .filter((subject) => subject.category === category && filtered.includes(subject.name))
        .map((subject) => subject.name),
    }))
    .filter((group) => group.names.length > 0)

  const addSubject = (subject) => {
    onChange([...selected, subject])
    setQuery('')
    setFocused(false)
    setOpen(false)
  }

  const reopen = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((subject) => (
          <span
            key={subject}
            className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2.5 py-1 font-sans text-xs font-semibold text-navy"
          >
            {subject}
            <button
              type="button"
              onClick={() => onChange(selected.filter((s) => s !== subject))}
              className="leading-none hover:opacity-70"
              aria-label={`Retirer ${subject}`}
            >
              ×
            </button>
          </span>
        ))}
        {!open && (
          <button
            type="button"
            onClick={reopen}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-navy/40 px-2.5 py-1 font-sans text-xs font-semibold text-navy hover:bg-navy/5"
          >
            + Ajouter
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
            onFocus={() => setFocused(true)}
            onBlur={() =>
              setTimeout(() => {
                setFocused(false)
                if (selected.length > 0) setOpen(false)
              }, 150)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered.length > 0) addSubject(filtered[0])
              }
              if (e.key === 'Escape') inputRef.current?.blur()
            }}
            placeholder="Rechercher (ex : Maths, Power BI, Gestion de projet)…"
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
          />
          {focused && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {groups.length === 0 ? (
              <p className="px-3 py-2 font-sans text-sm text-gray-400">Aucune matière trouvée.</p>
            ) : (
              groups.map((group) => (
                <div key={group.category}>
                  <p className="sticky top-0 bg-gray-50 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {CATEGORY_LABELS[group.category]}
                  </p>
                  {group.names.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => addSubject(subject)}
                      className="block w-full px-3 py-2 text-left font-sans text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TeacherApplication() {
  const [form, setForm] = useState(DEFAULT_FORM)
  // Ville proposee / remplie a partir du code postal.
  const { listId: cityListId, options: cityOptions } = useCitySuggestions(
    form?.postalCode,
    form?.city,
    (city) => setForm((f) => (f ? { ...f, city } : f)),
  )
  const [cv, setCv] = useState(null)
  const [identityDocument, setIdentityDocument] = useState(null)
  const [diplomas, setDiplomas] = useState([])
  const [criminalRecord, setCriminalRecord] = useState(null)
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [fileErrors, setFileErrors] = useState({})

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const subjectCatalog = useSubjectCatalog()
  // Niveaux/classes : seulement pour les matieres de soutien scolaire (un
  // formateur qui ne propose que des domaines pro n'en a pas).
  const needsLevels = form.subjects.some(
    (name) => subjectCatalog.find((subject) => subject.name === name)?.category !== 'professionnel',
  )

  const toggleLevel = (value) => {
    setForm((f) => {
      const removing = f.levels.includes(value)
      const classesForLevel = CLASSES_BY_LEVEL[value]?.map((c) => c.value) ?? []
      return {
        ...f,
        levels: removing ? f.levels.filter((l) => l !== value) : [...f.levels, value],
        // En décochant un niveau, on retire aussi les classes précises qui
        // ne seraient plus visibles pour ce niveau.
        classes: removing
          ? f.classes.filter((c) => !classesForLevel.includes(c))
          : f.classes,
      }
    })
  }

  const toggleClasse = (value) => {
    setForm((f) => ({
      ...f,
      classes: f.classes.includes(value)
        ? f.classes.filter((c) => c !== value)
        : [...f.classes, value],
    }))
  }

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      availabilityDays: f.availabilityDays.includes(day)
        ? f.availabilityDays.filter((d) => d !== day)
        : [...f.availabilityDays, day],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.gender) {
      setStatus('error')
      setErrorMsg('Merci de préciser votre genre.')
      return
    }
    if (form.subjects.length === 0) {
      setStatus('error')
      setErrorMsg('Choisissez au moins une matière.')
      return
    }
    if (needsLevels && form.levels.length === 0) {
      setStatus('error')
      setErrorMsg('Choisissez au moins un niveau pour les matières scolaires.')
      return
    }
    if (form.availabilityDays.length === 0) {
      setStatus('error')
      setErrorMsg('Choisissez au moins un jour de disponibilité.')
      return
    }
    if (form.bio.trim().length < 20) {
      setStatus('error')
      setErrorMsg('Ta présentation doit faire au moins 20 caractères.')
      return
    }
    const levelWithoutClasse = needsLevels && form.levels.find(
      (level) => !CLASSES_BY_LEVEL[level].some(({ value }) => form.classes.includes(value)),
    )
    if (levelWithoutClasse) {
      setStatus('error')
      setErrorMsg(
        `Précisez au moins une classe pour le niveau "${LEVELS.find((l) => l.value === levelWithoutClasse)?.label}".`,
      )
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('gender', form.gender)
      formData.append('candidateName', form.candidateName)
      formData.append('candidateEmail', form.candidateEmail)
      formData.append('phone', form.phone)
      // JSON : un nom de matiere peut contenir une virgule.
      formData.append('subjects', JSON.stringify(form.subjects))
      // Niveaux masques (domaines pro uniquement) : on n'envoie rien.
      formData.append('levels', JSON.stringify(needsLevels ? form.levels : []))
      formData.append('classes', JSON.stringify(needsLevels ? form.classes : []))
      formData.append('zone', form.zone)
      formData.append('postalCode', form.postalCode)
      formData.append('city', form.city.trim())
      formData.append('bio', form.bio.trim())
      formData.append('availability', form.availabilityDays.join(', '))
      if (cv) formData.append('cv', cv)
      if (identityDocument) formData.append('identityDocument', identityDocument)
      diplomas.forEach((file) => formData.append('diplomas', file))
      if (criminalRecord) formData.append('criminalRecord', criminalRecord)

      const res = await fetch(`${API_URL}/teacher-applications/public`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = Array.isArray(data.message)
          ? data.message.join(' · ')
          : data.message || 'Une erreur est survenue.'
        throw new Error(msg)
      }
      setStatus('success')
      setForm(DEFAULT_FORM)
      setCv(null)
      setIdentityDocument(null)
      setDiplomas([])
      setCriminalRecord(null)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  return (
    <section className="py-24 bg-navy relative overflow-hidden min-h-[70vh]">
      <div
        className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)',
          transform: 'translate(-30%, 30%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 bg-white/10 text-gold-400 font-sans text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-6">
              <span className="w-1 h-1 bg-gold-400 rounded-full" />
              Recrutement
            </div>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
              Rejoins le réseau <span className="text-gold-400">Nafoore Education</span>
            </h1>
            <p className="font-sans text-white/60 text-base leading-relaxed mb-10">
              Dépose ta candidature en quelques minutes. Notre équipe examine
              ton dossier et revient vers toi rapidement.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {BENEFITS.map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="font-sans text-white/70 text-xs">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {status === 'success' ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-2xl shadow-black/20">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
                  ✅
                </div>
                <h3 className="font-serif text-xl font-bold text-navy mb-2">
                  Candidature envoyée !
                </h3>
                <p className="font-sans text-gray-500 text-sm mb-6">
                  Votre dossier est en cours d'examen, nous revenons vers vous
                  bientôt.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="font-sans text-sm text-navy font-semibold hover:text-gold-500 transition-colors underline underline-offset-2"
                >
                  Envoyer une autre candidature
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl p-8 shadow-2xl shadow-black/20"
              >
                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Genre <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, gender: value }))}
                        className={`px-3 py-2.5 rounded-xl font-sans text-sm font-semibold border-2 transition-all ${
                          form.gender === value
                            ? 'bg-navy text-white border-navy shadow-md shadow-navy/20'
                            : 'text-gray-500 border-gray-200 hover:border-navy/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Nom complet <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="candidateName"
                      value={form.candidateName}
                      onChange={handleChange}
                      required
                      placeholder="Aïssatou Diallo"
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Téléphone <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      pattern="^(\+33 ?|0)[1-9]([ .-]?\d{2}){4}$"
                      title="Numéro de téléphone français (ex : 06 12 34 56 78)"
                      placeholder="06 12 34 56 78"
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="candidateEmail"
                    value={form.candidateEmail}
                    onChange={handleChange}
                    required
                    placeholder="aissatou@exemple.fr"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                  />
                </div>

                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Adresse <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="zone"
                    value={form.zone}
                    onChange={handleChange}
                    required
                    autoComplete="street-address"
                    placeholder="Ex : 3 rue de la République"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-[110px_1fr] gap-3 mb-4">
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Code postal <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="postalCode"
                      value={form.postalCode}
                      onChange={handleChange}
                      required
                      pattern="\d{5}"
                      maxLength={5}
                      inputMode="numeric"
                      placeholder="94550"
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Ville / Commune <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="city"
                      list={cityListId}
                      value={form.city}
                      onChange={handleChange}
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Ex : Chevilly-Larue"
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                    />
                    <datalist id={cityListId}>
                      {cityOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Matières / domaines enseignés <span className="text-red-400">*</span>
                  </label>
                  <p className="mb-2 font-sans text-xs text-gray-400">
                    Soutien scolaire et/ou domaines professionnels (formations en entreprise).
                  </p>
                  <SubjectQuickAdd
                    catalog={subjectCatalog}
                    selected={form.subjects}
                    onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
                  />
                </div>

                {/* Niveaux : affiches seulement si une matiere de soutien
                    scolaire est choisie (inutiles pour un formateur pro). */}
                {needsLevels && (
                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Niveaux scolaires <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    {LEVELS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleLevel(value)}
                        className={`px-4 py-2 rounded-xl font-sans text-xs font-semibold border-2 transition-all ${
                          form.levels.includes(value)
                            ? 'bg-navy text-white border-navy'
                            : 'text-gray-500 border-gray-200 hover:border-navy/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Classes précises par niveau coché — obligatoire pour chaque
                      niveau (vérifié à la soumission), et les classes de
                      plusieurs niveaux peuvent se cumuler. */}
                  {form.levels.length > 0 && (
                    <div className="mt-3 space-y-2.5 rounded-xl bg-gray-50 p-3">
                      {form.levels.map((level) => (
                        <div key={level}>
                          <p className="mb-1.5 font-sans text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                            {LEVELS.find((l) => l.value === level)?.label} — classes précises{' '}
                            <span className="text-red-400">*</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {CLASSES_BY_LEVEL[level].map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => toggleClasse(value)}
                                className={`px-3 py-1.5 rounded-lg font-sans text-xs font-semibold border-2 transition-all ${
                                  form.classes.includes(value)
                                    ? 'bg-gold-500 text-navy border-gold-500'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gold-400/50'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Disponibilités <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3.5 py-2 rounded-xl font-sans text-xs font-semibold border-2 transition-all ${
                          form.availabilityDays.includes(day)
                            ? 'bg-navy text-white border-navy'
                            : 'text-gray-500 border-gray-200 hover:border-navy/30'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Ta présentation (visible par les familles){' '}
                    <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    rows={5}
                    required
                    minLength={20}
                    maxLength={2000}
                    placeholder="Présente ton parcours, ta méthode pédagogique, tes points forts…"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                  />
                </div>

                <p className="font-sans text-xs text-gray-400 mb-3">
                  Documents (facultatifs pour l'instant, à compléter plus tard par email) — formats
                  acceptés : PDF, JPG ou PNG, 5 Mo maximum par fichier.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      CV
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        const error = validateUploads(file ? [file] : [])
                        setFileErrors((prev) => ({ ...prev, cv: error }))
                        if (error) e.target.value = ''
                        setCv(error ? null : file)
                      }}
                      className="w-full font-sans text-xs text-gray-500"
                    />
                    {fileErrors.cv && (
                      <p className="mt-1.5 font-sans text-xs text-red-600">{fileErrors.cv}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Pièce d'identité
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        const error = validateUploads(file ? [file] : [])
                        setFileErrors((prev) => ({ ...prev, identityDocument: error }))
                        if (error) e.target.value = ''
                        setIdentityDocument(error ? null : file)
                      }}
                      className="w-full font-sans text-xs text-gray-500"
                    />
                    {fileErrors.identityDocument && (
                      <p className="mt-1.5 font-sans text-xs text-red-600">{fileErrors.identityDocument}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Diplômes
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        const error = validateUploads(files)
                        setFileErrors((prev) => ({ ...prev, diplomas: error }))
                        if (error) e.target.value = ''
                        setDiplomas(error ? [] : files)
                      }}
                      className="w-full font-sans text-xs text-gray-500"
                    />
                    {fileErrors.diplomas && (
                      <p className="mt-1.5 font-sans text-xs text-red-600">{fileErrors.diplomas}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Casier judiciaire (B3)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        const error = validateUploads(file ? [file] : [])
                        setFileErrors((prev) => ({ ...prev, criminalRecord: error }))
                        if (error) e.target.value = ''
                        setCriminalRecord(error ? null : file)
                      }}
                      className="w-full font-sans text-xs text-gray-500"
                    />
                    {fileErrors.criminalRecord && (
                      <p className="mt-1.5 font-sans text-xs text-red-600">{fileErrors.criminalRecord}</p>
                    )}
                  </div>
                </div>

                {status === 'error' && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 font-sans text-sm rounded-xl px-4 py-3">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-navy text-white font-sans font-bold py-3.5 rounded-full hover:bg-navy/90 transition-all shadow-lg shadow-navy/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Envoi en cours…
                    </span>
                  ) : (
                    'Envoyer ma candidature →'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
