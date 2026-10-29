-- 1) Alertes a l'equipe : seance non demarree (30 min apres le debut sans
--    arrivee pointee) et depart non pointe (1 h apres la fin prevue). Une
--    seule alerte par seance.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS start_alert_sent_at TIMESTAMP(3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkout_alert_sent_at TIMESTAMP(3);

-- 2) Rapports d'activite hebdomadaires / mensuels envoyes a l'equipe : un
--    seul envoi par periode, et trace de l'envoi.
CREATE TABLE IF NOT EXISTS activity_reports (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('weekly', 'monthly')),
  period_start  TIMESTAMP(3) NOT NULL,
  period_end    TIMESTAMP(3) NOT NULL,
  sent_at       TIMESTAMP(3),
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kind, period_start)
);
ALTER TABLE activity_reports ENABLE ROW LEVEL SECURITY;
