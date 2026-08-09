-- Demande de professeur (famille) + proposition de matching (admin)

CREATE TABLE IF NOT EXISTS teacher_requests (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  frequency    TEXT NOT NULL,
  format       TEXT NOT NULL CHECK (format IN ('presentiel', 'distanciel')),
  availability TEXT,
  status       TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN (
    'en_attente', 'proposition_envoyee', 'acceptee', 'annulee'
  ))
);

CREATE INDEX IF NOT EXISTS teacher_requests_student_id_idx ON teacher_requests(student_id);

CREATE TABLE IF NOT EXISTS matchings (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  teacher_request_id TEXT NOT NULL REFERENCES teacher_requests(id) ON DELETE CASCADE,
  teacher_id         TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  proposed_by        TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'proposee' CHECK (status IN (
    'proposee', 'acceptee', 'refusee'
  )),
  refusal_reason     TEXT,
  responded_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS matchings_teacher_request_id_idx ON matchings(teacher_request_id);
CREATE INDEX IF NOT EXISTS matchings_teacher_id_idx ON matchings(teacher_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Même principe que portal_accounts / credential_dispatch_logs : le backend
-- (service_role via DATABASE_URL/Prisma) est la seule voie d'accès.
-- Deny-by-default, aucune policy publique.

ALTER TABLE teacher_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchings        ENABLE ROW LEVEL SECURITY;
