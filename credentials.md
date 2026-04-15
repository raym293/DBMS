# MyVCS Demo Login Credentials

Use these credentials on `/login` for presentation accounts.

| Username | Email | Password | Role |
|---|---|---|---|
| akshat | akshat@myvcs.dev | MyVCS!2026_Akshat | admin |
| raymond | raymond@myvcs.dev | MyVCS!2026_Raymond | admin |
| viewer | viewer@myvcs.dev | MyVCS!2026_Viewer | viewer |
| kevalina | kevalina@myvcs.dev | MyVCS!2026_Kevalina | user |
| anoushka | anoushka@myvcs.dev | MyVCS!2026_Anoushka | user |
| shlok | shlok@myvcs.dev | MyVCS!2026_Shlok | user |
| moksh | moksh@myvcs.dev | MyVCS!2026_Moksh | user |

## Provisioning command

From repo root:

```bash
cd vcs-cli
npm run seed:auth-users
```

This creates/updates Supabase Auth users, syncs `public.users`, and refreshes `access_control` grants for each role.
