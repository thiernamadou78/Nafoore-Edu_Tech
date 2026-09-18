ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS desired_start_date TIMESTAMP(3);
ALTER TABLE teacher_request_interests ADD COLUMN IF NOT EXISTS interested BOOLEAN NOT NULL DEFAULT true;
