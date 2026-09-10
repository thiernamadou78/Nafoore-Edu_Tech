-- Un prof peut enseigner plusieurs matieres a un meme eleve (ex: Maths ET
-- Physique-Chimie), chacune avec son propre planning recurrent independant.
-- On passe donc la cle d'unicite de (eleve, prof) a (eleve, prof, matiere).

DROP INDEX IF EXISTS recurring_schedules_student_id_teacher_id_key;

ALTER TABLE recurring_schedules ALTER COLUMN subject SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recurring_schedules_student_id_teacher_id_subject_key
  ON recurring_schedules (student_id, teacher_id, subject);
