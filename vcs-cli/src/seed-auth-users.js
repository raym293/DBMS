/**
 * Seed Supabase Auth users with known demo credentials and sync public.users.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in vcs-cli/.env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const USERS = [
    { username: 'akshat', email: 'akshat@myvcs.dev', role: 'admin', password: 'MyVCS!2026_Akshat' },
    { username: 'raymond', email: 'raymond@myvcs.dev', role: 'admin', password: 'MyVCS!2026_Raymond' },
    { username: 'viewer', email: 'viewer@myvcs.dev', role: 'viewer', password: 'MyVCS!2026_Viewer' },
    { username: 'kevalina', email: 'kevalina@myvcs.dev', role: 'user', password: 'MyVCS!2026_Kevalina' },
    { username: 'anoushka', email: 'anoushka@myvcs.dev', role: 'user', password: 'MyVCS!2026_Anoushka' },
    { username: 'shlok', email: 'shlok@myvcs.dev', role: 'user', password: 'MyVCS!2026_Shlok' },
    { username: 'moksh', email: 'moksh@myvcs.dev', role: 'user', password: 'MyVCS!2026_Moksh' },
];

const ROLE_RESOURCES = {
    admin: ['dashboard', 'commits', 'branches', 'users'],
    user: ['dashboard', 'commits', 'branches'],
    viewer: ['dashboard', 'commits'],
};

const ROLE_PERMISSION = {
    admin: 'admin',
    user: 'read',
    viewer: 'read',
};

async function findAuthUserByEmail(email) {
    let page = 1;
    const perPage = 100;

    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        const users = data?.users || [];
        const existing = users.find((u) => u.email === email);
        if (existing) return existing;

        if (users.length < perPage) return null;
        page += 1;
    }
}

async function upsertAuthUser(user) {
    const existing = await findAuthUserByEmail(user.email);

    if (existing) {
        const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { username: user.username },
        });
        if (error) throw error;
        return data.user;
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { username: user.username },
    });
    if (error) throw error;
    return data.user;
}

async function syncProfile(authUser, user) {
    const { data: existing, error: existingError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', user.email)
        .maybeSingle();
    if (existingError) throw existingError;

    if (existing && existing.id !== authUser.id) {
        const { error: deleteError } = await supabase.from('users').delete().eq('email', user.email);
        if (deleteError) throw deleteError;
    }

    const { error } = await supabase.from('users').upsert(
        {
            id: authUser.id,
            email: user.email,
            username: user.username,
            role: user.role,
        },
        { onConflict: 'id' }
    );
    if (error) throw error;
}

async function syncAccessControl(authUser, user) {
    const { error: deleteError } = await supabase
        .from('access_control')
        .delete()
        .eq('user_id', authUser.id);
    if (deleteError) throw deleteError;

    const resources = ROLE_RESOURCES[user.role] || [];
    if (resources.length === 0) return;

    const permission = ROLE_PERMISSION[user.role] || 'read';
    const rows = resources.map((resource) => ({
        user_id: authUser.id,
        resource,
        permission_type: permission,
    }));

    const { error: insertError } = await supabase.from('access_control').insert(rows);
    if (insertError) throw insertError;
}

async function seedAuthUsers() {
    console.log('Seeding Supabase Auth users and profile permissions...\n');

    for (const user of USERS) {
        const authUser = await upsertAuthUser(user);
        await syncProfile(authUser, user);
        await syncAccessControl(authUser, user);
        console.log(`✓ ${user.email} (${user.role})`);
    }

    console.log('\nDone. Demo credentials are in credentials.md');
}

seedAuthUsers().catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exit(1);
});
