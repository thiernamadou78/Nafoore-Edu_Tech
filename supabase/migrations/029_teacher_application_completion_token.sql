ALTER TABLE teacher_applications ADD COLUMN completion_token TEXT;

UPDATE teacher_applications
SET completion_token = replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE completion_token IS NULL;

ALTER TABLE teacher_applications ALTER COLUMN completion_token SET NOT NULL;
ALTER TABLE teacher_applications ADD CONSTRAINT teacher_applications_completion_token_key UNIQUE (completion_token);
