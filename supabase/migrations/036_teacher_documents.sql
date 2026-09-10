-- Documents administratifs d'un enseignant (diplome, casier judiciaire...),
-- uploades par l'admin lors de la creation directe d'un compte enseignant
-- (miroir de student_documents).

CREATE TABLE IF NOT EXISTS teacher_documents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id    TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  uploaded_by   TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_documents_teacher_id_idx ON teacher_documents(teacher_id);

ALTER TABLE teacher_documents ENABLE ROW LEVEL SECURITY;
