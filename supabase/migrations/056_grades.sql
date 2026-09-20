CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  kind TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  scale DOUBLE PRECISION NOT NULL DEFAULT 20,
  evaluated_at TIMESTAMPTZ NOT NULL,
  comment TEXT
);
CREATE INDEX IF NOT EXISTS grades_student_subject_idx ON grades(student_id, subject);
