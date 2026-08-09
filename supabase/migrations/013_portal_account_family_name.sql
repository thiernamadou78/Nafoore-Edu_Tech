-- Nom donné par la famille à son espace (saisi lors de l'onboarding, après le
-- changement du mot de passe temporaire), affiché en haut du portail famille.

ALTER TABLE portal_accounts ADD COLUMN IF NOT EXISTS family_name TEXT;
