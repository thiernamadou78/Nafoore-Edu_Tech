import { Link } from 'react-router-dom'
import { COMPANY, HOSTS } from '../../lib/legal'
import { LegalPage, Section } from './LegalPage'

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales" current="/mentions-legales">
      <Section title="Éditeur du site">
        <p>
          Le site {COMPANY.website} et les espaces en ligne associés (espace famille, espace enseignant,
          administration) sont édités par :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>{COMPANY.name}</strong>, {COMPANY.legalForm} au capital de {COMPANY.capital}
          </li>
          <li>SIREN : {COMPANY.siren} — {COMPANY.rcs}</li>
          <li>Siège social : {COMPANY.address}</li>
          <li>
            Email : <a href={`mailto:${COMPANY.email}`} className="text-navy underline">{COMPANY.email}</a>
            {' '}— Téléphone : {COMPANY.phone}
          </li>
          <li>Directeur de la publication : {COMPANY.publicationDirector}</li>
        </ul>
      </Section>

      <Section title="Hébergement">
        <ul className="space-y-3">
          {HOSTS.map((host) => (
            <li key={host.name}>
              <strong>{host.role}</strong> : {host.name}, {host.address} —{' '}
              <a href={host.url} target="_blank" rel="noreferrer" className="text-navy underline">
                {host.url.replace('https://', '')}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L’ensemble des éléments du site (textes, logo, charte graphique, illustrations, logiciels)
          est la propriété de {COMPANY.name} ou fait l’objet d’une autorisation d’utilisation. Toute
          reproduction, représentation ou adaptation, totale ou partielle, sans autorisation écrite
          préalable est interdite.
        </p>
      </Section>

      <Section title="Responsabilité">
        <p>
          {COMPANY.name} s’efforce d’assurer l’exactitude des informations publiées et la
          disponibilité du site, sans pouvoir garantir l’absence d’erreur ou d’interruption. Les liens
          vers des sites tiers sont fournis à titre indicatif ; {COMPANY.name} n’est pas responsable de
          leur contenu.
        </p>
      </Section>

      <Section title="Données personnelles et cookies">
        <p>
          Le traitement des données personnelles est décrit dans la{' '}
          <Link to="/confidentialite" className="text-navy underline">politique de confidentialité</Link>.
          Le site n’utilise aucun cookie publicitaire ni outil de mesure d’audience : seuls les éléments
          strictement nécessaires à la connexion aux espaces sécurisés sont utilisés.
        </p>
      </Section>
    </LegalPage>
  )
}
