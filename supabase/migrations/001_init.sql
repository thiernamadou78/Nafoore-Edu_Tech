-- Migration initiale Nafoore
-- À exécuter depuis le SQL Editor de ton projet Supabase
-- ou via : supabase db push

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  profile     TEXT NOT NULL CHECK (profile IN ('famille', 'mairie', 'entreprise')),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS students (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  name           TEXT NOT NULL,
  level          TEXT NOT NULL CHECK (level IN ('college', 'lycee')),
  parent_lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name     TEXT NOT NULL,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT false,
  bio      TEXT
);

CREATE TABLE IF NOT EXISTS testimonials (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author    TEXT NOT NULL,
  role      TEXT NOT NULL,
  quote     TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS faq_items (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question  TEXT NOT NULL,
  answer    TEXT NOT NULL,
  "order"   INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS services (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT,
  "order"     INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

ALTER TABLE leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;

-- Contenu public en lecture
CREATE POLICY "Public read testimonials"
  ON testimonials FOR SELECT
  USING (published = true);

CREATE POLICY "Public read faq_items"
  ON faq_items FOR SELECT
  USING (published = true);

CREATE POLICY "Public read services"
  ON services FOR SELECT
  USING (true);

-- Le backend (service_role) insère les leads — aucune policy INSERT publique
-- Le backend utilise SUPABASE_SERVICE_ROLE_KEY ou DATABASE_URL directe (Prisma)
-- qui bypass la RLS, donc pas de policy INSERT côté client nécessaire.

-- ─────────────────────────────────────────────
-- Données initiales (optionnel — témoignages, FAQ)
-- ─────────────────────────────────────────────

INSERT INTO testimonials (author, role, quote, published) VALUES
  ('Sophie M.', 'Mère d''élève, Paris 13ème',
   'Grâce à Nafoore, ma fille a gagné en confiance et a décroché son Brevet avec mention. Le suivi régulier des enseignants fait vraiment la différence.',
   true),
  ('Direction éducative', 'Mairie de Clichy-la-Garenne',
   'Nous avons déployé Nafoore dans trois écoles dans le cadre de notre dispositif de réussite éducative. Les résultats sont mesurables et le partenariat est exemplaire.',
   true),
  ('Thomas L.', 'Professeur de mathématiques, Paris',
   'Nafoore m''offre une vraie flexibilité tout en me donnant les outils pour suivre mes élèves sérieusement. C''est une plateforme qui respecte autant les profs que les familles.',
   true)
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (question, answer, "order", published) VALUES
  ('Comment inscrire mon enfant ?',
   'Remplissez le formulaire de contact en sélectionnant votre profil "Famille". Notre équipe vous recontacte sous 24h pour un bilan gratuit.',
   1, true),
  ('Quels niveaux scolaires prenez-vous en charge ?',
   'Du CP à la Terminale (toutes filières), ainsi que les classes préparatoires.',
   2, true),
  ('Les cours se déroulent-ils en présentiel ou en ligne ?',
   'Les deux ! Au domicile de l''élève, dans nos espaces partenaires, ou en visioconférence sur notre plateforme sécurisée.',
   3, true),
  ('Quels sont les tarifs ?',
   'À partir de 25 €/h. Des formules mensuelles offrent des tarifs réduits. Contactez-nous pour un devis personnalisé.',
   4, true)
ON CONFLICT DO NOTHING;
