-- Candidature enseignant publique → validation → compte
-- Étend teacher_applications pour un vrai formulaire candidat (téléphone,
-- niveaux, disponibilités), ajoute les documents justificatifs, et le compte
-- enseignant authentifié (table séparée de portal_accounts, cf. décision
-- d'architecture : pas de lead pour un enseignant).

ALTER TABLE teacher_applications
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS levels TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability TEXT;

CREATE TABLE IF NOT EXISTS teacher_application_documents (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_application_id TEXT NOT NULL REFERENCES teacher_applications(id) ON DELETE CASCADE,
  type                   TEXT NOT NULL CHECK (type IN ('diplome', 'casier_judiciaire', 'autre')),
  file_name              TEXT NOT NULL,
  file_path              TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_application_documents_application_id_idx
  ON teacher_application_documents(teacher_application_id);

-- Pas de FK Postgres vers auth.users(id) : même convention que admin_accounts /
-- portal_accounts (voir migrations 002 et 010) — id = auth.users.id par
-- convention applicative, fourni explicitement à la création.
CREATE TABLE IF NOT EXISTS teacher_accounts (
  id                      TEXT PRIMARY KEY,
  email                   TEXT NOT NULL UNIQUE,
  full_name               TEXT NOT NULL,
  must_change_password    BOOLEAN NOT NULL DEFAULT true,
  status                  TEXT NOT NULL DEFAULT 'invite' CHECK (status IN ('invite', 'actif', 'suspendu')),
  teacher_application_id  TEXT NOT NULL UNIQUE REFERENCES teacher_applications(id) ON DELETE RESTRICT,
  teacher_id              TEXT UNIQUE REFERENCES teachers(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_credential_dispatch_logs (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_application_id TEXT NOT NULL REFERENCES teacher_applications(id) ON DELETE CASCADE,
  teacher_account_id     TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE CASCADE,
  sent_by                TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  sent_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status        TEXT NOT NULL, -- envoye | echec
  email_provider_id      TEXT
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que partout ailleurs dans ce projet : le backend (service_role
-- via DATABASE_URL/Prisma) est la seule voie d'accès. Deny-by-default, aucune
-- policy publique — y compris pour l'insertion depuis le formulaire public,
-- qui passe par le backend NestJS (pas d'insert Postgres anonyme direct).

ALTER TABLE teacher_application_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_accounts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_credential_dispatch_logs ENABLE ROW LEVEL SECURITY;
