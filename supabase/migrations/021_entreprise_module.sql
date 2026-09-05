-- Module Entreprise — Pass Éducatif (Phase 1 : fondations)
-- Entreprises, catalogue de Formules, contrats + avenants, comptes RH.
-- Import des bénéficiaires, funding_links, Pass QR/pointage : migrations à venir.

CREATE TABLE IF NOT EXISTS enterprises (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  raison_sociale       TEXT NOT NULL,
  siret                TEXT UNIQUE,
  secteur_activite     TEXT,
  email_domain         TEXT,
  adresse_facturation  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formulas (
  id                                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom                               TEXT NOT NULL,
  budget_credit_default             DOUBLE PRECISION NOT NULL,
  unite_credit                      TEXT NOT NULL CHECK (unite_credit IN ('euros', 'heures')),
  plafond_beneficiaires_par_employe INTEGER,
  matieres_eligibles                TEXT[] NOT NULL DEFAULT '{}',
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprise_contracts (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enterprise_id          TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  formula_id             TEXT NOT NULL REFERENCES formulas(id) ON DELETE RESTRICT,
  budget_credit_override DOUBLE PRECISION,
  date_debut             TIMESTAMPTZ NOT NULL,
  date_expiration        TIMESTAMPTZ NOT NULL,
  statut                 TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN (
    'brouillon', 'actif', 'expire', 'renouvele', 'resilie'
  )),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enterprise_contracts_enterprise_id_idx ON enterprise_contracts(enterprise_id);

CREATE TABLE IF NOT EXISTS contract_amendments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contract_id     TEXT NOT NULL REFERENCES enterprise_contracts(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
    'montant_revise', 'formule_changee', 'duree_prolongee'
  )),
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  date_effet      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS contract_amendments_contract_id_idx ON contract_amendments(contract_id);

-- rh_accounts.id = auth.users.id (Supabase Auth) — même convention que
-- portal_accounts / teacher_accounts (voir migrations 010, 003). Pas de FK
-- Postgres vers auth.users(id) pour la même raison (TEXT vs UUID).
CREATE TABLE IF NOT EXISTS rh_accounts (
  id                   TEXT PRIMARY KEY,
  email                TEXT NOT NULL UNIQUE,
  full_name            TEXT NOT NULL,
  enterprise_id        TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL DEFAULT 'owner' CHECK (role IN (
    'owner', 'assistant', 'lecture_seule'
  )),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  status               TEXT NOT NULL DEFAULT 'invite' CHECK (status IN (
    'invite', 'actif', 'suspendu'
  )),
  invited_by_admin     TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rh_accounts_enterprise_id_idx ON rh_accounts(enterprise_id);

CREATE TABLE IF NOT EXISTS rh_credential_dispatch_logs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rh_account_id     TEXT NOT NULL REFERENCES rh_accounts(id) ON DELETE CASCADE,
  sent_by           TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status   TEXT NOT NULL CHECK (delivery_status IN ('envoye', 'echec')),
  email_provider_id TEXT
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que teacher_requests / matchings : le backend (service_role
-- via DATABASE_URL/Prisma) est la seule voie d'accès. Deny-by-default,
-- aucune policy publique.

ALTER TABLE enterprises                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulas                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_amendments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_accounts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_credential_dispatch_logs  ENABLE ROW LEVEL SECURITY;
