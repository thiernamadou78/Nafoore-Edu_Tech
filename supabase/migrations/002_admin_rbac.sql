-- Migration Super Admin (1/2) — comptes admin, rôles, RBAC, audit trail
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

-- admin_accounts.id = auth.users.id (Supabase Auth) — pas de valeur par défaut,
-- fourni explicitement à la création (voir script de seed du premier super admin).
CREATE TABLE IF NOT EXISTS admin_accounts (
  id          TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name  TEXT NOT NULL UNIQUE  -- super_admin | admin | recruiter
);

CREATE TABLE IF NOT EXISTS admin_account_roles (
  admin_account_id TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  role_id          TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_account_id, role_id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_account_id  TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  target_table      TEXT,
  target_id         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (name) VALUES
  ('super_admin'),
  ('admin'),
  ('recruiter')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────
-- Helper RBAC — utilisé par les policies RLS
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_account_roles ar
    JOIN roles r ON r.id = ar.role_id
    WHERE ar.admin_account_id = auth.uid()::text
      AND r.name = role_name
  );
$$;

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Le backend NestJS (connexion directe DATABASE_URL/Prisma) reste la voie
-- d'accès et d'autorisation primaire (guards SupabaseAuthGuard + RolesGuard).
-- Ces policies sont une défense en profondeur si ces tables sont interrogées
-- directement via la clé anon/authenticated Supabase, en contournant le backend.

ALTER TABLE admin_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_account_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs       ENABLE ROW LEVEL SECURITY;

-- Un compte connecté peut lire sa propre fiche
CREATE POLICY "Read own admin_account"
  ON admin_accounts FOR SELECT
  USING (id = auth.uid()::text);

-- Un compte connecté peut lire la liste des rôles (référentiel, pas de donnée sensible)
CREATE POLICY "Read roles"
  ON roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Un compte connecté peut lire ses propres rôles
CREATE POLICY "Read own admin_account_roles"
  ON admin_account_roles FOR SELECT
  USING (admin_account_id = auth.uid()::text);

-- Aucune policy INSERT/UPDATE/DELETE : ces tables ne sont écrites que par le
-- backend (connexion directe qui bypass la RLS), jamais depuis le client.
-- Idem pour activity_logs : aucune policy de lecture publique, uniquement le backend.
