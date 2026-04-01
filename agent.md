# MyVCS - Agent Guidelines

Instructions for AI agents working on this codebase.

---

## Project Overview

MyVCS is a custom Version Control System with three components:

1. **C++ Engine** (`vcs-engine/`) - High-performance core for hashing, compression, diffing
2. **Node.js CLI** (`vcs-cli/`) - User-facing command line interface
3. **React Dashboard** (`web-dashboard/`) - Web UI for viewing Supabase metadata

---

## Architecture

```
User → CLI (Node.js) → spawns → C++ Binaries
                    ↓
               Supabase (metadata sync)
                    ↓
            React Dashboard (visualization)
```

The CLI orchestrates commands and spawns C++ binaries for performance-heavy operations (hashing, diffing). Supabase stores user/commit/branch metadata. The dashboard visualizes this data.

---

## Module Ownership

| Module | File | Author | Purpose |
|--------|------|--------|---------|
| Storage | `vcs-engine/src/storage.cpp` | Akshat | SHA-1 hashing, zlib compression, blob storage |
| History | `vcs-engine/src/history.cpp` | Raymond | Merkle trees, commit objects |
| Diff | `vcs-engine/src/diff.cpp` | Shlok | Line-by-line diff, status comparison |
| CLI Main | `vcs-cli/src/main.js` | Moksh | Command routing, C++ process spawning |
| Staging | `vcs-cli/src/staging.js` | Kevalina | Index file management |
| Refs | `vcs-cli/src/refs.js` | Anoushka | Branch/HEAD management |
| Supabase | `vcs-cli/src/supabase.js` | Moksh | Auth and metadata sync |
| Seed Script | `vcs-cli/src/seed.js` | - | Database seeding utility |

---

## Build System

Always use the root Makefile for builds:

```bash
make              # Build everything
make install      # Build + install CLI globally
make test         # Run test suite
make clean        # Clean all builds
```

Do NOT cd into subdirectories to build unless working on a specific component.

---

## C++ Compilation Notes

- **Compiler**: clang++ (macOS) with C++17
- **Dependencies**: OpenSSL (SHA-1), zlib (compression)
- **OpenSSL Path**: Auto-detected via `brew --prefix openssl`
- **Build Output**: `vcs-engine/bin/` and `vcs-engine/obj/`

When modifying C++ code:
1. Headers go in `vcs-engine/include/`
2. Implementation in `vcs-engine/src/`
3. The `STORAGE_LIB_ONLY` macro excludes main() when compiling as library
4. History and Diff binaries link against storage_lib.o

---

## Node.js Notes

- **ES Modules**: All files use `import`/`export` (type: "module" in package.json)
- **CLI Framework**: Commander.js
- **Entry Point**: `vcs-cli/src/main.js` (has shebang for global install)

When the CLI needs heavy computation, it spawns C++ binaries:
```javascript
import { spawnCppBinary } from './utils.js';
const result = await spawnCppBinary('myvcs-storage', ['hash-object', file], cwd);
```

---

## React Dashboard Notes

- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router DOM
- **State**: Local state (no Redux)

Pages are in `web-dashboard/src/pages/`. Supabase client is in `web-dashboard/src/lib/supabase.js`.

---

## Testing

Always run tests after making changes:

```bash
make test         # Basic test suite
make test-all     # All tests (basic + stress)
make test-quick   # Quick smoke test (~2s)
make test-stress  # Full stress test (~30s)
```

### Test Structure

```
tests/
├── run.sh        # Unified runner
├── quick.sh      # Smoke test (5 checks)
├── basic.sh      # Core functionality (builds, storage, diff, CLI)
├── stress.sh     # Heavy workload (50+ files, 10 commits, branches)
└── seed-data.sql # Supabase test data
```

### What Tests Cover

- **quick**: Binaries exist, CLI loads, init/hash/diff work
- **basic**: Full build, storage ops, diff engine, CLI commands, dashboard config
- **stress**: Bulk hashing (50 files), multi-user commits, branching, rapid operations

---

## Supabase Integration

### Key Types

| Key | Purpose | Where to Use |
|-----|---------|--------------|
| anon key | Public read, user auth | Frontend (dashboard), CLI |
| service_role key | Bypass RLS, admin ops | CLI only (seeding, admin) |

**⚠️ Never put service_role key in frontend code!**

### Seeding Test Data

**Option 1:** Run the seed script (requires service_role key in CLI .env)
```bash
cd vcs-cli && node src/seed.js
```

**Option 2:** Run `tests/seed-data.sql` in Supabase SQL Editor

This populates:
- 6 team members (users)
- 10 commits with realistic messages
- 5 branches (main, develop, features)
- 8 audit log entries

---

## Sensitive Files

Never commit these (handled by .gitignore):
- `.env` files (contain Supabase credentials)
- `vcs-engine/bin/` (compiled binaries)
- `node_modules/`
- `.myvcs/` directories (test repositories)

---

## Common Tasks

### Adding a New CLI Command

1. Add command definition in `vcs-cli/src/main.js`
2. Implement logic in appropriate module (staging.js, refs.js, etc.)
3. If heavy computation needed, consider C++ implementation

### Adding a New C++ Feature

1. Add function declaration to header (`include/*.h`)
2. Implement in source file (`src/*.cpp`)
3. If new binary, add target to `vcs-engine/Makefile`
4. Run `make clean && make` to rebuild

### Adding a Dashboard Page

1. Create component in `web-dashboard/src/pages/`
2. Add route in `web-dashboard/src/App.jsx`
3. Add nav link in `web-dashboard/src/components/Layout.jsx`

---

## Key Files

| Purpose | File |
|---------|------|
| Root build | `Makefile` |
| C++ build | `vcs-engine/Makefile` |
| CLI entry | `vcs-cli/src/main.js` |
| CLI seed | `vcs-cli/src/seed.js` |
| Dashboard entry | `web-dashboard/src/main.jsx` |
| DB schema | `supabase-schema.sql` |
| Test suite | `tests/` |
| Seed data | `tests/seed-data.sql` |
| Instructions | `instructions.md` |

---

## Conventions

- **Naming**: Use ER diagram names (commit_hash, ref_name, user_id, tree_hash)
- **Comments**: Only where clarification needed
- **Error Handling**: Always return {success, error} objects from functions
- **Async**: Use async/await, not callbacks
