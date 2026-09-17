ALTER TABLE sessions ADD COLUMN IF NOT EXISTS report_reminder_sent_at TIMESTAMPTZ;
