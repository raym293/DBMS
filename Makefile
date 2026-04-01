# MyVCS - Root Makefile
# Build all components with a single command

.PHONY: all clean install uninstall test engine cli dashboard help

# Default target
all: engine cli dashboard
	@echo ""
	@echo "✓ All components built successfully!"
	@echo ""
	@echo "Next steps:"
	@echo "  make install   - Install CLI globally"
	@echo "  make test      - Run test suite"
	@echo "  make run-dash  - Start dashboard dev server"

# Build C++ engine
engine:
	@echo "Building C++ engine..."
	@cd vcs-engine && $(MAKE)

# Install Node.js CLI dependencies
cli:
	@echo "Installing CLI dependencies..."
	@cd vcs-cli && npm install --silent

# Install React dashboard dependencies
dashboard:
	@echo "Installing dashboard dependencies..."
	@cd web-dashboard && npm install --silent

# Install CLI globally (npm link)
install: cli
	@echo "Installing CLI globally..."
	@cd vcs-cli && npm link
	@echo "✓ 'myvcs' command now available globally"

# Uninstall CLI
uninstall:
	@echo "Uninstalling CLI..."
	@cd vcs-cli && npm unlink -g myvcs 2>/dev/null || true
	@echo "✓ CLI uninstalled"

# Clean all builds
clean:
	@echo "Cleaning all builds..."
	@cd vcs-engine && $(MAKE) clean
	@rm -rf vcs-cli/node_modules
	@rm -rf web-dashboard/node_modules
	@rm -rf web-dashboard/dist
	@echo "✓ All builds cleaned"

# Clean only C++ builds (faster)
clean-engine:
	@cd vcs-engine && $(MAKE) clean

# Run test suite
test: engine cli
	@./tests/run.sh basic

# Run all tests (basic + stress)
test-all: engine cli
	@./tests/run.sh all

# Run stress tests
test-stress: engine cli
	@./tests/run.sh stress

# Run quick smoke test
test-quick: engine cli
	@./tests/run.sh quick

# Start dashboard development server
run-dash: dashboard
	@echo "Starting dashboard at http://localhost:3000..."
	@cd web-dashboard && npm run dev

# Build dashboard for production
build-dash: dashboard
	@echo "Building dashboard for production..."
	@cd web-dashboard && npm run build
	@echo "✓ Production build in web-dashboard/dist/"

# Help
help:
	@echo "MyVCS Build System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  all          Build all components (default)"
	@echo "  engine       Build C++ engine only"
	@echo "  cli          Install CLI dependencies only"
	@echo "  dashboard    Install dashboard dependencies only"
	@echo "  install      Install CLI globally (myvcs command)"
	@echo "  uninstall    Remove global CLI installation"
	@echo "  clean        Clean all builds and node_modules"
	@echo "  clean-engine Clean only C++ builds"
	@echo "  test         Run basic test suite"
	@echo "  test-all     Run all tests (basic + stress)"
	@echo "  test-stress  Run stress tests only"
	@echo "  test-quick   Run quick smoke test"
	@echo "  run-dash     Start dashboard dev server"
	@echo "  build-dash   Build dashboard for production"
	@echo "  help         Show this help message"
