ALTER TABLE student_teachers DROP CONSTRAINT student_teachers_pkey;
ALTER TABLE student_teachers ADD COLUMN id TEXT;
UPDATE student_teachers SET id = gen_random_uuid()::text;
ALTER TABLE student_teachers ALTER COLUMN id SET NOT NULL;
ALTER TABLE student_teachers ADD PRIMARY KEY (id);
ALTER TABLE student_teachers ADD COLUMN subject TEXT;
ALTER TABLE student_teachers ADD CONSTRAINT student_teachers_student_id_teacher_id_subject_key
  UNIQUE (student_id, teacher_id, subject);
