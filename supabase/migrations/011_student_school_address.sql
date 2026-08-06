-- École et adresse de l'élève — nécessaires pour personnaliser l'affichage
-- dans l'espace famille (portail parent)

ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
