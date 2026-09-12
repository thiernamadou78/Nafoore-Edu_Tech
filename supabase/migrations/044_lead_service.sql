-- Service demande par le lead au formulaire de contact (aide aux devoirs,
-- soutien scolaire, preparation brevet/bac, etc.) -- utilise par l'admin pour
-- qualifier le contact et preparer un devis adapte.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS service TEXT;
