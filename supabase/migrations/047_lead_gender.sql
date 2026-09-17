-- Genre du contact (homme | femme), demande sur le formulaire de contact.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS gender TEXT;
