-- Un enseignant ajoute directement par l'admin (sans candidature) doit
-- pouvoir recevoir ses identifiants : le compte portail et le journal
-- d'envoi ne sont plus obligatoirement rattaches a une candidature.
ALTER TABLE teacher_accounts ALTER COLUMN teacher_application_id DROP NOT NULL;
ALTER TABLE teacher_credential_dispatch_logs ALTER COLUMN teacher_application_id DROP NOT NULL;
