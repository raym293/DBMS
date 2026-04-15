# Supabase Change Todo (Role-Based View Rights)

This checklist tracks the Supabase-side changes needed for role-based dashboard visibility:

- **Admin:** dashboard, commits, branches, users
- **User:** dashboard, commits, branches
- **Viewer:** dashboard, commits

## 1. Apply/refresh schema and policies

Run the full schema from `supabase-schema.sql` in Supabase SQL Editor.

Key changes included there:
- `users` self-insert/self-update + admin-read-all policy
- role-based read policies for `commits` and `branches`
- access-control and transaction policies aligned with role model
- helper functions:
  - `current_user_role()`
  - `can_view_resource(resource_name)`

## 2. Ensure role constraints and defaults

```sql
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'user';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'user', 'viewer'));
```

## 3. Seed role-based access grants

Use this after users exist:

```sql
INSERT INTO access_control (user_id, resource, permission_type)
SELECT id, resource, permission_type
FROM (
  VALUES
    -- Admin
    ('akshat@myvcs.dev', 'dashboard', 'admin'),
    ('akshat@myvcs.dev', 'commits', 'admin'),
    ('akshat@myvcs.dev', 'branches', 'admin'),
    ('akshat@myvcs.dev', 'users', 'admin'),
    ('raymond@myvcs.dev', 'dashboard', 'admin'),
    ('raymond@myvcs.dev', 'commits', 'admin'),
    ('raymond@myvcs.dev', 'branches', 'admin'),
    ('raymond@myvcs.dev', 'users', 'admin'),
    -- User
    ('kevalina@myvcs.dev', 'dashboard', 'read'),
    ('kevalina@myvcs.dev', 'commits', 'read'),
    ('kevalina@myvcs.dev', 'branches', 'read'),
    ('anoushka@myvcs.dev', 'dashboard', 'read'),
    ('anoushka@myvcs.dev', 'commits', 'read'),
    ('anoushka@myvcs.dev', 'branches', 'read'),
    -- Viewer example
    ('viewer@myvcs.dev', 'dashboard', 'read'),
    ('viewer@myvcs.dev', 'commits', 'read')
) grants(email, resource, permission_type)
JOIN users u ON u.email = grants.email
ON CONFLICT (user_id, resource, permission_type) DO NOTHING;
```

## 4. Convert an existing account to viewer/admin/user

```sql
UPDATE users
SET role = 'viewer'
WHERE email = 'viewer@myvcs.dev';
```

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@myvcs.dev';
```

## 5. Verification queries

Check role distribution:

```sql
SELECT role, COUNT(*) AS count
FROM users
GROUP BY role
ORDER BY role;
```

Check access grants:

```sql
SELECT u.email, u.role, ac.resource, ac.permission_type
FROM access_control ac
JOIN users u ON u.id = ac.user_id
ORDER BY u.email, ac.resource, ac.permission_type;
```

Quick row counts:

```sql
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'access_control', COUNT(*) FROM access_control
UNION ALL
SELECT 'commits', COUNT(*) FROM commits
UNION ALL
SELECT 'branches', COUNT(*) FROM branches
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;
```

## 6. Migration/run order

1. Run `supabase-schema.sql`
2. Run `tests/seed-data.sql` (or your own seed SQL)
3. Apply targeted role/access updates (if needed)
4. Verify with the queries above
