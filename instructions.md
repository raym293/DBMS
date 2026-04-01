# MyVCS - Instructions & Commands

Quick reference for common operations and troubleshooting.

---

## Build Commands

### Universal Build (From Project Root)

```bash
make              # Build all components (C++ + npm install)
make install      # Build + install CLI globally as 'myvcs'
make clean        # Clean all builds and node_modules
```

### Individual Components

```bash
make engine       # Build C++ engine only
make cli          # Install CLI dependencies only
make dashboard    # Install dashboard dependencies only
```

---

## Testing

### Test Commands

```bash
make test         # Run basic tests
make test-all     # Run all tests (basic + stress)
make test-quick   # Quick smoke test (~2s)
make test-stress  # Full stress test (~30s)

# Or run directly:
./tests/run.sh          # Run all tests
./tests/run.sh quick    # Quick smoke test
./tests/run.sh basic    # Basic functionality
./tests/run.sh stress   # Stress tests
```

### Test Directory Structure

```
tests/
├── README.md     # Test documentation
├── run.sh        # Unified test runner
├── quick.sh      # Fast smoke test
├── basic.sh      # Core functionality tests
├── stress.sh     # Heavy workload tests
└── seed-data.sql # Supabase test data
```

---

## Running the Dashboard

### Start Development Server

```bash
make run-dash
# Opens at http://localhost:3000/
```

### Stop the Dashboard Server

```bash
# Find and kill the Vite process on port 3000
lsof -i :3000 | grep node | awk '{print $2}' | xargs kill
```

### Build for Production

```bash
make build-dash
# Output: web-dashboard/dist/
```

---

## Using the CLI

After `make install`, the `myvcs` command is available globally:

```bash
# Initialize a new repository
myvcs init

# Stage files
myvcs add <file>
myvcs add .              # Add all files

# Check status
myvcs status

# Commit changes
myvcs commit -m "message" -a "Author Name" -e "email@example.com"

# View history
myvcs log

# Branching
myvcs branch <name>      # Create branch
myvcs branch             # List branches
myvcs checkout <branch>  # Switch branch

# Show diff
myvcs diff [file]
```

---

## C++ Engine Direct Usage

Binaries are in `vcs-engine/bin/` after building:

```bash
# Initialize repository
./vcs-engine/bin/myvcs-storage init

# Hash and store a file
./vcs-engine/bin/myvcs-storage hash-object <file>

# Retrieve stored object
./vcs-engine/bin/myvcs-storage cat-file <hash>

# Compare two files
./vcs-engine/bin/myvcs-diff diff <file1> <file2>

# Show repository status
./vcs-engine/bin/myvcs-diff status
```

---

## Supabase Setup

### 1. Create Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Database Schema

In Supabase SQL Editor, paste and run the contents of `supabase-schema.sql`.

### 3. Get Credentials

Project Settings → API → Copy:
- Project URL
- anon/public key (safe for frontend)
- service_role key (admin only - NEVER expose in frontend)

### 4. Configure Environment Files

**vcs-cli/.env** (for CLI operations)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...  # Optional: for seeding data
```

**web-dashboard/.env** (for frontend - anon key only!)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 5. Seed Test Data

**Option 1: Using the seed script** (requires service_role key in CLI .env)
```bash
cd vcs-cli && node src/seed.js
```

**Option 2: Run SQL directly** in Supabase SQL Editor
```sql
-- Copy contents of tests/seed-data.sql
```

This creates:
- 6 users (akshat, raymond, kevalina, anoushka, shlok, moksh)
- 5 branches (main, develop, feature/auth, etc.)
- 10 commits with full history
- 8 audit log entries

### Key Security Notes

| Key | Purpose | Safe for Frontend? |
|-----|---------|-------------------|
| anon key | Read public data, user auth | ✅ Yes |
| service_role key | Bypass RLS, admin ops | ❌ Never! |

---

## Cleaning Up

```bash
# Clean everything (C++ builds + node_modules)
make clean

# Clean only C++ builds (faster)
make clean-engine

# Uninstall global CLI
make uninstall
```

---

## Troubleshooting

### OpenSSL Not Found (macOS)

```bash
brew install openssl
# Makefile auto-detects Homebrew OpenSSL path
```

### CLI Command Not Found After Install

```bash
# Check npm global bin is in PATH
npm bin -g
# Add to PATH if needed:
export PATH="$(npm bin -g):$PATH"
```

### Dashboard Shows Empty Data

This is expected without Supabase credentials. Configure `.env` files to see real data.

### Port 3000 Already in Use

```bash
# Kill existing process
lsof -i :3000 | grep node | awk '{print $2}' | xargs kill
# Or use different port
cd web-dashboard && npm run dev -- --port 3001
```

---

## File Locations

| Item | Path |
|------|------|
| C++ Binaries | `vcs-engine/bin/` |
| CLI Entry | `vcs-cli/src/main.js` |
| CLI Seed Script | `vcs-cli/src/seed.js` |
| Dashboard | `web-dashboard/src/` |
| Supabase Schema | `supabase-schema.sql` |
| Test Scripts | `tests/` |
| Test Seed Data | `tests/seed-data.sql` |
| Environment Examples | `*/.env.example` |
