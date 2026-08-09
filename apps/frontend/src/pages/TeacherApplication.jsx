import { useState } from 'react'

const LEVELS = [
  { value: 'college', label: 'Collège' },
  { value: 'lycee', label: 'Lycée' },
]

const BENEFITS = [
  { icon: '💰', text: 'Rémunération attractive' },
  { icon: '🗓️', text: 'Horaires flexibles' },
  { icon: '📍', text: 'Présentiel ou distanciel' },
  { icon: '🤝', text: 'Accompagnement dédié' },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const DEFAULT_FORM = {
  candidateName: '',
  candidateEmail: '',
  phone: '',
  subjects: '',
  levels: [],
  zone: '',
  availability: '',
}

export default function TeacherApplication() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [diplomas, setDiplomas] = useState([])
  const [criminalRecord, setCriminalRecord] = useState(null)
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const toggleLevel = (value) => {
    setForm((f) => ({
      ...f,
      levels: f.levels.includes(value)
        ? f.levels.filter((l) => l !== value)
        : [...f.levels, value],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('candidateName', form.candidateName)
      formData.append('candidateEmail', form.candidateEmail)
      formData.append('phone', form.phone)
      formData.append('subjects', form.subjects)
      formData.append('levels', form.levels.join(','))
      formData.append('zone', form.zone)
      formData.append('availability', form.availability)
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
              Rejoins le réseau <span className="text-gold-400">Nafoore</span>
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

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Matières enseignées <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="subjects"
                      value={form.subjects}
                      onChange={handleChange}
                      required
                      placeholder="Mathématiques, Physique-Chimie"
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Zone d'intervention <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="zone"
                      value={form.zone}
                      onChange={handleChange}
                      required
                      placeholder="Dakar, Sacré-Cœur"
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Niveaux
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
                </div>

                <div className="mb-4">
                  <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Disponibilités
                  </label>
                  <textarea
                    name="availability"
                    value={form.availability}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Mercredi après-midi, samedi toute la journée…"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Diplômes (PDF, JPG, PNG)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDiplomas(Array.from(e.target.files ?? []))}
                      className="w-full font-sans text-xs text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Casier judiciaire (B3)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCriminalRecord(e.target.files?.[0] ?? null)}
                      className="w-full font-sans text-xs text-gray-500"
                    />
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
