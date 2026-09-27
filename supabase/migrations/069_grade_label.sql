-- Denomination d'une note (ex : "Note initiale", "Contrôle chapitre 3"),
-- obligatoire a la saisie cote prof. Nullable en base pour les notes deja
-- saisies ; les notes de depart existantes prennent "Note initiale".
ALTER TABLE grades ADD COLUMN IF NOT EXISTS label TEXT;

UPDATE grades SET label = 'Note initiale' WHERE kind = 'depart' AND label IS NULL;
