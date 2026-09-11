-- Adresse renseignee par la famille au formulaire de contact : indispensable
-- pour proposer un enseignant a la fois experimente et proche geographiquement.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;
