#!/bin/bash

# MyVCS Quick Smoke Test
# Fast sanity check that everything is working

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="/tmp/myvcs-quick-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

cleanup() {
    rm -rf "$TEST_DIR" 2>/dev/null
}
trap cleanup EXIT

echo "Quick Smoke Test"
echo "================"

PASSED=0
FAILED=0

# Test 1: Binaries exist
echo -n "C++ binaries exist... "
if [ -f "$PROJECT_DIR/vcs-engine/bin/myvcs-storage" ] && \
   [ -f "$PROJECT_DIR/vcs-engine/bin/myvcs-history" ] && \
   [ -f "$PROJECT_DIR/vcs-engine/bin/myvcs-diff" ]; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAILED++))
fi

# Test 2: CLI loads
echo -n "CLI loads... "
if node "$PROJECT_DIR/vcs-cli/src/main.js" --help > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAILED++))
fi

# Test 3: Init works
echo -n "Init repository... "
mkdir -p "$TEST_DIR" && cd "$TEST_DIR"
if "$PROJECT_DIR/vcs-engine/bin/myvcs-storage" init > /dev/null 2>&1 && [ -d ".myvcs" ]; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAILED++))
fi

# Test 4: Hash works
echo -n "Hash file... "
echo "test" > test.txt
if "$PROJECT_DIR/vcs-engine/bin/myvcs-storage" hash-object test.txt > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAILED++))
fi

# Test 5: Diff works
echo -n "Diff files... "
echo "old" > old.txt
echo "new" > new.txt
if "$PROJECT_DIR/vcs-engine/bin/myvcs-diff" diff old.txt new.txt > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "Results: $PASSED passed, $FAILED failed"

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
