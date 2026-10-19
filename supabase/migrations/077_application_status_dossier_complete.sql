-- Nouveau statut de candidature "dossier_complete" : le candidat a fourni
-- tous les elements demandes via "Documents requis". La contrainte de
-- statut est recreee avec la liste complete (quel que soit son nom actuel).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'teacher_applications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE teacher_applications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE teacher_applications ADD CONSTRAINT teacher_applications_status_check CHECK (status IN (
  'preselection',
  'entretien_planifie',
  'entretien_realise',
  'documents_requis',
  'dossier_complete',
  'valide',
  'refuse'
));
