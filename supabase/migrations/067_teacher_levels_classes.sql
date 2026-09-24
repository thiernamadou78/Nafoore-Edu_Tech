-- Niveaux et classes enseignes, portes par l'enseignant (avant : seulement
-- sur la candidature, perdus a la validation). Servent a l'affichage admin
-- et au matching demande <-> enseignant (une demande de Maths en 5e ne doit
-- pas etre proposee a un prof de Maths qui n'enseigne qu'en 6e).
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS levels  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS classes TEXT[] NOT NULL DEFAULT '{}';

-- Reprise depuis la candidature d'origine.
UPDATE teachers t
SET levels = a.levels, classes = a.classes
FROM teacher_applications a
WHERE a.created_teacher_id = t.id
  AND cardinality(t.levels) = 0
  AND cardinality(t.classes) = 0;
