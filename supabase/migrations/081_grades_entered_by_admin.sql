-- Notes saisies par l'equipe Nafoore depuis l'admin (en plus de celles du
-- prof) : on garde l'auteur pour l'afficher "Saisie par l'équipe".
ALTER TABLE grades ADD COLUMN IF NOT EXISTS entered_by_admin_id TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL;
