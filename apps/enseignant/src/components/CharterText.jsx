// Charte de confidentialite de l'enseignant : texte complet, visible
// uniquement dans l'espace enseignant (ecran d'acceptation et profil), pas
// sur le site public. Toute modification de fond doit s'accompagner d'une
// nouvelle CHARTER_VERSION cote backend (apps/backend/src/common/legal.ts)
// pour redemander l'acceptation.
export const CHARTER_UPDATED_AT = '28 septembre 2026'

function Section({ title, children }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 text-sm font-semibold text-navy">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function CharterText() {
  return (
    <div className="text-sm leading-relaxed text-gray-700">
      <Section title="1. Objet">
        <p>
          Dans le cadre de ses interventions, l’enseignant accède à des informations personnelles sur des
          élèves, le plus souvent mineurs, et sur leurs familles. La présente charte précise les règles qu’il
          s’engage à respecter pour les protéger. Elle complète les conditions générales d’utilisation et la
          politique de confidentialité de Nafoore Education.
        </p>
      </Section>
      <Section title="2. Informations concernées">
        <p>
          Nom, âge, classe, établissement, adresse et photo de l’élève ; coordonnées des parents ; planning ;
          comptes-rendus de séance ; notes et résultats scolaires ; plus généralement, toute information
          apprise à l’occasion de l’accompagnement, y compris sur la situation familiale.
        </p>
      </Section>
      <Section title="3. Engagements de l’enseignant">
        <p>L’enseignant s’engage à :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>utiliser ces informations uniquement pour l’accompagnement</strong> confié par Nafoore
            Education, et jamais à des fins personnelles ou commerciales ;
          </li>
          <li>
            <strong>ne les communiquer à personne</strong> en dehors de la famille concernée et de l’équipe
            Nafoore Education ;
          </li>
          <li>
            <strong>ne pas en conserver de copie hors de la plateforme</strong> (captures d’écran, photos de
            bulletins ou de copies, fichiers, listes de contacts) au-delà de ce qui est strictement nécessaire
            au cours ;
          </li>
          <li>
            <strong>ne prendre aucune photo ni vidéo de l’élève</strong> et ne rien publier le concernant,
            notamment sur les réseaux sociaux, sans l’accord écrit de ses parents ;
          </li>
          <li>
            pour le relevé des notes, <strong>consulter Pronote uniquement avec l’accord et en présence de
            l’élève ou de sa famille</strong>, et ne jamais enregistrer leurs identifiants de connexion ;
          </li>
          <li>
            <strong>protéger son accès à la plateforme</strong> : identifiants personnels non partagés,
            téléphone ou ordinateur verrouillé par un code, déconnexion sur un appareil partagé ;
          </li>
          <li>
            <strong>signaler sans délai</strong> à direction@nafoore.com toute perte ou vol d’appareil, tout
            accès suspect ou toute divulgation accidentelle d’informations ;
          </li>
          <li>
            <strong>supprimer, à la fin de la collaboration ou de l’accompagnement</strong>, toute information
            encore en sa possession (numéros de téléphone, messages, documents).
          </li>
        </ul>
      </Section>
      <Section title="4. Durée">
        <p>
          Ces engagements s’appliquent pendant toute la durée de la collaboration avec Nafoore Education et
          demeurent après sa fin, sans limitation de durée.
        </p>
      </Section>
      <Section title="5. Manquement">
        <p>
          Tout manquement à la présente charte peut entraîner la suspension immédiate de l’accès à la
          plateforme et la fin de la collaboration, sans préjudice des éventuelles poursuites prévues par la
          loi.
        </p>
      </Section>
      <Section title="6. Acceptation">
        <p>
          L’enseignant accepte la présente charte depuis son espace, lors de sa première connexion puis à
          chaque nouvelle version. La date et la version acceptées sont enregistrées.
        </p>
      </Section>
    </div>
  )
}
