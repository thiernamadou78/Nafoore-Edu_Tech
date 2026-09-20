ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS period_months INTEGER;
ALTER TABLE student_teachers ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS period_renewals (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  student_teacher_id TEXT NOT NULL REFERENCES student_teachers(id) ON DELETE CASCADE,
  period_months INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_attente_prof',
  teacher_comment TEXT,
  teacher_responded_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  admin_reason TEXT,
  new_request_id TEXT
);
CREATE INDEX IF NOT EXISTS period_renewals_student_teacher_id_idx ON period_renewals(student_teacher_id);
