-- Migration Super Admin — Gestion des élèves
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push
--
-- Étape manuelle complémentaire (hors SQL) : créer un bucket Supabase
-- Storage privé nommé "student-documents" (voir apps/admin/README.md).

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS subjects TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objectives TEXT;

CREATE TABLE IF NOT EXISTS student_teachers (
  student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id  TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  date       TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL DEFAULT 'planifiee' CHECK (status IN (
    'planifiee', 'confirmee', 'realisee', 'annulee', 'reportee'
  )),
  attended   BOOLEAN,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress_reports (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id        TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  admin_account_id  TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  period            TEXT,
  content           TEXT NOT NULL,
  shareable         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_documents (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  uploaded_by  TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('bulletin', 'compte_rendu', 'autre')),
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que les migrations précédentes : le backend NestJS
-- (connexion directe) est la voie d'accès primaire. Deny-by-default ici.

ALTER TABLE student_teachers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents  ENABLE ROW LEVEL SECURITY;
