-- Onboarding lead → compte portail (famille / mairie / entreprise / centre_formation_ecole_pro)
-- Remplace les statuts de lead et ajoute les tables portal_accounts / credential_dispatch_logs

-- ─────────────────────────────────────────────
-- 1. Migrer les données AVANT de toucher la contrainte
-- ─────────────────────────────────────────────

UPDATE leads SET status = 'valide' WHERE status = 'qualifie';
UPDATE leads SET status = 'rejete' WHERE status = 'perdu';

-- ─────────────────────────────────────────────
-- 2. Remplacer la contrainte CHECK sur status
-- ─────────────────────────────────────────────

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('nouveau', 'contacte', 'en_verification', 'valide', 'converti', 'rejete'));

-- ─────────────────────────────────────────────
-- 3. Nouvelles colonnes sur leads
-- ─────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS organization_name TEXT,
  ADD COLUMN IF NOT EXISTS converted_by TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- 4. portal_accounts — comptes des 4 portails externes (famille/école/entreprise/mairie)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_accounts (
  id                    TEXT PRIMARY KEY, -- = auth.users.id, fourni explicitement (pas de default)
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT NOT NULL,
  role                  TEXT NOT NULL, -- famille | mairie | entreprise | centre_formation_ecole_pro
  must_change_password  BOOLEAN NOT NULL DEFAULT true,
  status                TEXT NOT NULL DEFAULT 'invite', -- invite | actif | suspendu
  lead_id               TEXT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE portal_accounts ENABLE ROW LEVEL SECURITY;
-- Deny-by-default, même principe que admin_accounts : le backend (service_role) est la seule voie d'accès.

-- ─────────────────────────────────────────────
-- 5. credential_dispatch_logs — traçabilité des envois d'identifiants
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credential_dispatch_logs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id           TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  portal_account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  sent_by           TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status   TEXT NOT NULL, -- envoye | echec
  email_provider_id TEXT
);

ALTER TABLE credential_dispatch_logs ENABLE ROW LEVEL SECURITY;
