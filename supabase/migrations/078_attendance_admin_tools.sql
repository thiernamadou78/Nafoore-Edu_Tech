-- Outils de suivi des pointages pour l'equipe Nafoore.

-- 1) Pointage saisi par l'equipe (en plus du scan QR et du pointage manuel
--    du prof).
ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_method_check;
ALTER TABLE attendance_logs ADD CONSTRAINT attendance_logs_method_check
  CHECK (method IN ('qr_scan', 'manuel', 'admin'));

-- 2) Seances : duree prevue conservee (la duree est remplacee par la duree
--    reelle au pointage de fin) et date du compte-rendu (delai de redaction).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS planned_duration_minutes INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP(3);

-- 3) Journal des corrections de pointage par l'equipe : qui, quand, avant,
--    apres, pourquoi.
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id                    TEXT PRIMARY KEY,
  attendance_log_id     TEXT REFERENCES attendance_logs(id) ON DELETE SET NULL,
  session_id            TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  admin_account_id      TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,
  action                TEXT NOT NULL CHECK (action IN ('cloture', 'correction', 'saisie', 'non_donnee')),
  previous_checkin_at   TIMESTAMP(3),
  previous_checkout_at  TIMESTAMP(3),
  new_checkin_at        TIMESTAMP(3),
  new_checkout_at       TIMESTAMP(3),
  reason                TEXT NOT NULL,
  created_at            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS attendance_corrections_session_idx ON attendance_corrections(session_id);
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
