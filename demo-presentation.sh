#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="node \"$ROOT_DIR/vcs-cli/src/main.js\""
STORAGE="$ROOT_DIR/vcs-engine/bin/myvcs-storage"
WORKDIR="${WORKDIR:-/tmp/myvcs-presentation-demo}"
DELAY="${DELAY:-2}"
LONG_DELAY="${LONG_DELAY:-4}"
WITH_DASHBOARD=false
DASHBOARD_PID=""

if [[ "${1:-}" == "--with-dashboard" ]]; then
  WITH_DASHBOARD=true
fi

say() {
  echo ""
  echo "============================================================"
  echo "$1"
  echo "============================================================"
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
  echo "\$ $cmd"
  pause_short
  eval "$cmd"
  pause_short
}

cleanup() {
  if [[ -n "$DASHBOARD_PID" ]] && ps -p "$DASHBOARD_PID" > /dev/null 2>&1; then
    kill "$DASHBOARD_PID"
  fi
}
trap cleanup EXIT

say "MyVCS End-to-End Presentation Demo"
echo "Using WORKDIR=$WORKDIR"
echo "Tip: set DELAY=1 LONG_DELAY=2 for faster runs."
pause_long

run_cmd "Build + verify test suite before demo" "cd \"$ROOT_DIR\" && make test-all"

run_cmd "Prepare fresh demo repository" "rm -rf \"$WORKDIR\" && mkdir -p \"$WORKDIR\" && cd \"$WORKDIR\""
run_cmd "Show CLI command surface (flags included)" "cd \"$WORKDIR\" && $CLI --help"

run_cmd "Initialize repository" "cd \"$WORKDIR\" && $CLI init"
run_cmd "Create sample project files" "cd \"$WORKDIR\" && mkdir -p src docs && printf '# Demo Project\n' > README.md && printf 'console.log(\"v1\");\n' > src/app.js && printf 'Initial docs\n' > docs/notes.md"

run_cmd "Stage files (single file + directory)" "cd \"$WORKDIR\" && $CLI add README.md && $CLI add src docs"
run_cmd "Inspect status before first commit" "cd \"$WORKDIR\" && $CLI status"
run_cmd "Create first commit with flags (-m -a -e)" "cd \"$WORKDIR\" && $CLI commit -m 'Initial project structure' -a 'Presenter Admin' -e 'admin@demo.dev'"

run_cmd "Change code and inspect diff" "cd \"$WORKDIR\" && printf 'console.log(\"v2 feature prep\");\n' > src/app.js && $CLI diff src/app.js"
run_cmd "Stage + second commit" "cd \"$WORKDIR\" && $CLI add src/app.js && $CLI commit -m 'Update app output' -a 'Presenter Admin' -e 'admin@demo.dev'"

run_cmd "Create and list branches" "cd \"$WORKDIR\" && $CLI branch feature-auth && $CLI branch"
run_cmd "Create + checkout branch in one command (checkout -b)" "cd \"$WORKDIR\" && $CLI checkout feature-dashboard -b"
run_cmd "Commit on feature branch" "cd \"$WORKDIR\" && printf 'feature: dashboard role guard\n' >> docs/notes.md && $CLI add docs/notes.md && $CLI commit -m 'Feature dashboard guard notes' -a 'Feature User' -e 'user@demo.dev'"

run_cmd "Return to main and show branch pointers" "cd \"$WORKDIR\" && $CLI checkout main && $CLI branch"
run_cmd "Show recent history with -n flag" "cd \"$WORKDIR\" && $CLI log -n 6"

run_cmd "Low-level object demo: hash-object + cat-file" "cd \"$WORKDIR\" && printf 'blob demo content\n' > blob.txt && HASH=\$($CLI hash-object -w blob.txt) && echo \"Created object: \$HASH\" && $CLI cat-file \"\$HASH\""

run_cmd "Final status snapshot" "cd \"$WORKDIR\" && $CLI status"

if $WITH_DASHBOARD; then
  run_cmd "Start dashboard for role-based view-right walkthrough" "cd \"$ROOT_DIR/web-dashboard\" && npm run dev > /tmp/myvcs-dashboard-demo.log 2>&1 & echo \$! > /tmp/myvcs-dashboard-demo.pid"
  DASHBOARD_PID="$(cat /tmp/myvcs-dashboard-demo.pid)"
  say "Dashboard running at http://localhost:5173"
  echo "Open browser and demonstrate access by role:"
  echo "1. Admin can open: /, /commits, /branches, /users"
  echo "2. User can open: /, /commits, /branches (users denied)"
  echo "3. Viewer can open: /, /commits (branches/users denied)"
  echo ""
  echo "Use this SQL during presentation to switch your logged-in account role:"
  echo "UPDATE users SET role = 'viewer' WHERE email = '<your-auth-email>';"
  echo "UPDATE users SET role = 'user'   WHERE email = '<your-auth-email>';"
  echo "UPDATE users SET role = 'admin'  WHERE email = '<your-auth-email>';"
  pause_long
fi

say "Demo complete"
echo "Repository used for presentation: $WORKDIR"
echo "To rerun with dashboard section: ./demo-presentation.sh --with-dashboard"
