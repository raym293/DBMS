-- MyVCS Supabase Database Schema
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Commits Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commit_hash TEXT UNIQUE NOT NULL,
  tree_hash TEXT NOT NULL,
  parent_hash TEXT,
  author_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits(commit_hash);
CREATE INDEX IF NOT EXISTS idx_commits_parent ON commits(parent_hash);
CREATE INDEX IF NOT EXISTS idx_commits_created ON commits(created_at DESC);

-- ============================================================================
-- Branches Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_name TEXT UNIQUE NOT NULL,
  commit_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(ref_name);

-- ============================================================================
-- Access Control Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource, permission_type)
);

-- Index for faster permission checks
CREATE INDEX IF NOT EXISTS idx_access_user ON access_control(user_id);
CREATE INDEX IF NOT EXISTS idx_access_resource ON access_control(resource);

-- ============================================================================
-- Transactions Table (Audit Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_action ON transactions(action);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Remove existing policies before recreating them.
DO $$
BEGIN
  -- users
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view all users') THEN
    DROP POLICY "Users can view all users" ON users;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile') THEN
    DROP POLICY "Users can update own profile" ON users;
  END IF;

  -- commits
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commits' AND policyname = 'Anyone can view commits') THEN
    DROP POLICY "Anyone can view commits" ON commits;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commits' AND policyname = 'Authenticated users can insert commits') THEN
    DROP POLICY "Authenticated users can insert commits" ON commits;
  END IF;

  -- branches
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'branches' AND policyname = 'Anyone can view branches') THEN
    DROP POLICY "Anyone can view branches" ON branches;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'branches' AND policyname = 'Authenticated users can manage branches') THEN
    DROP POLICY "Authenticated users can manage branches" ON branches;
  END IF;

  -- access_control
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'access_control' AND policyname = 'Users can view own permissions') THEN
    DROP POLICY "Users can view own permissions" ON access_control;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'access_control' AND policyname = 'Admins can manage permissions') THEN
    DROP POLICY "Admins can manage permissions" ON access_control;
  END IF;

  -- transactions
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Users can view own transactions') THEN
    DROP POLICY "Users can view own transactions" ON transactions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Admins can view all transactions') THEN
    DROP POLICY "Admins can view all transactions" ON transactions;
  END IF;
END $$;

-- Helper functions for dashboard view rights.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM users WHERE id = auth.uid()),
    'viewer'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_view_resource(resource_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  role_name TEXT := current_user_role();
BEGIN
  RETURN CASE role_name
    WHEN 'admin' THEN resource_name IN ('dashboard', 'commits', 'branches', 'users')
    WHEN 'user' THEN resource_name IN ('dashboard', 'commits', 'branches')
    WHEN 'viewer' THEN resource_name IN ('dashboard', 'commits')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_resource(TEXT) TO authenticated;

-- Users:
-- - Users can insert and view/update their own profile
-- - Admin can view/update all profiles
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile or admin all" ON users
  FOR SELECT USING (auth.uid() = id OR current_user_role() = 'admin');

CREATE POLICY "Users can update own profile or admin all" ON users
  FOR UPDATE USING (auth.uid() = id OR current_user_role() = 'admin');

-- Commits:
-- - Read allowed by role matrix
-- - Write allowed for authenticated users
CREATE POLICY "Role-based commits read access" ON commits
  FOR SELECT USING (can_view_resource('commits'));

CREATE POLICY "Authenticated users can insert commits" ON commits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Branches:
-- - Read allowed by role matrix
-- - Write allowed for authenticated users
CREATE POLICY "Role-based branches read access" ON branches
  FOR SELECT USING (can_view_resource('branches'));

CREATE POLICY "Authenticated users can manage branches" ON branches
  FOR ALL USING (auth.role() = 'authenticated');

-- Access Control:
-- - Users can view their own grants
-- - Admin can view/manage all grants
CREATE POLICY "Users can view own permissions" ON access_control
  FOR SELECT USING (auth.uid() = user_id OR current_user_role() = 'admin');

CREATE POLICY "Admins can manage permissions" ON access_control
  FOR ALL USING (current_user_role() = 'admin');

-- Transactions:
-- - Users can view their own logs
-- - Admin can view all logs
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id OR current_user_role() = 'admin');

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger for branches table
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Insert sample user (commented out by default)
-- INSERT INTO users (email, username, role) VALUES
--   ('admin@example.com', 'admin', 'admin'),
--   ('developer@example.com', 'developer', 'user');

-- Insert sample branch
-- INSERT INTO branches (ref_name, commit_hash) VALUES
--   ('main', 'initial');
