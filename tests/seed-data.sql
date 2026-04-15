-- MyVCS Test Data
-- Run this in Supabase SQL Editor to populate test data
-- This bypasses RLS since it runs with admin privileges

-- Insert test users
INSERT INTO users (username, email, role) VALUES
  ('akshat', 'akshat@myvcs.dev', 'admin'),
  ('raymond', 'raymond@myvcs.dev', 'admin'),
  ('kevalina', 'kevalina@myvcs.dev', 'user'),
  ('anoushka', 'anoushka@myvcs.dev', 'user'),
  ('shlok', 'shlok@myvcs.dev', 'user'),
  ('moksh', 'moksh@myvcs.dev', 'user')
ON CONFLICT (email) DO NOTHING;

-- Insert role-aligned view grants for dashboard resources
INSERT INTO access_control (user_id, resource, permission_type)
SELECT id, resource, permission_type
FROM (
  VALUES
    -- Admin: dashboard, commits, branches, users
    ('akshat@myvcs.dev', 'dashboard', 'admin'),
    ('akshat@myvcs.dev', 'commits', 'admin'),
    ('akshat@myvcs.dev', 'branches', 'admin'),
    ('akshat@myvcs.dev', 'users', 'admin'),
    ('raymond@myvcs.dev', 'dashboard', 'admin'),
    ('raymond@myvcs.dev', 'commits', 'admin'),
    ('raymond@myvcs.dev', 'branches', 'admin'),
    ('raymond@myvcs.dev', 'users', 'admin'),
    -- User: dashboard, commits, branches
    ('kevalina@myvcs.dev', 'dashboard', 'read'),
    ('kevalina@myvcs.dev', 'commits', 'read'),
    ('kevalina@myvcs.dev', 'branches', 'read'),
    ('anoushka@myvcs.dev', 'dashboard', 'read'),
    ('anoushka@myvcs.dev', 'commits', 'read'),
    ('anoushka@myvcs.dev', 'branches', 'read'),
    ('shlok@myvcs.dev', 'dashboard', 'read'),
    ('shlok@myvcs.dev', 'commits', 'read'),
    ('shlok@myvcs.dev', 'branches', 'read'),
    ('moksh@myvcs.dev', 'dashboard', 'read'),
    ('moksh@myvcs.dev', 'commits', 'read'),
    ('moksh@myvcs.dev', 'branches', 'read')
) grants(email, resource, permission_type)
JOIN users u ON u.email = grants.email
ON CONFLICT (user_id, resource, permission_type) DO NOTHING;

-- Insert test branches
INSERT INTO branches (ref_name, commit_hash) VALUES
  ('main', 'a1b2c3d4e5f6789012345678901234567890abcd'),
  ('develop', 'b2c3d4e5f6789012345678901234567890abcde'),
  ('feature/auth', 'c3d4e5f6789012345678901234567890abcdef'),
  ('feature/dashboard', 'd4e5f6789012345678901234567890abcdef01'),
  ('hotfix/urgent', 'e5f6789012345678901234567890abcdef0123')
ON CONFLICT (ref_name) DO NOTHING;

-- Insert test commits
INSERT INTO commits (commit_hash, tree_hash, parent_hash, author_id, message) VALUES
  ('a1b2c3d4e5f6789012345678901234567890abcd', 'tree1234567890', NULL, 'akshat', 'Initial commit'),
  ('b2c3d4e5f6789012345678901234567890abcde', 'tree2345678901', 'a1b2c3d4e5f6789012345678901234567890abcd', 'raymond', 'Add storage module'),
  ('c3d4e5f6789012345678901234567890abcdef', 'tree3456789012', 'b2c3d4e5f6789012345678901234567890abcde', 'shlok', 'Implement diff algorithm'),
  ('d4e5f6789012345678901234567890abcdef01', 'tree4567890123', 'c3d4e5f6789012345678901234567890abcdef', 'kevalina', 'Add staging area'),
  ('e5f6789012345678901234567890abcdef0123', 'tree5678901234', 'd4e5f6789012345678901234567890abcdef01', 'anoushka', 'Implement branching'),
  ('f6789012345678901234567890abcdef012345', 'tree6789012345', 'e5f6789012345678901234567890abcdef0123', 'moksh', 'Add Supabase integration'),
  ('789012345678901234567890abcdef01234567', 'tree7890123456', 'f6789012345678901234567890abcdef012345', 'akshat', 'Fix compression bug'),
  ('89012345678901234567890abcdef0123456789', 'tree8901234567', '789012345678901234567890abcdef01234567', 'raymond', 'Add CLI commands'),
  ('9012345678901234567890abcdef012345678901', 'tree9012345678', '89012345678901234567890abcdef0123456789', 'shlok', 'Improve LCS performance'),
  ('012345678901234567890abcdef0123456789012', 'tree0123456789', '9012345678901234567890abcdef012345678901', 'moksh', 'Release v1.0.0')
ON CONFLICT (commit_hash) DO NOTHING;

-- Insert some transactions
INSERT INTO transactions (action, details) VALUES
  ('commit', '{"message": "Initial commit", "author": "akshat"}'),
  ('branch_create', '{"name": "develop", "from": "main"}'),
  ('commit', '{"message": "Add storage module", "author": "raymond"}'),
  ('commit', '{"message": "Implement diff algorithm", "author": "shlok"}'),
  ('branch_create', '{"name": "feature/auth", "from": "develop"}'),
  ('commit', '{"message": "Add staging area", "author": "kevalina"}'),
  ('commit', '{"message": "Implement branching", "author": "anoushka"}'),
  ('commit', '{"message": "Add Supabase integration", "author": "moksh"}');

-- Verify counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'access_control', COUNT(*) FROM access_control
UNION ALL
SELECT 'commits', COUNT(*) FROM commits
UNION ALL
SELECT 'branches', COUNT(*) FROM branches
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;
