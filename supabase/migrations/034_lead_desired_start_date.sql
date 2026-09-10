-- Date de debut souhaitee, renseignee par le prospect dans le formulaire de
-- contact du site vitrine (utile a l'admin pour prioriser le suivi).

ALTER TABLE leads ADD COLUMN IF NOT EXISTS desired_start_date TIMESTAMPTZ;
