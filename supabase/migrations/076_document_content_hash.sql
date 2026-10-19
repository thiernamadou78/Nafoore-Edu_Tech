-- Empreinte SHA-256 du contenu des documents (candidature et enseignant) :
-- detecte un meme fichier depose plusieurs fois dans un dossier (ex. le meme
-- PDF en CV et en diplome), quel que soit son nom. Vide pour les documents
-- deposes avant cette migration.
ALTER TABLE teacher_application_documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE teacher_documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS teacher_application_documents_hash_idx ON teacher_application_documents(content_hash);
CREATE INDEX IF NOT EXISTS teacher_documents_hash_idx ON teacher_documents(content_hash);
