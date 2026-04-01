#!/bin/bash

# MyVCS Test Runner
# Unified entry point for all tests

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo "MyVCS Test Runner"
    echo ""
    echo "Usage: ./tests/run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  all       Run all tests (default)"
    echo "  basic     Run basic functionality tests"
    echo "  stress    Run stress tests"
    echo "  quick     Run quick smoke test"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./tests/run.sh           # Run all tests"
    echo "  ./tests/run.sh basic     # Run basic tests only"
    echo "  ./tests/run.sh stress    # Run stress tests only"
}

run_basic() {
    echo -e "${BLUE}Running basic tests...${NC}\n"
    "$SCRIPT_DIR/basic.sh"
}

run_stress() {
    echo -e "${BLUE}Running stress tests...${NC}\n"
    "$SCRIPT_DIR/stress.sh"
}

run_quick() {
    echo -e "${BLUE}Running quick smoke test...${NC}\n"
    "$SCRIPT_DIR/quick.sh"
}

run_all() {
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║       MyVCS Full Test Suite            ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    FAILED=0
    
    echo -e "${BLUE}[1/3] Quick Smoke Test${NC}"
    if "$SCRIPT_DIR/quick.sh"; then
        echo -e "${GREEN}✓ Quick test passed${NC}\n"
    else
        echo -e "${RED}✗ Quick test failed${NC}\n"
        FAILED=1
    fi
    
    echo -e "${BLUE}[2/3] Basic Tests${NC}"
    if "$SCRIPT_DIR/basic.sh"; then
        echo -e "${GREEN}✓ Basic tests passed${NC}\n"
    else
        echo -e "${RED}✗ Basic tests failed${NC}\n"
        FAILED=1
    fi
    
    echo -e "${BLUE}[3/3] Stress Tests${NC}"
    if "$SCRIPT_DIR/stress.sh"; then
        echo -e "${GREEN}✓ Stress tests passed${NC}\n"
    else
        echo -e "${RED}✗ Stress tests failed${NC}\n"
        FAILED=1
    fi
    
    echo ""
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║       All Test Suites Passed! ✓        ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "${RED}╔════════════════════════════════════════╗${NC}"
        echo -e "${RED}║       Some Test Suites Failed ✗        ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════╝${NC}"
        exit 1
    fi
}

# Main
case "${1:-all}" in
    all)
        run_all
        ;;
    basic)
        run_basic
        ;;
    stress)
        run_stress
        ;;
    quick)
        run_quick
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
