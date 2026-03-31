# MyVCS - Custom Version Control System

A modular version control system built with C++, Node.js, and React.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Dashboard (React)                     │
│                    Visualizes Supabase metadata                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                         Supabase                                 │
│         Users, Access Control, Commit/Branch Metadata            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      Node.js CLI (vcs-cli)                       │
│              Orchestrates commands, spawns C++ binaries          │
│  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌───────────────┐    │
│  │ main.js  │  │staging.js │  │ refs.js │  │ supabase.js   │    │
│  │ (Moksh)  │  │(Kevalina) │  │(Anoushka)│ │   (Moksh)     │    │
│  └──────────┘  └───────────┘  └─────────┘  └───────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ spawns
┌─────────────────────────────▼───────────────────────────────────┐
│                    C++ Engine (vcs-engine)                       │
│           High-performance hashing, compression, diffing         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ storage.cpp │  │ history.cpp │  │  diff.cpp   │              │
│  │  (Akshat)   │  │  (Raymond)  │  │   (Shlok)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     Local File System                            │
│                .myvcs/objects/, .myvcs/refs/, .myvcs/index       │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
DBMS/
├── vcs-engine/           # C++ core engine
│   ├── src/
│   │   ├── storage.cpp   # Object storage (SHA-1, zlib)
│   │   ├── history.cpp   # Tree & commit architecture
│   │   └── diff.cpp      # Diff & status engine
│   ├── include/
│   │   ├── storage.h
│   │   ├── history.h
│   │   └── diff.h
│   ├── bin/              # Compiled binaries
│   └── Makefile
├── vcs-cli/              # Node.js CLI
│   ├── src/
│   │   ├── main.js       # CLI entry point
│   │   ├── staging.js    # Index management
│   │   ├── refs.js       # Branch/ref manager
│   │   └── supabase.js   # DB integration
│   └── package.json
├── web-dashboard/        # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── pages/
│   └── package.json
└── README.md
```

## Team Members & Modules

| Module | Author | Tech | Description |
|--------|--------|------|-------------|
| Object Storage | Akshat | C++ | SHA-1 hashing, zlib compression, blob storage |
| Tree & Commit | Raymond | C++ | Merkle trees, commit chain |
| Diff Engine | Shlok | C++ | Line-by-line diff, status comparison |
| CLI Entry | Moksh | Node.js | CLI framework, C++ process spawning |
| Staging | Kevalina | Node.js | Index file management, add command |
| Refs Manager | Anoushka | Node.js | Branch pointers, log command |
| Supabase | Moksh | Node.js | Auth, metadata sync |

## Entity-Relationship Diagram

### Core Entities
- **RECORD_VERSION** - Versioned data records
- **PAGE** - Storage pages
- **TABLE_META** - Table metadata
- **TREE** - Directory structure representation
- **TREE_ENTRY** - File/directory entries in a tree
- **COMMIT** - Snapshot with tree_hash, parent_hash, author_id, message
- **BRANCH** - Named reference to a commit
- **REFERENCE** - General ref pointer
- **HEAD** - Current branch/commit pointer

### User Entities (Supabase)
- **USER** - User accounts
- **ACCESS_CONTROL** - Permissions
- **TRANSACTION** - Audit log

## Commands

```bash
myvcs init              # Initialize repository
myvcs add <file>        # Stage file
myvcs commit -m "msg"   # Create commit
myvcs status            # Show working tree status
myvcs diff [file]       # Show changes
myvcs log               # Show commit history
myvcs branch <name>     # Create branch
myvcs checkout <ref>    # Switch branch/restore files
```

## Prerequisites

### macOS
```bash
# Install OpenSSL and zlib via Homebrew
brew install openssl zlib

# Node.js 18+ required
node --version
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install libssl-dev zlib1g-dev build-essential
```

## Building

### C++ Engine
```bash
cd vcs-engine
make          # Build all binaries to bin/
make clean    # Remove all build artifacts
make debug    # Build with debug symbols
```

**Note:** On macOS, the Makefile automatically detects OpenSSL installed via Homebrew.

Binaries are output to `vcs-engine/bin/`:
- `myvcs-storage` - Object hashing & compression
- `myvcs-history` - Tree & commit operations  
- `myvcs-diff` - Diff & status engine

### Node.js CLI
```bash
cd vcs-cli
npm install
npm link  # Makes 'myvcs' available globally
```

### React Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```

## Configuration

Create `.env` files with your Supabase credentials:

**vcs-cli/.env**
```
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

**web-dashboard/.env**
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

### Quick Test (All Components)

Run the automated test script from the project root:

```bash
./test.sh
```

This tests: C++ build, storage, diff, history, Node.js CLI, and React dashboard config.

### Manual Testing

#### 1. Test C++ Engine

```bash
# Create a test directory
mkdir /tmp/vcs-test && cd /tmp/vcs-test

# Initialize repository
./vcs-engine/bin/myvcs-storage init
# Output: Initialized empty MyVCS repository in /tmp/vcs-test/.myvcs

# Create and hash a file
echo "Hello World" > hello.txt
./vcs-engine/bin/myvcs-storage hash-object hello.txt
# Output: 557db03de997c86a4a028e1ebd3a1ceb225be238

# Retrieve the stored object
./vcs-engine/bin/myvcs-storage cat-file 557db03de997c86a4a028e1ebd3a1ceb225be238
# Output: Hello World

# Test diff between two files
echo "Line 1" > old.txt
echo "Line 2" > new.txt
./vcs-engine/bin/myvcs-diff diff old.txt new.txt

# Check repository status
./vcs-engine/bin/myvcs-diff status
```

#### 2. Test Node.js CLI

```bash
# Install dependencies
cd vcs-cli
npm install

# Test without global install
node src/main.js --help

# Or install globally
npm link

# Create a test project
mkdir /tmp/myproject && cd /tmp/myproject

# Initialize
myvcs init

# Create some files
echo "# My Project" > README.md
echo "console.log('hello')" > index.js

# Stage files
myvcs add README.md
myvcs add index.js
# Or add all: myvcs add .

# Check status
myvcs status

# Commit
myvcs commit -m "Initial commit" -a "Your Name" -e "you@example.com"

# View history
myvcs log

# Create and switch branches
myvcs branch feature-1
myvcs checkout feature-1

# List branches
myvcs branch
```

#### 3. Test React Dashboard

```bash
cd web-dashboard
npm install
npm run dev
# Opens http://localhost:3000
```

**Pages to test:**
- `/` - Dashboard with stats
- `/commits` - Commit history table
- `/branches` - Branch cards
- `/users` - User list with permissions
- `/login` - Authentication form

> **Note:** Without Supabase credentials, pages show "No data" states. This is expected.

### Testing with Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Run the schema in SQL Editor:
   ```sql
   -- Copy contents of supabase-schema.sql
   ```

3. Get your credentials from Project Settings > API

4. Configure environment files:
   ```bash
   # vcs-cli/.env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   
   # web-dashboard/.env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

5. Test sync:
   ```bash
   cd /tmp/myproject
   myvcs commit -m "Test sync" -a "User" -e "user@test.com"
   # Commit metadata syncs to Supabase
   ```

6. View in dashboard:
   ```bash
   cd web-dashboard && npm run dev
   # Navigate to /commits to see synced data
   ```

### Expected Test Results

| Component | Test | Expected Output |
|-----------|------|-----------------|
| Storage | `init` | Creates `.myvcs/` with HEAD, index, objects/, refs/ |
| Storage | `hash-object` | Returns 40-char SHA-1 hash |
| Storage | `cat-file` | Returns original file content |
| Diff | `diff` | Shows unified diff with `@@` hunks |
| Diff | `status` | Lists modified/untracked files |
| CLI | `init` | Creates `.myvcs/` directory |
| CLI | `add` | Updates `.myvcs/index` |
| CLI | `commit` | Creates commit, updates branch ref |
| CLI | `log` | Shows commit history |
| Dashboard | Load | Shows navigation and empty states |

## License

MIT
