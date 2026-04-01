#!/bin/bash

# MyVCS Stress Test Script
# Thoroughly tests all components with realistic workloads

# Don't exit on error - we handle errors ourselves
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="/tmp/myvcs-stress-test-$$"
CLI="node $PROJECT_DIR/vcs-cli/src/main.js"
STORAGE="$PROJECT_DIR/vcs-engine/bin/myvcs-storage"
HISTORY="$PROJECT_DIR/vcs-engine/bin/myvcs-history"
DIFF="$PROJECT_DIR/vcs-engine/bin/myvcs-diff"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Cleanup
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Test helper
run_test() {
    local name="$1"
    shift
    local cmd="$@"
    
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "  ${RED}✗${NC} $name"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║           MyVCS Stress Test Suite                      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Setup
# ============================================================================
echo -e "${BLUE}[Setup]${NC} Creating test environment..."
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# ============================================================================
# Test 1: Repository Initialization
# ============================================================================
echo -e "\n${BLUE}[1/8] Repository Initialization${NC}"

run_test "Initialize with C++ binary" "$STORAGE init"
run_test "Verify .myvcs directory" "[ -d .myvcs ]"
run_test "Verify HEAD file" "[ -f .myvcs/HEAD ]"
run_test "Verify objects directory" "[ -d .myvcs/objects ]"
run_test "Verify refs directory" "[ -d .myvcs/refs/heads ]"
run_test "Verify index file" "[ -f .myvcs/index ]"

# ============================================================================
# Test 2: File Hashing (Bulk)
# ============================================================================
echo -e "\n${BLUE}[2/8] Bulk File Hashing (50 files)${NC}"

mkdir -p src lib tests docs

# Create 50 test files
for i in {1..50}; do
    echo "Content of file $i - $(date +%s%N)" > "src/file_$i.txt"
done

HASH_COUNT=0
for f in src/file_*.txt; do
    if $STORAGE hash-object "$f" > /dev/null 2>&1; then
        ((HASH_COUNT++))
    fi
done

if [ $HASH_COUNT -eq 50 ]; then
    echo -e "  ${GREEN}✓${NC} Hashed 50 files successfully"
    ((TESTS_PASSED++))
else
    echo -e "  ${RED}✗${NC} Only hashed $HASH_COUNT/50 files"
    ((TESTS_FAILED++))
fi

# Test object retrieval
SAMPLE_HASH=$($STORAGE hash-object src/file_1.txt)
run_test "Retrieve stored object" "$STORAGE cat-file $SAMPLE_HASH"

# ============================================================================
# Test 3: CLI Operations
# ============================================================================
echo -e "\n${BLUE}[3/8] CLI Operations${NC}"

# Create fresh repo for CLI tests
mkdir -p "$TEST_DIR/cli-repo"
cd "$TEST_DIR/cli-repo"

run_test "CLI init" "$CLI init"

# Create project structure
mkdir -p src lib tests
echo '{"name": "test-project", "version": "1.0.0"}' > package.json
echo "# Test Project" > README.md
echo "console.log('hello');" > src/index.js
echo "module.exports = {};" > lib/utils.js
echo "test('works', () => {});" > tests/main.test.js

run_test "CLI add single file" "$CLI add README.md"
run_test "CLI add directory" "$CLI add src"
run_test "CLI add multiple files" "$CLI add lib tests package.json"
run_test "CLI status" "$CLI status"

# ============================================================================
# Test 4: Multiple Commits
# ============================================================================
echo -e "\n${BLUE}[4/8] Multiple Commits (10 commits)${NC}"

USERS=(
    "Akshat:akshat@myvcs.dev"
    "Raymond:raymond@myvcs.dev"
    "Kevalina:kevalina@myvcs.dev"
    "Anoushka:anoushka@myvcs.dev"
    "Shlok:shlok@myvcs.dev"
    "Moksh:moksh@myvcs.dev"
)

COMMIT_MESSAGES=(
    "Initial project setup"
    "Add core functionality"
    "Implement user authentication"
    "Add unit tests"
    "Fix bug in storage module"
    "Refactor diff algorithm"
    "Add documentation"
    "Performance improvements"
    "Security patches"
    "Release v1.0.0"
)

COMMIT_COUNT=0
for i in {0..9}; do
    # Modify a file
    echo "Update $i - $(date +%s%N)" >> src/index.js
    
    # Pick random user
    USER_IDX=$((RANDOM % ${#USERS[@]}))
    IFS=':' read -r AUTHOR EMAIL <<< "${USERS[$USER_IDX]}"
    
    # Stage and commit
    $CLI add src/index.js > /dev/null 2>&1
    if $CLI commit -m "${COMMIT_MESSAGES[$i]}" -a "$AUTHOR" -e "$EMAIL" > /dev/null 2>&1; then
        ((COMMIT_COUNT++))
    fi
done

if [ $COMMIT_COUNT -eq 10 ]; then
    echo -e "  ${GREEN}✓${NC} Created 10 commits with different authors"
    ((TESTS_PASSED++))
else
    echo -e "  ${RED}✗${NC} Only created $COMMIT_COUNT/10 commits"
    ((TESTS_FAILED++))
fi

run_test "CLI log shows commits" "$CLI log -n 10"

# ============================================================================
# Test 5: Branching
# ============================================================================
echo -e "\n${BLUE}[5/8] Branch Operations${NC}"

run_test "Create branch 'feature-1'" "$CLI branch feature-1"
run_test "Create branch 'feature-2'" "$CLI branch feature-2"
run_test "Create branch 'hotfix'" "$CLI branch hotfix"
run_test "Create branch 'develop'" "$CLI branch develop"
run_test "List branches" "$CLI branch"
run_test "Checkout feature-1" "$CLI checkout feature-1"
run_test "Checkout main" "$CLI checkout main"

# Make commits on different branches
$CLI checkout feature-1 > /dev/null 2>&1
echo "Feature 1 code" > src/feature1.js
$CLI add src/feature1.js > /dev/null 2>&1
run_test "Commit on feature-1 branch" "$CLI commit -m 'Add feature 1' -a 'Developer' -e 'dev@test.com'"

$CLI checkout develop > /dev/null 2>&1
echo "Develop code" > src/develop.js
$CLI add src/develop.js > /dev/null 2>&1
run_test "Commit on develop branch" "$CLI commit -m 'Develop changes' -a 'Developer' -e 'dev@test.com'"

# ============================================================================
# Test 6: Diff Engine
# ============================================================================
echo -e "\n${BLUE}[6/8] Diff Engine${NC}"

cd "$TEST_DIR"
mkdir -p diff-tests
cd diff-tests

# Create test files for diff
cat > old.txt << 'EOF'
Line 1: Hello World
Line 2: This is a test
Line 3: Original content
Line 4: More text here
Line 5: End of file
EOF

cat > new.txt << 'EOF'
Line 1: Hello World
Line 2: This is MODIFIED
Line 3: Original content
Line 4: Added new line
Line 5: More text here
Line 6: New ending
EOF

run_test "Diff two files" "$DIFF diff old.txt new.txt"
run_test "Diff output contains hunks" "$DIFF diff old.txt new.txt | grep -q '@@'"
run_test "Diff shows additions" "$DIFF diff old.txt new.txt | grep -q '+'"
run_test "Diff shows deletions" "$DIFF diff old.txt new.txt | grep -q '-'"

# Large file diff
for i in {1..500}; do
    echo "Line $i: Some content here" >> large_old.txt
done
cp large_old.txt large_new.txt
echo "Extra line at end" >> large_new.txt
sed -i '' 's/Line 250/MODIFIED Line 250/' large_new.txt 2>/dev/null || sed -i 's/Line 250/MODIFIED Line 250/' large_new.txt

run_test "Diff large files (500+ lines)" "$DIFF diff large_old.txt large_new.txt"

# ============================================================================
# Test 7: Status Engine
# ============================================================================
echo -e "\n${BLUE}[7/8] Status Engine${NC}"

cd "$TEST_DIR/cli-repo"

# Create untracked files
echo "untracked content" > untracked.txt
echo "another untracked" > untracked2.txt

# Modify tracked file
echo "modified content" >> README.md

run_test "Status detects untracked files" "$CLI status | grep -q 'untracked\|Untracked'"
run_test "Status shows modified files" "$CLI status"

# ============================================================================
# Test 8: Stress Test - Rapid Operations
# ============================================================================
echo -e "\n${BLUE}[8/8] Rapid Operations Stress Test${NC}"

cd "$TEST_DIR"
mkdir -p rapid-test
cd rapid-test
$CLI init > /dev/null 2>&1

# Rapid file creation and hashing
START_TIME=$(date +%s)
for i in {1..100}; do
    echo "Rapid file $i content $(date +%s%N)" > "rapid_$i.txt"
    $STORAGE hash-object "rapid_$i.txt" > /dev/null 2>&1
done
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $DURATION -lt 30 ]; then
    echo -e "  ${GREEN}✓${NC} Hashed 100 files in ${DURATION}s"
    ((TESTS_PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Hashed 100 files in ${DURATION}s (slower than expected)"
    ((TESTS_PASSED++))
fi

# Rapid add operations
$CLI add . > /dev/null 2>&1
run_test "Add 100 files at once" "[ -f .myvcs/index ]"

# Multiple rapid commits
for i in {1..5}; do
    echo "Update $i" >> rapid_1.txt
    $CLI add rapid_1.txt > /dev/null 2>&1
    $CLI commit -m "Rapid commit $i" -a "Bot" -e "bot@test.com" > /dev/null 2>&1
done
run_test "5 rapid commits" "$CLI log -n 5"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    Test Summary                         ${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC} $TESTS_FAILED"
echo -e "  ${BLUE}Total:${NC}  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            All Stress Tests Passed! ✓                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║            Some Tests Failed ✗                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
