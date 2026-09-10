-- Adresse precise du prof (important pour les cours en presentiel), affichee
-- a la famille lors d'une proposition de matching.

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS address TEXT;
