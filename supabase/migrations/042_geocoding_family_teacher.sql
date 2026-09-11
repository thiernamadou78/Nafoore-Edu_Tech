-- Coordonnees geocodees (best-effort, via OpenStreetMap Nominatim) a partir
-- de l'adresse texte des familles (leads) et des enseignants -- alimentent la
-- carte du tableau de bord admin.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
