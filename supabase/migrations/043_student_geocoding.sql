-- Coordonnees geocodees (best-effort, via OpenStreetMap Nominatim) a partir
-- de l'adresse texte de l'eleve -- la carte du tableau de bord admin affiche
-- desormais un pin par eleve plutot que par famille (une famille peut avoir
-- plusieurs enfants a des adresses potentiellement differentes).

ALTER TABLE students ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
