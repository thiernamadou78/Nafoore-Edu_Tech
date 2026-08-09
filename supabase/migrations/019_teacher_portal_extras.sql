CREATE TABLE teacher_payments (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,
  hours_given  DOUBLE PRECISION NOT NULL,
  amount       DOUBLE PRECISION NOT NULL,
  status       TEXT NOT NULL DEFAULT 'verse' CHECK (status IN ('verse', 'en_attente')),
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE teacher_payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE message_threads (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  family_name  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE messages (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  thread_id    TEXT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender       TEXT NOT NULL CHECK (sender IN ('teacher', 'famille')),
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE teacher_reviews (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id    TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  family_name   TEXT NOT NULL,
  student_name  TEXT NOT NULL,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE teacher_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE support_tickets (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert', 'traite')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
