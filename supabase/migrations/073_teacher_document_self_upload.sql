-- L'enseignant peut deposer ses documents depuis son portail : le document
-- n'a alors pas d'admin comme auteur (uploaded_by vide = depose par
-- l'enseignant lui-meme).
ALTER TABLE teacher_documents ALTER COLUMN uploaded_by DROP NOT NULL;
