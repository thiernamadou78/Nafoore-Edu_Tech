-- Migration Super Admin (2/2) — pipeline de candidatures enseignants
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push

CREATE TABLE IF NOT EXISTS teacher_applications (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_candidate_name  TEXT NOT NULL,
  teacher_candidate_email TEXT NOT NULL,
  subjects                TEXT[] NOT NULL DEFAULT '{}',
  zone                    TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'preselection' CHECK (status IN (
    'preselection',
    'entretien_planifie',
    'entretien_realise',
    'valide',
    'refuse',
    'documents_requis'
  )),
  interview_date          TIMESTAMPTZ,
  interview_notes         TEXT,
  reviewed_by             TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  decided_at              TIMESTAMPTZ,
  created_teacher_id      TEXT UNIQUE REFERENCES teachers(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Comme pour les tables RBAC (002), le backend NestJS est la voie d'accès
-- primaire. Deny-by-default ici : aucune policy, donc ni lecture ni écriture
-- via la clé anon/authenticated — uniquement via la connexion directe backend.

ALTER TABLE teacher_applications ENABLE ROW LEVEL SECURITY;
