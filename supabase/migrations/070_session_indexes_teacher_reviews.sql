-- 1) Index des seances : scan QR, rappels (cron chaque minute), plannings et
-- fiches eleve filtrent tous par eleve / prof / statut + date.
CREATE INDEX IF NOT EXISTS sessions_student_date_idx ON sessions(student_id, date);
CREATE INDEX IF NOT EXISTS sessions_teacher_date_idx ON sessions(teacher_id, date);
CREATE INDEX IF NOT EXISTS sessions_status_date_idx ON sessions(status, date);

-- 2) Avis des familles sur les enseignants (table creee en 019, jamais
-- alimentee jusqu'ici) : rattachement a l'eleve, un avis par couple
-- eleve/prof, modifiable par la famille.
ALTER TABLE teacher_reviews ADD COLUMN IF NOT EXISTS student_id TEXT REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE teacher_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS teacher_reviews_student_teacher_key ON teacher_reviews(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS teacher_reviews_teacher_idx ON teacher_reviews(teacher_id);
