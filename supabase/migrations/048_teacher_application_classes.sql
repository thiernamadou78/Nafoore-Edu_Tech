-- Classes precises enseignees par le candidat (ex: cm2, 6e, 1re), en plus
-- des niveaux generaux (primaire/college/lycee) deja stockes.

ALTER TABLE teacher_applications ADD COLUMN IF NOT EXISTS classes TEXT[] NOT NULL DEFAULT '{}';
