-- Ajoute "primaire" aux niveaux scolaires acceptés (jusqu'ici college | lycee uniquement).

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_level_check;
ALTER TABLE students ADD CONSTRAINT students_level_check CHECK (level IN ('primaire', 'college', 'lycee'));
