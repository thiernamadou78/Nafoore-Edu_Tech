ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email_reminder_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS teacher_request_interests (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  teacher_request_id TEXT NOT NULL REFERENCES teacher_requests(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  UNIQUE (teacher_request_id, teacher_id)
);
CREATE INDEX IF NOT EXISTS teacher_request_interests_teacher_id_idx ON teacher_request_interests(teacher_id);
