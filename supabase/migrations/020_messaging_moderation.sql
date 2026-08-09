ALTER TABLE message_threads ADD COLUMN lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE message_threads ADD COLUMN teacher_read_at TIMESTAMPTZ;
ALTER TABLE message_threads ADD COLUMN family_read_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN removed_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN removed_by TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN removed_reason TEXT;
