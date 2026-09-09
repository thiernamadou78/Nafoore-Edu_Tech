-- Planning recurrent eleve/enseignant (frequence + creneaux jour/heure).
-- Genere automatiquement des sessions reelles sur une fenetre glissante
-- (RecurringScheduleService) : le pointage QR continue de s'appuyer
-- uniquement sur des sessions concretes, jamais sur ce planning.

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id       TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id       TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  frequency        INTEGER NOT NULL,
  subject          TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  slots            JSONB NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, teacher_id)
);

ALTER TABLE sessions ADD COLUMN schedule_id TEXT REFERENCES recurring_schedules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sessions_schedule_id_idx ON sessions(schedule_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
-- Meme principe que les autres tables : le backend (service_role via
-- DATABASE_URL/Prisma) est la seule voie d'acces. Deny-by-default.

ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
