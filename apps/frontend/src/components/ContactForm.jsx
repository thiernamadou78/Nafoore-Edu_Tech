import { useEffect, useState } from 'react'
import { useCitySuggestions } from '../lib/useCitySuggestions'

const PROFILES = [
  { value: 'famille', label: 'Famille', icon: '👨‍👩‍👧' },
  { value: 'mairie', label: 'Mairie', icon: '🏛️' },
  { value: 'entreprise', label: 'Entreprise / CSE', icon: '🏢' },
  { value: 'centre_formation_ecole_pro', label: 'Centre de formation / École pro', icon: '🎓' },
]

const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
]

const SERVICES = [
  { value: 'aide_devoirs', label: 'Aide aux devoirs' },
  { value: 'soutien_scolaire', label: 'Soutien scolaire' },
  { value: 'preparation_brevet', label: 'Préparation Brevet' },
  { value: 'preparation_bac', label: 'Préparation Bac' },
  { value: 'coaching_methodologique', label: 'Coaching méthodologique' },
  { value: 'stages_vacances', label: 'Stages vacances' },
  { value: 'accompagnement_bilingue', label: 'Accompagnement bilingue' },
]

const BENEFITS = [
  { icon: '⚡', text: 'Réponse sous 24h ouvrées' },
  { icon: '🎁', text: 'Bilan initial offert' },
  { icon: '🔒', text: 'Sans engagement' },
  { icon: '✅', text: 'Enseignants certifiés' },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function ContactForm() {
  const [form, setForm] = useState({
    profile: 'famille',
    gender: '',
    name: '',
    email: '',
    phone: '',
    message: '',
    services: [],
    city: '',
    address: '',
    postalCode: '',
    desiredStartDate: '',
    childrenCount: '',
  })
  // Ville proposee / remplie a partir du code postal.
  const { listId: cityListId, options: cityOptions } = useCitySuggestions(
    form?.postalCode,
    form?.city,
    (city) => setForm((f) => (f ? { ...f, city } : f)),
  )
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const toggleService = (value) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(value)
        ? f.services.filter((s) => s !== value)
        : [...f.services, value],
    }))

  // Preselection depuis un clic sur une "pastille" de service (section
  // Services) — voir components/Services.jsx qui declenche cet evenement.
  useEffect(() => {
    const handlePreselect = (event) => {
      const { service, profile } = event.detail ?? {}
      setForm((f) => ({
        ...f,
        profile: profile ?? f.profile,
        services: service && !f.services.includes(service) ? [...f.services, service] : f.services,
      }))
    }
    window.addEventListener('nafoore-select-service', handlePreselect)
    return () => window.removeEventListener('nafoore-select-service', handlePreselect)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.gender) {
      setStatus('error')
      setErrorMsg('Merci de préciser votre genre.')
      return
    }
    if (form.services.length === 0) {
      setStatus('error')
      setErrorMsg('Choisissez au moins un service.')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          address: form.profile === 'famille' && form.address ? form.address : undefined,
          postalCode: form.profile === 'famille' && form.postalCode ? form.postalCode : undefined,
          desiredStartDate: form.desiredStartDate || undefined,
          childrenCount:
            form.profile === 'famille' && form.childrenCount ? Number(form.childrenCount) : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : (data.message || 'Une erreur est survenue.')
        throw new Error(msg)
      }
      setStatus('success')
      setForm({
        profile: 'famille',
        gender: '',
        name: '',
        email: '',
        phone: '',
        message: '',
        services: [],
        city: '',
        address: '',
        postalCode: '',
        desiredStartDate: '',
        childrenCount: '',
      })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  return (
    <section id="contact" className="py-24 bg-navy relative overflow-hidden">
      {/* Blob décoratif */}
      <div
        className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)',
          transform: 'translate(-30%, 30%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Colonne gauche */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 bg-white/10 text-gold-400 font-sans text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-6">
              <span className="w-1 h-1 bg-gold-400 rounded-full" />
              Contact
            </div>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
              Parlons de votre{' '}
              <span className="text-gold-400">projet</span>
            </h2>
            <p className="font-sans text-white/60 text-base leading-relaxed mb-10">
              Que vous soyez une famille, une mairie, une entreprise ou un
              centre de formation, notre équipe vous accompagne pour trouver
              la formule idéale.
            </p>

            {/* Bénéfices */}
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

          {/* Formulaire */}
          <div>
            {status === 'success' ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-2xl shadow-black/20">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
                  ✅
                </div>
                <h3 className="font-serif text-xl font-bold text-navy mb-2">Message envoyé !</h3>
                <p className="font-sans text-gray-500 text-sm mb-6">Notre équipe vous répond dans les 24h ouvrées.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="font-sans text-sm text-navy font-semibold hover:text-gold-500 transition-colors underline underline-offset-2"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl shadow-black/20">
                {/* Sélecteur de profil */}
                <div className="mb-5">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Je suis…
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROFILES.map(({ value, label, icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, profile: value })}
                        className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl font-sans text-xs font-semibold border-2 text-center leading-snug transition-all ${
                          form.profile === value
                            ? 'bg-navy text-white border-navy shadow-md shadow-navy/20'
                            : 'text-gray-500 border-gray-200 hover:border-navy/30'
                        }`}
                      >
                        <span className="text-base">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre */}
                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Genre <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, gender: value })}
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

                {/* Nom + Téléphone */}
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Nom complet <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Jean Dupont"
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

                {/* Email */}
                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="jean@exemple.fr"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                  />
                </div>

                {/* Services souhaités — sert à l'équipe pour qualifier la demande et préparer un devis adapté. Plusieurs choix possibles (ex: enfants aux besoins différents). */}
                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Quels services vous intéressent ? <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleService(value)}
                        className={`px-3.5 py-2 rounded-full font-sans text-xs font-semibold border-2 transition-all ${
                          form.services.includes(value)
                            ? 'bg-navy text-white border-navy shadow-md shadow-navy/20'
                            : 'text-gray-500 border-gray-200 hover:border-navy/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 font-sans text-[11px] text-gray-400">
                    Plusieurs choix possibles — par exemple si vous avez plusieurs enfants avec des besoins différents.
                  </p>
                </div>

                {/* Ville / commune (tous les profils) */}
                <div className="mb-4">
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

                {/* Adresse + code postal (famille) : indispensable pour proposer un enseignant proche du domicile */}
                {form.profile === 'famille' && (
                  <div className="mb-4">
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <div>
                        <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Adresse <span className="text-red-400">*</span>
                        </label>
                        <input
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          required
                          placeholder="Quartier, commune, ville…"
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                        />
                      </div>
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
                          placeholder="75015"
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                        />
                      </div>
                    </div>
                    <p className="mt-1 font-sans text-[11px] text-gray-400">
                      Nous permet de vous proposer un enseignant à la fois expérimenté et proche de chez vous.
                    </p>
                  </div>
                )}

                {/* Date de début souhaitée + nombre d'enfants (famille) */}
                <div className={`grid gap-4 mb-4 ${form.profile === 'famille' ? 'sm:grid-cols-2' : ''}`}>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Date de début souhaitée
                    </label>
                    <input
                      type="date"
                      name="desiredStartDate"
                      value={form.desiredStartDate}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                    />
                  </div>
                  {form.profile === 'famille' && (
                    <div>
                      <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nombre d'enfants à inscrire
                      </label>
                      <input
                        type="number"
                        name="childrenCount"
                        min="1"
                        max="20"
                        value={form.childrenCount}
                        onChange={handleChange}
                        placeholder="1"
                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="mb-5">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    minLength={10}
                    rows={4}
                    placeholder="Décrivez votre besoin, le niveau scolaire, vos disponibilités…"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors resize-none"
                  />
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
                    'Envoyer ma demande →'
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
