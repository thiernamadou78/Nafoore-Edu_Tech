-- Domaines professionnels proposes par les candidats enseignants depuis le
-- formulaire de candidature : utilisables tout de suite par le candidat,
-- mais masques des listes tant que le Super Admin ne les a pas valides.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS suggested BOOLEAN NOT NULL DEFAULT false;
