-- Matière sur les séances (pour affichage "prochaine séance" côté famille)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS subject TEXT;

-- Suivi qualitatif de progression par matière (remplace, côté portail famille,
-- l'affichage des bilans texte libre : un statut par matière, mis à jour par l'admin)
CREATE TABLE IF NOT EXISTS progress_entries (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  student_id        TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('acquis', 'en_progres', 'a_surveiller')),
  admin_account_id  TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  UNIQUE (student_id, subject)
);

CREATE INDEX IF NOT EXISTS progress_entries_student_id_idx ON progress_entries(student_id);

ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
