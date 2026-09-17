-- Code postal, en complement de l'adresse texte, pour ameliorer la precision
-- du geocodage (carte du tableau de bord admin).

ALTER TABLE leads ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Obligatoire sur le formulaire public de candidature enseignant : on ajoute
-- la colonne nullable d'abord (candidatures existantes), on comble avec une
-- valeur par defaut, puis on verrouille en NOT NULL pour les nouvelles lignes.
ALTER TABLE teacher_applications ADD COLUMN IF NOT EXISTS postal_code TEXT;
UPDATE teacher_applications SET postal_code = '00000' WHERE postal_code IS NULL;
ALTER TABLE teacher_applications ALTER COLUMN postal_code SET NOT NULL;
