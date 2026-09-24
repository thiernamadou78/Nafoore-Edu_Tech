-- Catalogue des matieres, gere par le Super Admin (avant : liste figee dans
-- le code). Deux categories : soutien scolaire et formation professionnelle
-- (formateurs pour des missions en entreprise).
--
-- Les enseignants, candidatures et demandes continuent de stocker le NOM de
-- la matiere (texte) : un nom n'est donc jamais renomme, seulement masque
-- (is_active = false) ou supprime s'il n'est utilise nulle part.
CREATE TABLE IF NOT EXISTS subjects (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL CHECK (category IN ('scolaire', 'professionnel')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

INSERT INTO subjects (name, category) VALUES
  ('Français', 'scolaire'),
  ('Mathématiques', 'scolaire'),
  ('Questionner le monde', 'scolaire'),
  ('Histoire-Géographie', 'scolaire'),
  ('Anglais', 'scolaire'),
  ('Arts plastiques', 'scolaire'),
  ('Éducation musicale', 'scolaire'),
  ('EPS', 'scolaire'),
  ('Éducation morale et civique', 'scolaire'),
  ('Sciences de la Vie et de la Terre (SVT)', 'scolaire'),
  ('Physique-Chimie', 'scolaire'),
  ('Technologie', 'scolaire'),
  ('Espagnol', 'scolaire'),
  ('Allemand', 'scolaire'),
  ('Latin', 'scolaire'),
  ('Philosophie', 'scolaire'),
  ('Enseignement scientifique', 'scolaire'),
  ('SES', 'scolaire'),
  ('Numérique et Sciences Informatiques (NSI)', 'scolaire'),
  ('Histoire-Géo, Géopolitique et Sciences Politiques', 'scolaire'),
  ('Humanités, Littérature et Philosophie', 'scolaire'),
  ('Langues, Littératures et Cultures Étrangères', 'scolaire'),
  ('Sciences de l''Ingénieur', 'scolaire'),
  ('Arts', 'scolaire'),
  ('Power BI', 'professionnel'),
  ('Excel avancé', 'professionnel'),
  ('Bureautique (Word, Excel, PowerPoint)', 'professionnel'),
  ('Gestion de projet', 'professionnel'),
  ('Méthodes agiles (Scrum)', 'professionnel'),
  ('Management d''équipe', 'professionnel'),
  ('Analyse de données (SQL)', 'professionnel'),
  ('Python', 'professionnel'),
  ('Développement web', 'professionnel'),
  ('Marketing digital', 'professionnel'),
  ('Communication professionnelle', 'professionnel'),
  ('Prise de parole en public', 'professionnel'),
  ('Comptabilité et gestion', 'professionnel'),
  ('Ressources humaines', 'professionnel'),
  ('Anglais professionnel', 'professionnel')
ON CONFLICT (name) DO NOTHING;
