-- Ajoute le profil "Centre de formation / École pro" (traitement identique
-- pour les écoles professionnelles et les centres de formation, un seul type)
-- à la contrainte CHECK sur leads.profile

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_profile_check;

ALTER TABLE leads ADD CONSTRAINT leads_profile_check
  CHECK (profile IN (
    'famille',
    'mairie',
    'entreprise',
    'centre_formation_ecole_pro'
  ));
