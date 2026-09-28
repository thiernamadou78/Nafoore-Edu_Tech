-- Charte de confidentialite des enseignants (donnees des eleves mineurs et
-- des familles) : acceptee a la premiere connexion, avec les CGU. Version et
-- date conservees comme preuve (CHARTER_VERSION cote backend).
ALTER TABLE teacher_accounts ADD COLUMN IF NOT EXISTS charter_version TEXT;
ALTER TABLE teacher_accounts ADD COLUMN IF NOT EXISTS charter_accepted_at TIMESTAMPTZ;
