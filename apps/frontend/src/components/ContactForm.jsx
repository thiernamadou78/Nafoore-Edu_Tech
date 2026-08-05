import { useState } from 'react'

const PROFILES = [
  { value: 'famille', label: 'Famille', icon: '👨‍👩‍👧' },
  { value: 'mairie', label: 'Mairie', icon: '🏛️' },
  { value: 'entreprise', label: 'Entreprise / CSE', icon: '🏢' },
  { value: 'centre_formation_ecole_pro', label: 'Centre de formation / École pro', icon: '🎓' },
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
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : (data.message || 'Une erreur est survenue.')
        throw new Error(msg)
      }
      setStatus('success')
      setForm({ profile: 'famille', name: '', email: '', phone: '', message: '' })
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
                      Téléphone
                    </label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
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
