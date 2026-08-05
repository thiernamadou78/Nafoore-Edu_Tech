-- Migration Super Admin — Photos de profil (élèves / enseignants)
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push
--
-- Étape manuelle complémentaire (hors SQL) : créer un bucket Supabase
-- Storage privé nommé "profile-photos" (voir apps/admin/README.md).

ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_path TEXT;
