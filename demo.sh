#!/usr/bin/env bash

set -euo pipefail

# ==============================================================================
# Configuration & Setup
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="node \"$ROOT_DIR/vcs-cli/src/main.js\""
STORAGE="$ROOT_DIR/vcs-engine/bin/myvcs-storage"

# Export storage so the engine can locate it via environment variable
export VCS_STORAGE_BIN="$STORAGE"

WORKDIR="${WORKDIR:-/tmp/myvcs-presentation-demo}"
DELAY="${DELAY:-2}"
LONG_DELAY="${LONG_DELAY:-4}"
WITH_DASHBOARD=false
DASHBOARD_PID=""

# ANSI Color Codes for Presentation Quality
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
CYAN='\033[1;36m'
NC='\033[0m' # No Color

# ==============================================================================
# Help & Argument Parsing
# ==============================================================================

show_help() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS]

MyVCS End-to-End Presentation Demo Script.

Options:
  -h, --help        Show this help message and exit.
  --with-dashboard  Start the web dashboard at the end of the demo for
                    role-based walkthroughs.

Environment Variables:
  WORKDIR           Directory for the demo repository 
                    (default: /tmp/myvcs-presentation-demo)
  DELAY             Pause duration (in seconds) between commands 
                    (default: 2)
  LONG_DELAY        Pause duration (in seconds) for major transitions 
                    (default: 4)

Examples:
  ./$(basename "$0") --with-dashboard
  DELAY=1 LONG_DELAY=2 ./$(basename "$0")
EOF
}

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    --with-dashboard)
      WITH_DASHBOARD=true
      shift
      ;;
    *)
      echo "Unknown parameter passed: $1"
      echo "Use --help for usage instructions."
      exit 1
      ;;
  esac
done

# ==============================================================================
# Helper Functions
# ==============================================================================

say() {
  echo -e "\n${GREEN}============================================================${NC}"
  echo -e "${YELLOW}$1${NC}"
  echo -e "${GREEN}============================================================${NC}"
}

pause_short() {
  sleep "$DELAY"
}

pause_long() {
  sleep "$LONG_DELAY"
}

run_cmd() {
  local title="$1"
  local cmd="$2"
  say "$title"
  echo -e "${CYAN}\$ ${NC}$cmd"
  pause_short
  eval "$cmd"
  pause_short
}

cleanup() {
  if [[ -n "$DASHBOARD_PID" ]] && ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
    echo -e "\n${YELLOW}Cleaning up dashboard process (PID: $DASHBOARD_PID)...${NC}"
    kill "$DASHBOARD_PID"
  fi
}
trap cleanup EXIT

# ==============================================================================
# Demo Flow
# ==============================================================================

say "MyVCS End-to-End Presentation Demo"
echo "Using WORKDIR=$WORKDIR"
echo "Tip: Run with --help to see configuration options."
pause_long

run_cmd "Build + verify test suite before demo" \
  "cd \"$ROOT_DIR\" && make test-all"

run_cmd "Prepare fresh demo repository" \
  "rm -rf \"$WORKDIR\" && mkdir -p \"$WORKDIR\" && cd \"$WORKDIR\""

run_cmd "Show CLI command surface (flags included)" \
  "cd \"$WORKDIR\" && $CLI --help"

run_cmd "Initialize repository" \
  "cd \"$WORKDIR\" && $CLI init"

run_cmd "Create sample project files" \
  "cd \"$WORKDIR\" && mkdir -p src docs && printf '# Demo Project\n' > README.md && printf 'console.log(\"v1\");\n' > src/app.js && printf 'Initial docs\n' > docs/notes.md"

run_cmd "Stage files (single file + directory)" \
  "cd \"$WORKDIR\" && $CLI add README.md && $CLI add src docs"

run_cmd "Inspect status before first commit" \
  "cd \"$WORKDIR\" && $CLI status"

run_cmd "Create first commit with flags (-m -a -e)" \
  "cd \"$WORKDIR\" && $CLI commit -m 'Initial project structure' -a 'Presenter Admin' -e 'admin@demo.dev'"

run_cmd "Change code and inspect diff" \
  "cd \"$WORKDIR\" && printf 'console.log(\"v2 feature prep\");\n' > src/app.js && $CLI diff src/app.js"

run_cmd "Stage + second commit" \
  "cd \"$WORKDIR\" && $CLI add src/app.js && $CLI commit -m 'Update app output' -a 'Presenter Admin' -e 'admin@demo.dev'"

run_cmd "Create and list branches" \
  "cd \"$WORKDIR\" && $CLI branch feature-auth && $CLI branch"

run_cmd "Create + checkout branch in one command (checkout -b)" \
  "cd \"$WORKDIR\" && $CLI checkout feature-dashboard -b"

run_cmd "Commit on feature branch" \
  "cd \"$WORKDIR\" && printf 'feature: dashboard role guard\n' >> docs/notes.md && $CLI add docs/notes.md && $CLI commit -m 'Feature dashboard guard notes' -a 'Feature User' -e 'user@demo.dev'"

run_cmd "Return to main and show branch pointers" \
  "cd \"$WORKDIR\" && $CLI checkout main && $CLI branch"

run_cmd "Show recent history with -n flag" \
  "cd \"$WORKDIR\" && $CLI log -n 6"

run_cmd "Low-level object demo: hash-object + cat-file" \
  "cd \"$WORKDIR\" && printf 'blob demo content\n' > blob.txt && HASH=\$($CLI hash-object -w blob.txt) && echo \"Created object: \$HASH\" && $CLI cat-file \"\$HASH\""

run_cmd "Final status snapshot" \
  "cd \"$WORKDIR\" && $CLI status"

# ==============================================================================
# Dashboard Section
# ==============================================================================

if $WITH_DASHBOARD; then
  say "Start dashboard for role-based view-right walkthrough"
  echo -e "${CYAN}\$ ${NC}cd \"$ROOT_DIR/web-dashboard\" && npm run dev &"
  pause_short
  
  # Start the dashboard and capture PID without a temporary file
  cd "$ROOT_DIR/web-dashboard"
  npm run dev > /tmp/myvcs-dashboard-demo.log 2>&1 &
  DASHBOARD_PID=$!
  
  pause_short
  say "Dashboard running at http://localhost:5173"
  echo "Open browser and demonstrate access by role:"
  echo -e "  ${GREEN}1. Admin${NC}   can open: /, /commits, /branches, /users"
  echo -e "  ${GREEN}2. User${NC}    can open: /, /commits, /branches (users denied)"
  echo -e "  ${GREEN}3. Viewer${NC}  can open: /, /commits (branches/users denied)"
  echo ""
  echo "Use this SQL during presentation to switch your logged-in account role:"
  echo -e "${CYAN}  UPDATE users SET role = 'viewer' WHERE email = '<your-auth-email>';${NC}"
  echo -e "${CYAN}  UPDATE users SET role = 'user'   WHERE email = '<your-auth-email>';${NC}"
  echo -e "${CYAN}  UPDATE users SET role = 'admin'  WHERE email = '<your-auth-email>';${NC}"
  
  # Keep script alive to keep dashboard running until user hits Ctrl+C
  echo -e "\n${YELLOW}Press [CTRL+C] to stop the dashboard and exit.${NC}"
  wait "$DASHBOARD_PID" 2>/dev/null || true
fi

say "Demo complete"
echo "Repository used for presentation: $WORKDIR"
if ! $WITH_DASHBOARD; then
  echo "To rerun with dashboard section: ./$(basename "$0") --with-dashboard"
fi
