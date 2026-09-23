-- Droits par module et zone geographique des comptes admin.
--
-- Il ne reste que deux roles : super_admin (tous les droits, toutes les
-- zones) et admin (droits coches par le Super Admin, limites a sa zone).
-- Un droit s'ecrit "<module>:view" ou "<module>:edit".
ALTER TABLE admin_accounts
  ADD COLUMN IF NOT EXISTS permissions     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS zone_address    TEXT,
  ADD COLUMN IF NOT EXISTS zone_latitude   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS zone_longitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS zone_radius_km  INTEGER;

-- Les candidatures n'etaient pas localisees : necessaire pour le filtrage
-- par zone.
ALTER TABLE teacher_applications
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Les admins existants gardent l'acces complet qu'ils avaient.
UPDATE admin_accounts a
SET permissions = ARRAY[
  'dashboard:view','dashboard:edit','leads:view','leads:edit',
  'students:view','students:edit','teachers:view','teachers:edit',
  'recruitment:view','recruitment:edit','teacher_requests:view','teacher_requests:edit',
  'renewals:view','renewals:edit','messaging:view','messaging:edit',
  'support:view','support:edit','attendance:view','attendance:edit',
  'enterprises:view','enterprises:edit','formulas:view','formulas:edit',
  'site:view','site:edit'
]
WHERE EXISTS (
  SELECT 1 FROM admin_account_roles ar JOIN roles r ON r.id = ar.role_id
  WHERE ar.admin_account_id = a.id AND r.name = 'admin'
);

-- Les recruteurs deviennent des admins avec le seul droit Recrutement.
UPDATE admin_accounts a
SET permissions = ARRAY['recruitment:view','recruitment:edit']
WHERE EXISTS (
  SELECT 1 FROM admin_account_roles ar JOIN roles r ON r.id = ar.role_id
  WHERE ar.admin_account_id = a.id AND r.name = 'recruiter'
)
AND NOT EXISTS (
  SELECT 1 FROM admin_account_roles ar JOIN roles r ON r.id = ar.role_id
  WHERE ar.admin_account_id = a.id AND r.name IN ('admin', 'super_admin')
);

INSERT INTO admin_account_roles (admin_account_id, role_id)
SELECT ar.admin_account_id, (SELECT id FROM roles WHERE name = 'admin')
FROM admin_account_roles ar JOIN roles r ON r.id = ar.role_id
WHERE r.name = 'recruiter'
ON CONFLICT DO NOTHING;

DELETE FROM admin_account_roles
WHERE role_id = (SELECT id FROM roles WHERE name = 'recruiter');
DELETE FROM roles WHERE name = 'recruiter';

-- Un Super Admin ne cumule pas le role admin (un seul role par compte).
DELETE FROM admin_account_roles
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')
  AND admin_account_id IN (
    SELECT ar.admin_account_id FROM admin_account_roles ar
    JOIN roles r ON r.id = ar.role_id WHERE r.name = 'super_admin'
  );
