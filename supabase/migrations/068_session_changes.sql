-- Report / annulation de seances par la famille, l'enseignant ou l'admin.
-- - rescheduled_from : date d'origine d'une seance deplacee (evite que la
--   generation du programme hebdo ne la recree a l'ancien creneau) ;
-- - postpone_reason  : motif d'une demande de report (statut "reportee" =
--   a replanifier par l'enseignant) ;
-- - changed_by / changed_at : dernier auteur d'un report ou d'une
--   annulation (famille | enseignant | admin), pour l'historique et les emails.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS rescheduled_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS postpone_reason  TEXT,
  ADD COLUMN IF NOT EXISTS changed_by       TEXT,
  ADD COLUMN IF NOT EXISTS changed_at       TIMESTAMPTZ;

-- Motif et auteur de l'arret d'un programme hebdomadaire.
ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS stopped_reason TEXT,
  ADD COLUMN IF NOT EXISTS stopped_by     TEXT,
  ADD COLUMN IF NOT EXISTS stopped_at     TIMESTAMPTZ;
