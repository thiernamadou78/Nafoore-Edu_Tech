-- Oubli de RLS sur des tables ajoutees en cours de session (alerte Supabase
-- "rls_disabled_in_public"). Meme convention que le reste du projet : RLS
-- activee sans policy PostgREST — l'API REST publique n'a donc aucun acces,
-- et le backend (connexion Postgres dediee, hors PostgREST) continue de
-- fonctionner normalement.
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_request_interests ENABLE ROW LEVEL SECURITY;
