/**
 * MyVCS Supabase Integration Module
 * Author: Moksh
 * 
 * Handles user authentication via Supabase and ensures all local
 * commit/branch metadata is mirrored to Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Check if Supabase is configured
 * @returns {boolean}
 */
export function isConfigured() {
    return SUPABASE_URL !== 'https://placeholder.supabase.co' && 
           SUPABASE_ANON_KEY !== 'placeholder-key';
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} username - Username
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function signUp(email, password, username) {
    if (!isConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }
            }
        });

        if (error) throw error;

        // Insert into users table
        if (data.user) {
            await supabase.from('users').insert({
                id: data.user.id,
                email,
                username,
                role: 'user',
                created_at: new Date().toISOString()
            });
        }

        return { success: true, user: data.user };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function signIn(email, password) {
    if (!isConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        return { success: true, user: data.user };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Sign out the current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function signOut() {
    if (!isConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Get current user
 * @returns {Promise<{user: Object|null, error?: string}>}
 */
export async function getCurrentUser() {
    if (!isConfigured()) {
        return { user: null, error: 'Supabase not configured' };
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        return { user };
    } catch (err) {
        return { user: null, error: err.message };
    }
}

// ============================================================================
// Commit Sync
// ============================================================================

/**
 * Sync a commit to Supabase
 * @param {Object} commitData - Commit data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncCommit(commitData) {
    if (!isConfigured()) {
        return { success: true }; // Silently skip if not configured
    }

    try {
        const { error } = await supabase.from('commits').upsert({
            commit_hash: commitData.hash,
            tree_hash: commitData.tree,
            parent_hash: commitData.parent || null,
            author_id: commitData.author,
            message: commitData.message,
            created_at: new Date(commitData.timestamp * 1000).toISOString()
        }, { onConflict: 'commit_hash' });

        if (error) throw error;

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Sync multiple commits to Supabase
 * @param {Array} commits - Array of commit data
 * @returns {Promise<{success: boolean, synced: number, error?: string}>}
 */
export async function syncCommits(commits) {
    if (!isConfigured()) {
        return { success: true, synced: 0 };
    }

    let synced = 0;
    for (const commit of commits) {
        const result = await syncCommit(commit);
        if (result.success) synced++;
    }

    return { success: true, synced };
}

/**
 * Get commits from Supabase
 * @param {number} limit - Maximum number of commits
 * @returns {Promise<{commits: Array, error?: string}>}
 */
export async function getRemoteCommits(limit = 50) {
    if (!isConfigured()) {
        return { commits: [], error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase
            .from('commits')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { commits: data || [] };
    } catch (err) {
        return { commits: [], error: err.message };
    }
}

// ============================================================================
// Branch Sync
// ============================================================================

/**
 * Sync a branch to Supabase
 * @param {string} branchName - Branch name
 * @param {string} commitHash - Current commit hash
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncBranch(branchName, commitHash) {
    if (!isConfigured()) {
        return { success: true };
    }

    try {
        const { error } = await supabase.from('branches').upsert({
            ref_name: branchName,
            commit_hash: commitHash,
            updated_at: new Date().toISOString()
        }, { onConflict: 'ref_name' });

        if (error) throw error;

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Get branches from Supabase
 * @returns {Promise<{branches: Array, error?: string}>}
 */
export async function getRemoteBranches() {
    if (!isConfigured()) {
        return { branches: [], error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .order('ref_name');

        if (error) throw error;

        return { branches: data || [] };
    } catch (err) {
        return { branches: [], error: err.message };
    }
}

/**
 * Delete a branch from Supabase
 * @param {string} branchName - Branch name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteRemoteBranch(branchName) {
    if (!isConfigured()) {
        return { success: true };
    }

    try {
        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('ref_name', branchName);

        if (error) throw error;

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ============================================================================
// Access Control
// ============================================================================

/**
 * Check if user has permission
 * @param {string} userId - User ID
 * @param {string} resource - Resource identifier
 * @param {string} permission - Permission type (read, write, admin)
 * @returns {Promise<boolean>}
 */
export async function checkPermission(userId, resource, permission) {
    if (!isConfigured()) {
        return true; // Allow all if not configured
    }

    try {
        const { data, error } = await supabase
            .from('access_control')
            .select('*')
            .eq('user_id', userId)
            .eq('resource', resource)
            .eq('permission_type', permission)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

        return !!data;
    } catch (err) {
        console.error('Permission check error:', err.message);
        return false;
    }
}

/**
 * Grant permission to user
 * @param {string} userId - User ID
 * @param {string} resource - Resource identifier
 * @param {string} permission - Permission type
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function grantPermission(userId, resource, permission) {
    if (!isConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await supabase.from('access_control').insert({
            user_id: userId,
            resource,
            permission_type: permission,
            created_at: new Date().toISOString()
        });

        if (error) throw error;

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ============================================================================
// Transaction Log
// ============================================================================

/**
 * Log a transaction
 * @param {Object} transaction - Transaction data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function logTransaction(transaction) {
    if (!isConfigured()) {
        return { success: true };
    }

    try {
        const { error } = await supabase.from('transactions').insert({
            action: transaction.action,
            user_id: transaction.userId,
            details: transaction.details,
            created_at: new Date().toISOString()
        });

        if (error) throw error;

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ============================================================================
// Database Schema (for reference)
// ============================================================================

/**
 * SQL to create Supabase tables:
 * 
 * -- Users table
 * CREATE TABLE users (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   email TEXT UNIQUE NOT NULL,
 *   username TEXT NOT NULL,
 *   role TEXT DEFAULT 'user',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Commits table
 * CREATE TABLE commits (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   commit_hash TEXT UNIQUE NOT NULL,
 *   tree_hash TEXT NOT NULL,
 *   parent_hash TEXT,
 *   author_id TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Branches table
 * CREATE TABLE branches (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   ref_name TEXT UNIQUE NOT NULL,
 *   commit_hash TEXT NOT NULL,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Access Control table
 * CREATE TABLE access_control (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES users(id),
 *   resource TEXT NOT NULL,
 *   permission_type TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Transactions table
 * CREATE TABLE transactions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   action TEXT NOT NULL,
 *   user_id UUID REFERENCES users(id),
 *   details JSONB,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */

export default {
    supabase,
    isConfigured,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    syncCommit,
    syncCommits,
    getRemoteCommits,
    syncBranch,
    getRemoteBranches,
    deleteRemoteBranch,
    checkPermission,
    grantPermission,
    logTransaction
};
