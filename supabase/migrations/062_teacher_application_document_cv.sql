ALTER TABLE teacher_application_documents DROP CONSTRAINT IF EXISTS teacher_application_documents_type_check;
ALTER TABLE teacher_application_documents ADD CONSTRAINT teacher_application_documents_type_check
  CHECK (type IN ('cv', 'diplome', 'casier_judiciaire', 'autre'));
