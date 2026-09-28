import { COMPANY, TERMS_UPDATED_AT } from '../../lib/legal'
import { LegalPage, Section } from './LegalPage'

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 align-top">
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2 ${i === 0 ? 'font-medium text-gray-900' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Confidentialite() {
  const mail = (
    <a href={`mailto:${COMPANY.email}`} className="text-navy underline">{COMPANY.email}</a>
  )
  return (
    <LegalPage title="Politique de confidentialité" updatedAt={TERMS_UPDATED_AT} current="/confidentialite">
      <Section title="1. Responsable du traitement">
        <p>
          Les données personnelles sont traitées par <strong>{COMPANY.name}</strong>, {COMPANY.legalForm},
          SIREN {COMPANY.siren}, dont le siège est situé {COMPANY.address}. Pour toute question relative à
          vos données : {mail}.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <Table
          head={['Personnes concernées', 'Données']}
          rows={[
            ['Visiteurs (formulaire de contact)', 'Identité, email, téléphone, adresse, services souhaités, message, date de début souhaitée.'],
            ['Familles (parents)', 'Identité, coordonnées, adresse, identifiants de connexion, messages, avis sur les enseignants.'],
            ['Élèves (mineurs)', 'Nom, genre, date de naissance, niveau, classe, établissement, adresse, photo (facultative), matières, planning, comptes-rendus de séance, notes relevées, horaires de présence (Pass Éducatif).'],
            ['Candidats et enseignants', 'Identité, coordonnées, adresse, matières, niveaux, disponibilités, présentation, photo, CV, pièce d’identité, diplômes, bulletin n° 3 du casier judiciaire, séances, pointages, avis reçus.'],
            ['Tous les utilisateurs connectés', 'Données techniques nécessaires à la connexion et à la sécurité (session, journal des consultations de documents).'],
          ]}
        />
        <p>
          Les données des élèves sont communiquées par leur famille, qui agit en qualité de titulaire de
          l’autorité parentale. Seules les informations utiles à l’accompagnement sont demandées.
        </p>
      </Section>

      <Section title="3. Finalités et bases légales">
        <Table
          head={['Finalité', 'Base légale']}
          rows={[
            ['Répondre aux demandes de contact et aux candidatures', 'Mesures précontractuelles'],
            ['Créer et gérer les comptes, organiser les séances, le planning et le suivi pédagogique', 'Exécution du contrat'],
            ['Proposer un enseignant adapté (matière, niveau, proximité géographique)', 'Exécution du contrat'],
            ['Vérifier l’honorabilité des enseignants intervenant auprès de mineurs (casier judiciaire)', 'Intérêt légitime et protection des mineurs'],
            ['Décompter les heures réalisées (pointage) et établir la facturation', 'Exécution du contrat et obligations légales'],
            ['Envoyer les notifications liées au service (emails, rappels)', 'Exécution du contrat'],
            ['Recueillir les avis des familles pour garantir la qualité', 'Intérêt légitime'],
            ['Assurer la sécurité de la plateforme et tracer l’accès aux documents sensibles', 'Intérêt légitime'],
          ]}
        />
        <p>Aucune donnée n’est vendue, ni utilisée à des fins publicitaires.</p>
      </Section>

      <Section title="4. Destinataires">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>L’équipe {COMPANY.name}</strong> et, pour leur secteur géographique, ses délégués :
            accès limité selon les droits de chacun.
          </li>
          <li>
            <strong>Les enseignants</strong> : avant toute affectation, seuls le niveau, la classe, la
            ville et le code postal de l’élève leur sont présentés. L’enseignant affecté accède ensuite au
            nom de l’élève, à son adresse et aux coordonnées de la famille, uniquement pour assurer
            l’accompagnement.
          </li>
          <li>
            <strong>Les familles</strong> : informations de l’enseignant utiles au suivi (nom, photo,
            présentation, comptes-rendus).
          </li>
          <li><strong>Nos prestataires techniques</strong>, qui agissent sur nos instructions (voir ci-dessous).</li>
        </ul>
      </Section>

      <Section title="5. Prestataires et transferts hors de l’Union européenne">
        <Table
          head={['Prestataire', 'Rôle', 'Localisation']}
          rows={[
            ['Supabase', 'Base de données, fichiers, authentification', 'Union européenne (Irlande)'],
            ['Render', 'Serveur applicatif', 'Prestataire américain'],
            ['Vercel', 'Hébergement des sites', 'Prestataire américain'],
            ['Resend', 'Envoi des emails', 'Prestataire américain'],
            ['OpenStreetMap (Nominatim)', 'Positionnement des adresses sur la carte', 'Royaume-Uni'],
          ]}
        />
        <p>
          Les transferts vers des prestataires situés hors de l’Union européenne sont encadrés par les
          garanties prévues par le RGPD (décision d’adéquation, notamment le Data Privacy Framework, ou
          clauses contractuelles types de la Commission européenne).
        </p>
      </Section>

      <Section title="6. Durées de conservation">
        <Table
          head={['Données', 'Durée']}
          rows={[
            ['Demande de contact sans suite', '3 ans après le dernier contact'],
            ['Compte famille, données de l’élève, séances et comptes-rendus', 'Pendant l’accompagnement, puis 3 ans après sa fin'],
            ['Pièces comptables et factures', '10 ans (obligation légale)'],
            ['Candidature non retenue', '2 ans après la décision'],
            ['Bulletin n° 3 du casier judiciaire', 'Le temps de la vérification ; seule la mention de la vérification est ensuite conservée'],
            ['Dossier d’un enseignant', 'Pendant la collaboration, puis 3 ans après son terme'],
            ['Journaux de sécurité et de consultation des documents', '1 an'],
          ]}
        />
      </Section>

      <Section title="7. Sécurité">
        <p>
          Les données sont chiffrées lors de leur transmission (HTTPS) et hébergées chez des prestataires
          reconnus. Les accès sont limités selon le rôle et le secteur de chaque membre de l’équipe. Les
          documents sensibles (pièce d’identité, casier judiciaire, diplômes) ne peuvent être que
          consultés à l’écran par l’équipe habilitée, sans téléchargement, et chaque consultation est
          enregistrée.
        </p>
      </Section>

      <Section title="8. Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et
          de portabilité de vos données, ainsi que du droit de définir des directives relatives à leur sort
          après votre décès. Pour un élève mineur, ces droits sont exercés par son représentant légal.
        </p>
        <p>
          Pour les exercer, écrivez à {mail} en précisant votre demande ; une réponse vous est apportée
          dans un délai d’un mois. Vous pouvez également introduire une réclamation auprès de la CNIL
          (www.cnil.fr).
        </p>
      </Section>

      <Section title="9. Cookies">
        <p>
          La plateforme n’utilise ni cookie publicitaire ni outil de mesure d’audience. Seuls des éléments
          strictement nécessaires au fonctionnement sont déposés sur votre appareil (maintien de la
          connexion à votre espace, préférences d’affichage) ; ils ne nécessitent pas de consentement.
        </p>
      </Section>

      <Section title="10. Évolution de cette politique">
        <p>
          Cette politique peut être mise à jour pour refléter l’évolution de la plateforme ou de la
          réglementation. La date de dernière mise à jour figure en haut de cette page.
        </p>
      </Section>
    </LegalPage>
  )
}
