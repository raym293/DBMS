/**
 * MyVCS Database Seeder
 * Seeds Supabase with test users, commits, and branches
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY  // Use service key to bypass RLS
);

async function seed() {
    console.log('🌱 Seeding MyVCS database...\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('access_control').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('commits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('branches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert users
    console.log('Creating users...');
    const users = [
        { username: 'akshat', email: 'akshat@myvcs.dev', role: 'admin' },
        { username: 'raymond', email: 'raymond@myvcs.dev', role: 'admin' },
        { username: 'kevalina', email: 'kevalina@myvcs.dev', role: 'user' },
        { username: 'anoushka', email: 'anoushka@myvcs.dev', role: 'user' },
        { username: 'shlok', email: 'shlok@myvcs.dev', role: 'user' },
        { username: 'moksh', email: 'moksh@myvcs.dev', role: 'user' },
    ];

    const { data: insertedUsers, error: userError } = await supabase
        .from('users')
        .insert(users)
        .select();

    if (userError) {
        console.error('Error inserting users:', userError.message);
        return;
    }
    console.log(`  ✓ Created ${insertedUsers.length} users`);

    // Insert branches
    console.log('Creating branches...');
    const branches = [
        { ref_name: 'main', commit_hash: 'a1b2c3d4e5f6789012345678901234567890abcd' },
        { ref_name: 'develop', commit_hash: 'f6789012345678901234567890abcdef012345' },
        { ref_name: 'feature/auth', commit_hash: 'c3d4e5f6789012345678901234567890abcdef' },
        { ref_name: 'feature/dashboard', commit_hash: 'd4e5f6789012345678901234567890abcdef01' },
        { ref_name: 'hotfix/urgent', commit_hash: 'e5f6789012345678901234567890abcdef0123' },
    ];

    const { data: insertedBranches, error: branchError } = await supabase
        .from('branches')
        .insert(branches)
        .select();

    if (branchError) {
        console.error('Error inserting branches:', branchError.message);
        return;
    }
    console.log(`  ✓ Created ${insertedBranches.length} branches`);

    // Insert commits
    console.log('Creating commits...');
    const commits = [
        { commit_hash: 'a1b2c3d4e5f6789012345678901234567890abcd', tree_hash: 'tree1234567890', parent_hash: null, author_id: 'akshat', message: 'Initial commit' },
        { commit_hash: 'b2c3d4e5f6789012345678901234567890abcde', tree_hash: 'tree2345678901', parent_hash: 'a1b2c3d4e5f6789012345678901234567890abcd', author_id: 'raymond', message: 'Add storage module with SHA-1 hashing' },
        { commit_hash: 'c3d4e5f6789012345678901234567890abcdef', tree_hash: 'tree3456789012', parent_hash: 'b2c3d4e5f6789012345678901234567890abcde', author_id: 'shlok', message: 'Implement LCS-based diff algorithm' },
        { commit_hash: 'd4e5f6789012345678901234567890abcdef01', tree_hash: 'tree4567890123', parent_hash: 'c3d4e5f6789012345678901234567890abcdef', author_id: 'kevalina', message: 'Add staging area and index management' },
        { commit_hash: 'e5f6789012345678901234567890abcdef0123', tree_hash: 'tree5678901234', parent_hash: 'd4e5f6789012345678901234567890abcdef01', author_id: 'anoushka', message: 'Implement branch and ref management' },
        { commit_hash: 'f6789012345678901234567890abcdef012345', tree_hash: 'tree6789012345', parent_hash: 'e5f6789012345678901234567890abcdef0123', author_id: 'moksh', message: 'Add Supabase integration and CLI' },
        { commit_hash: '789012345678901234567890abcdef01234567', tree_hash: 'tree7890123456', parent_hash: 'f6789012345678901234567890abcdef012345', author_id: 'akshat', message: 'Fix zlib compression edge case' },
        { commit_hash: '89012345678901234567890abcdef0123456789', tree_hash: 'tree8901234567', parent_hash: '789012345678901234567890abcdef01234567', author_id: 'raymond', message: 'Add commit-tree and Merkle tree support' },
        { commit_hash: '9012345678901234567890abcdef012345678901', tree_hash: 'tree9012345678', parent_hash: '89012345678901234567890abcdef0123456789', author_id: 'shlok', message: 'Optimize diff performance for large files' },
        { commit_hash: '012345678901234567890abcdef0123456789012', tree_hash: 'tree0123456789', parent_hash: '9012345678901234567890abcdef012345678901', author_id: 'moksh', message: 'Release v1.0.0 🚀' },
    ];

    const { data: insertedCommits, error: commitError } = await supabase
        .from('commits')
        .insert(commits)
        .select();

    if (commitError) {
        console.error('Error inserting commits:', commitError.message);
        return;
    }
    console.log(`  ✓ Created ${insertedCommits.length} commits`);

    // Insert transactions (audit log)
    console.log('Creating transaction log...');
    const transactions = [
        { action: 'user_create', details: { username: 'akshat', role: 'admin' } },
        { action: 'commit', details: { hash: 'a1b2c3d4', message: 'Initial commit', author: 'akshat' } },
        { action: 'branch_create', details: { name: 'develop', from: 'main' } },
        { action: 'commit', details: { hash: 'b2c3d4e5', message: 'Add storage module', author: 'raymond' } },
        { action: 'commit', details: { hash: 'c3d4e5f6', message: 'Implement diff', author: 'shlok' } },
        { action: 'branch_create', details: { name: 'feature/auth', from: 'develop' } },
        { action: 'commit', details: { hash: 'd4e5f6', message: 'Add staging', author: 'kevalina' } },
        { action: 'commit', details: { hash: 'e5f678', message: 'Implement branching', author: 'anoushka' } },
    ];

    const { data: insertedTx, error: txError } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();

    if (txError) {
        console.error('Error inserting transactions:', txError.message);
    } else {
        console.log(`  ✓ Created ${insertedTx.length} transaction records`);
    }

    // Summary
    console.log('\n✅ Database seeded successfully!\n');
    console.log('Summary:');
    console.log(`  Users:        ${insertedUsers.length}`);
    console.log(`  Branches:     ${insertedBranches.length}`);
    console.log(`  Commits:      ${insertedCommits.length}`);
    console.log(`  Transactions: ${insertedTx?.length || 0}`);
}

seed().catch(console.error);
