-- Nouveau statut "pas_commence" : evite d'afficher "En progres" par defaut
-- pour un eleve qui n'a jamais eu de seance realisee.

ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS progress_entries_status_check;

ALTER TABLE progress_entries ADD CONSTRAINT progress_entries_status_check
  CHECK (status IN ('acquis', 'en_progres', 'a_surveiller', 'pas_commence'));
