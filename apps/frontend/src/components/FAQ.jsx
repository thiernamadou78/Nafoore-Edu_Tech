import { useState } from 'react'

const ITEMS = [
  {
    q: 'Comment inscrire mon enfant ?',
    a: 'Remplissez le formulaire de contact en choisissant le profil "Famille". Notre équipe vous recontacte sous 24h ouvrées pour un bilan gratuit de 30 min afin d\'identifier les besoins de votre enfant et vous proposer la formule adaptée.',
  },
  {
    q: 'Quels niveaux scolaires prenez-vous en charge ?',
    a: 'Du CP à la Terminale (toutes filières), ainsi que les classes préparatoires. Nous couvrons toutes les matières : maths, français, langues vivantes, sciences, histoire-géographie et plus encore.',
  },
  {
    q: 'Les cours se déroulent en présentiel ou en ligne ?',
    a: 'Les deux, selon vos préférences. En présentiel au domicile de l\'élève ou dans nos espaces partenaires, ou en visioconférence sur notre plateforme sécurisée avec tableau blanc interactif.',
  },
  {
    q: 'Quels sont les tarifs ?',
    a: 'À partir de 25 €/h pour les cours particuliers. Des formules mensuelles offrent des tarifs réduits. Des tarifs solidaires sont disponibles pour les familles éligibles aux aides sociales. Contactez-nous pour un devis personnalisé gratuit.',
  },
  {
    q: 'Y a-t-il un engagement de durée ?',
    a: 'Non. Nafoore fonctionne sans engagement : vous pouvez arrêter avec un simple préavis de 15 jours. Nous croyons que la fidélité se gagne par la qualité, pas par les contrats.',
  },
  {
    q: 'Comment sont sélectionnés les enseignants ?',
    a: 'Processus rigoureux en 4 étapes : vérification des diplômes, entretien pédagogique, contrôle du casier judiciaire B3, puis période d\'essai évaluée. Moins de 20 % des candidats rejoignent notre réseau.',
  },
]

function Item({ q, a, index }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${open ? 'border-navy/20 shadow-md shadow-navy/5' : 'border-gray-100'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left px-6 py-5 bg-white hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex items-center gap-4 pr-4">
          <span className="font-serif text-sm font-bold text-gold-500 flex-shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-sans font-semibold text-navy text-sm">{q}</span>
        </div>
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            open ? 'bg-navy border-navy' : 'border-gray-200'
          }`}
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-45 text-white' : 'text-navy'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 bg-white">
          <div className="ml-10 font-sans text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-4">
            {a}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        {/* En-tête */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gold-400/15 text-gold-600 font-sans text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1 h-1 bg-gold-500 rounded-full" />
            Questions fréquentes
          </div>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-navy mb-4">
            Tout ce que vous voulez savoir
          </h2>
          <p className="font-sans text-gray-500">
            Une autre question ?{' '}
            <a href="#contact" className="text-navy font-bold hover:text-gold-500 underline underline-offset-2 transition-colors">
              Écrivez-nous directement.
            </a>
          </p>
        </div>

        <div className="space-y-2.5">
          {ITEMS.map((item, i) => (
            <Item key={item.q} {...item} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
