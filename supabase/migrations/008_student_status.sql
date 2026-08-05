-- Migration Super Admin — Statut actif/inactif pour les élèves
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push

ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
