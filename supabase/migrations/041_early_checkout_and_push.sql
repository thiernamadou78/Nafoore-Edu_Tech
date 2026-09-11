-- Raison donnee par le prof quand il confirme une fin de seance anticipee
-- (scan de fin avant l'heure prevue).
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS early_end_reason TEXT;

-- Evite les rappels push en double (cron qui tourne toutes les minutes).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkin_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkout_reminder_sent_at TIMESTAMPTZ;

-- Abonnements Web Push des enseignants (rappel de pointage debut/fin de seance).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_teacher_id_idx ON push_subscriptions(teacher_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
