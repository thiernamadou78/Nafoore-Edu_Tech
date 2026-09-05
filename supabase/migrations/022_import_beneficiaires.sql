-- Module Entreprise — Import des bénéficiaires (Phase 2)
-- Un employee est identifié par (enterprise_id, email_pro) et réutilisé d'un
-- import à l'autre pour rattacher plusieurs enfants. Pas de compte Supabase
-- Auth pour l'employé ici (Portail Employé pas encore construit). Pas de
-- backfill de funding_links pour les élèves déjà financés par une famille.

ALTER TABLE students ADD COLUMN date_naissance TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS employees (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id   TEXT NOT NULL REFERENCES enterprise_contracts(id) ON DELETE RESTRICT,
  nom           TEXT NOT NULL,
  prenom        TEXT NOT NULL,
  email_pro     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending_invitation' CHECK (status IN (
    'pending_invitation', 'active', 'inactive'
  )),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, email_pro)
);

CREATE INDEX IF NOT EXISTS employees_contract_id_idx ON employees(contract_id);

CREATE TABLE IF NOT EXISTS funding_links (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id           TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  funding_source       TEXT NOT NULL CHECK (funding_source IN ('family', 'enterprise', 'mairie')),
  employee_id          TEXT REFERENCES employees(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  date_debut           TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_fin             TIMESTAMPTZ,
  switched_by_admin_id TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_links_student_id_idx ON funding_links(student_id);
CREATE INDEX IF NOT EXISTS funding_links_employee_id_idx ON funding_links(employee_id);

CREATE TABLE IF NOT EXISTS import_batches (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enterprise_id  TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id    TEXT NOT NULL REFERENCES enterprise_contracts(id) ON DELETE RESTRICT,
  file_name      TEXT NOT NULL,
  created_count  INTEGER NOT NULL,
  skipped_count  INTEGER NOT NULL,
  created_by     TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_batches_enterprise_id_idx ON import_batches(enterprise_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que les migrations précédentes du module Entreprise : le
-- backend (service_role via DATABASE_URL/Prisma) est la seule voie d'accès.
-- Deny-by-default, aucune policy publique.

ALTER TABLE employees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
