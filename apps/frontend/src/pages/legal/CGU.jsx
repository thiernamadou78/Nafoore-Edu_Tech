import { Link } from 'react-router-dom'
import { COMPANY, TERMS_UPDATED_AT } from '../../lib/legal'
import { LegalPage, Section } from './LegalPage'

export default function CGU() {
  return (
    <LegalPage title="Conditions générales d’utilisation" updatedAt={TERMS_UPDATED_AT} current="/cgu">
      <Section title="1. Objet">
        <p>
          Les présentes conditions générales d’utilisation (« CGU ») encadrent l’accès et l’utilisation
          de la plateforme {COMPANY.name} : le site {COMPANY.website}, l’espace famille, l’espace
          enseignant et les services associés (planning des séances, Pass Éducatif, comptes-rendus,
          suivi de la progression, messagerie).
        </p>
        <p>
          Les conditions financières des accompagnements (tarifs, facturation, paiement) relèvent des
          conditions particulières ou générales de vente communiquées à la famille ou au client
          professionnel.
        </p>
      </Section>

      <Section title="2. Définitions">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Famille</strong> : le parent ou représentant légal titulaire d’un compte famille.</li>
          <li><strong>Élève</strong> : l’enfant accompagné, rattaché au compte de sa famille.</li>
          <li><strong>Enseignant</strong> : l’intervenant sélectionné par {COMPANY.name} qui assure les séances.</li>
          <li><strong>Séance</strong> : un cours planifié entre un enseignant et un élève.</li>
          <li><strong>Pass Éducatif</strong> : le QR code personnel de l’élève, présenté à l’enseignant en début et en fin de séance.</li>
        </ul>
      </Section>

      <Section title="3. Accès et compte">
        <p>
          Les comptes famille et enseignant sont créés par {COMPANY.name} après étude de la demande
          ou de la candidature. Les identifiants sont envoyés par email ; le mot de passe provisoire
          doit être changé à la première connexion.
        </p>
        <p>
          L’utilisateur est responsable de la confidentialité de ses identifiants et de l’exactitude
          des informations qu’il fournit. Toute utilisation suspecte doit être signalée sans délai à{' '}
          <a href={`mailto:${COMPANY.email}`} className="text-navy underline">{COMPANY.email}</a>.
        </p>
        <p>
          La famille agit pour le compte de l’élève mineur en qualité de titulaire de l’autorité
          parentale ; elle garantit être habilitée à inscrire l’enfant et à communiquer ses informations.
        </p>
      </Section>

      <Section title="4. Rôle de Nafoore Education">
        <p>
          {COMPANY.name} sélectionne les enseignants (vérification de l’identité, des diplômes et du
          bulletin n° 3 du casier judiciaire), les propose aux familles selon la matière, le niveau et
          la localisation, organise le planning et assure le suivi pédagogique de l’accompagnement.
        </p>
      </Section>

      <Section title="5. Déroulement des séances">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            L’enseignant enregistre son arrivée et son départ en scannant le Pass Éducatif de l’élève
            (ou, à défaut, par pointage manuel). Ces horaires servent au décompte des heures réalisées.
          </li>
          <li>
            Après chaque séance, l’enseignant rédige un compte-rendu (notions abordées, compréhension,
            participation, travail recommandé), consultable par la famille.
          </li>
          <li>
            Pour mesurer la progression, l’enseignant peut relever les notes de l’élève, notamment
            depuis son compte Pronote, avec l’accord de l’élève ou de sa famille.
          </li>
        </ul>
      </Section>

      <Section title="6. Décalage et annulation d’une séance">
        <p>
          La famille comme l’enseignant peuvent décaler ou annuler une séance depuis leur espace, en
          indiquant un motif. Les personnes concernées (famille, enseignant, équipe {COMPANY.name}) en
          sont informées par email.
        </p>
        <p>
          Toute annulation ou demande de décalage doit intervenir <strong>au moins 3 heures avant le
          début de la séance</strong>. En deçà, la demande reste possible mais est signalée comme
          tardive ; ses conséquences éventuelles sont prévues par les conditions de vente.
        </p>
      </Section>

      <Section title="7. Engagements des utilisateurs">
        <p>Les utilisateurs s’engagent à :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>utiliser la plateforme conformément à sa finalité et aux lois en vigueur ;</li>
          <li>adopter un comportement respectueux dans les échanges (messagerie, comptes-rendus, avis) ;</li>
          <li>
            pour les enseignants : respecter la confidentialité des informations relatives aux élèves et
            aux familles, qui ne peuvent être utilisées qu’aux fins de l’accompagnement, et fournir des
            documents authentiques ;
          </li>
          <li>ne pas tenter de porter atteinte à la sécurité ou au fonctionnement de la plateforme.</li>
        </ul>
      </Section>

      <Section title="8. Avis sur les enseignants">
        <p>
          Après quelques séances, la famille peut noter l’enseignant et laisser un commentaire. L’avis
          doit être sincère, lié à l’accompagnement et exempt de propos injurieux, diffamatoires ou
          discriminatoires. Il est transmis à l’équipe {COMPANY.name} et à l’enseignant concerné.{' '}
          {COMPANY.name} peut retirer un avis ne respectant pas ces règles.
        </p>
      </Section>

      <Section title="9. Disponibilité et responsabilité">
        <p>
          {COMPANY.name} met en œuvre les moyens raisonnables pour assurer l’accès à la plateforme,
          sans garantir une disponibilité permanente (maintenance, incidents techniques, réseau). Sa
          responsabilité ne saurait être engagée en cas d’utilisation non conforme aux présentes CGU.
        </p>
      </Section>

      <Section title="10. Suspension et fermeture du compte">
        <p>
          En cas de manquement aux présentes CGU, {COMPANY.name} peut suspendre ou fermer un compte
          après en avoir informé l’utilisateur, sauf urgence (sécurité, protection d’un élève). La
          famille ou l’enseignant peut demander la fermeture de son compte à tout moment à{' '}
          <a href={`mailto:${COMPANY.email}`} className="text-navy underline">{COMPANY.email}</a>.
        </p>
      </Section>

      <Section title="11. Données personnelles">
        <p>
          Les données sont traitées conformément à la{' '}
          <Link to="/confidentialite" className="text-navy underline">politique de confidentialité</Link>.
        </p>
      </Section>

      <Section title="12. Modification des CGU">
        <p>
          {COMPANY.name} peut faire évoluer les présentes CGU. La nouvelle version est présentée à
          chaque utilisateur lors de sa connexion suivante et doit être acceptée pour continuer à
          utiliser son espace.
        </p>
      </Section>

      <Section title="13. Droit applicable et litiges">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de difficulté, l’utilisateur est
          invité à contacter d’abord {COMPANY.name} afin de rechercher une solution amiable. Le
          consommateur peut également recourir gratuitement à un médiateur de la consommation, dont les
          coordonnées figurent dans les conditions de vente. À défaut d’accord, les tribunaux
          compétents sont ceux désignés par la loi.
        </p>
      </Section>
    </LegalPage>
  )
}
