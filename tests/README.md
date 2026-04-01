# MyVCS Test Suite

Organized test scripts for validating all MyVCS components.

## Quick Start

```bash
# Run all tests
./tests/run.sh

# Or use make
make test        # Basic tests only
make test-all    # All tests (basic + stress)
make test-stress # Stress tests only
make test-quick  # Quick smoke test
```

## Test Scripts

| Script | Purpose | Duration |
|--------|---------|----------|
| `quick.sh` | Fast smoke test - verify binaries work | ~2s |
| `basic.sh` | Core functionality tests | ~10s |
| `stress.sh` | Heavy workload, bulk operations | ~30s |
| `run.sh` | Unified runner for all tests | varies |

## What Each Test Covers

### quick.sh
- C++ binaries exist and are executable
- CLI loads without errors
- Init creates `.myvcs` directory
- Hash-object produces valid SHA-1
- Diff generates output

### basic.sh
- C++ engine build verification
- Storage: init, hash-object, cat-file
- Diff: file comparison, status
- History: write-tree
- CLI: init, add, status
- Dashboard: configuration check

### stress.sh
- Repository initialization (6 checks)
- Bulk file hashing (50 files)
- CLI operations (add, status, commit)
- Multiple commits (10 commits, 6 authors)
- Branch operations (create, checkout, commit)
- Diff engine (various file sizes)
- Status engine (untracked, modified)
- Rapid operations (100 files, 5 rapid commits)

## Adding New Tests

1. Create a new script in `tests/`
2. Follow the pattern of existing scripts
3. Use colors for output: `$GREEN`, `$RED`, `$YELLOW`, `$NC`
4. Clean up temp files on exit with `trap cleanup EXIT`
5. Add to `run.sh` if it should run with `test-all`

## Troubleshooting

**Tests fail on "binaries not found":**
```bash
make engine  # Build C++ components first
```

**Tests fail on "node modules not found":**
```bash
make cli     # Install CLI dependencies
```

**Permission denied:**
```bash
chmod +x tests/*.sh
```
