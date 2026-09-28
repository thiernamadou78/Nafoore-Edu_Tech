-- Acceptation des CGU par les comptes famille et enseignant : version
-- acceptee et date (preuve de l'acceptation). Une nouvelle version des CGU
-- (TERMS_VERSION cote backend) redemande l'acceptation a la connexion.
ALTER TABLE portal_accounts ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE portal_accounts ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE teacher_accounts ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE teacher_accounts ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
