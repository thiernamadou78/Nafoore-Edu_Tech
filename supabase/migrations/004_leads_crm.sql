-- Migration Super Admin — Leads/CRM
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push

-- Normalise le statut par défaut en français (aligné sur le pipeline du CRM)
UPDATE leads SET status = 'nouveau' WHERE status = 'new';

ALTER TABLE leads
  ALTER COLUMN status SET DEFAULT 'nouveau',
  ADD COLUMN IF NOT EXISTS assigned_to TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('nouveau', 'contacte', 'qualifie', 'converti', 'perdu'));

CREATE TABLE IF NOT EXISTS lead_notes (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id           TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  admin_account_id  TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  note              TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que teacher_applications (003) : le backend NestJS
-- (connexion directe) est la voie d'accès primaire. Deny-by-default ici.

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
