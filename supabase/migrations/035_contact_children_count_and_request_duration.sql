-- Nombre d'enfants a inscrire (formulaire de contact site vitrine, profil famille)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS children_count INTEGER;

-- Duree de seance souhaitee par la famille sur une demande de professeur,
-- pour que le prof n'ait pas a la redefinir lui-meme au moment du planning.
ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
