// Case obligatoire des formulaires publics (contact, candidature) : la
// personne est informee de l'usage de ses donnees avant l'envoi. Le lien
// s'ouvre dans un nouvel onglet pour ne pas perdre le formulaire en cours.
export default function PrivacyConsent({ purpose }) {
  return (
    <label className="mb-4 flex items-start gap-2.5 font-sans text-xs leading-relaxed text-gray-500">
      <input
        type="checkbox"
        required
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-navy focus:ring-navy"
      />
      <span>
        J’accepte que Nafoore Education utilise les informations de ce formulaire pour {purpose},
        conformément à sa{' '}
        <a href="/confidentialite" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">
          politique de confidentialité
        </a>
        . Je peux exercer mes droits à tout moment en écrivant à direction@nafoore.com.
      </span>
    </label>
  )
}
