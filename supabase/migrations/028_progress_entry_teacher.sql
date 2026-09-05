ALTER TABLE progress_entries ALTER COLUMN admin_account_id DROP NOT NULL;
ALTER TABLE progress_entries ADD COLUMN teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
