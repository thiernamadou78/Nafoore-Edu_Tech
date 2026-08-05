-- Migration Super Admin — Fiche enseignant complète + historique d'affectation
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS student_teacher_history (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id        TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id        TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  action            TEXT NOT NULL CHECK (action IN ('assigned', 'unassigned')),
  admin_account_id  TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que les migrations précédentes : le backend NestJS
-- (connexion directe) est la voie d'accès primaire. Deny-by-default ici.

ALTER TABLE student_teacher_history ENABLE ROW LEVEL SECURITY;
