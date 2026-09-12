-- Remplace le service unique par une liste de services -- une famille peut
-- avoir plusieurs enfants avec des besoins differents (ex: soutien scolaire
-- pour l'un, preparation Bac pour l'autre).

ALTER TABLE leads DROP COLUMN IF EXISTS service;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS services TEXT[] NOT NULL DEFAULT '{}';
