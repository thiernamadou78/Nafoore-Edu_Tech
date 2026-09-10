-- Ajout du format hybride (présentiel + distanciel) aux demandes de professeur

ALTER TABLE teacher_requests DROP CONSTRAINT IF EXISTS teacher_requests_format_check;

ALTER TABLE teacher_requests ADD CONSTRAINT teacher_requests_format_check
  CHECK (format IN ('presentiel', 'distanciel', 'hybride'));
