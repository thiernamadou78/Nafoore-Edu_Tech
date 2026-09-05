-- Profil enseignant (photo + bio marketing) rédigé par l'admin sur la
-- candidature, requis avant validation — affiché ensuite aux familles lors
-- d'une proposition de matching (déjà branché côté famille/email).

ALTER TABLE teacher_applications ADD COLUMN bio TEXT;
ALTER TABLE teacher_applications ADD COLUMN photo_path TEXT;
