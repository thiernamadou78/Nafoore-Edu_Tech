-- Module Entreprise — Pass QR / pointage (Phase 3)
-- Une ligne attendance_logs couvre un cycle checkin→checkout (pas un scan) :
-- le 1er scan valide crée la ligne, le 2e la complète. Tous les élèves ont
-- un pass (pas seulement ceux financés entreprise/mairie).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE students ADD COLUMN qr_token TEXT;
ALTER TABLE students ADD COLUMN pass_status TEXT NOT NULL DEFAULT 'active' CHECK (
  pass_status IN ('active', 'revoked')
);

-- Backfill des lignes existantes (token URL-safe, encodage base64 standard
-- suffisant car le token n'est jamais lu comme une URL, seulement affiché
-- en QR et comparé tel quel côté backend).
UPDATE students SET qr_token = encode(gen_random_bytes(24), 'base64') WHERE qr_token IS NULL;

ALTER TABLE students ALTER COLUMN qr_token SET NOT NULL;
ALTER TABLE students ADD CONSTRAINT students_qr_token_key UNIQUE (qr_token);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id          TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  student_id          TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id          TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  checkin_at          TIMESTAMPTZ,
  checkout_at         TIMESTAMPTZ,
  verification_status TEXT NOT NULL CHECK (verification_status IN (
    'valid', 'funding_expired', 'pass_revoked', 'no_session_found'
  )),
  method              TEXT NOT NULL CHECK (method IN ('qr_scan', 'manuel')),
  manual_reason       TEXT CHECK (manual_reason IN ('qr_oublie', 'probleme_technique', 'autre')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_logs_student_id_idx ON attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS attendance_logs_session_id_idx ON attendance_logs(session_id);
CREATE INDEX IF NOT EXISTS attendance_logs_teacher_id_idx ON attendance_logs(teacher_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que les migrations précédentes du module Entreprise : le
-- backend (service_role via DATABASE_URL/Prisma) est la seule voie d'accès.
-- Deny-by-default, aucune policy publique.

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
