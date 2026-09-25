#!/usr/bin/env bash

# ==============================================================================
# 🚀 Super App POC - Unified Auto-Start Script (Backend & Backoffice)
# ==============================================================================
# Starts DSP Super App Backend (NestJS, Port 3000) and Backoffice (Next.js 16, Port 3002)
# concurrently with automatic dependency checks, environment validation, and clean shutdown.
# ==============================================================================

set -o pipefail

# ANSI Color Codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
MAGENTA="\033[0;35m"
DIM="\033[2m"
RESET="\033[0m"

# Project Root Resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/superapp_backend"
BACKOFFICE_DIR="${SCRIPT_DIR}/superapp_backoffice"

# Runtime Configuration & Flags
START_BACKEND=true
START_BACKOFFICE=true
FORCE_INSTALL=false
PROD_MODE=false

# PID Tracking
BACKEND_PID=""
BACKOFFICE_PID=""

# ==============================================================================
# ℹ️ Helper Functions
# ==============================================================================

print_banner() {
  echo -e "${BOLD}${CYAN}======================================================================${RESET}"
  echo -e "${BOLD}${CYAN}  🚀 DSP Super App POC — Auto-Start Platform Services                ${RESET}"
  echo -e "${BOLD}${CYAN}======================================================================${RESET}"
  echo -e "${DIM}  Root Directory: ${SCRIPT_DIR}${RESET}\n"
}

print_help() {
  print_banner
  echo -e "${BOLD}Usage:${RESET} bash start.sh [OPTIONS]\n"
  echo -e "${BOLD}Options:${RESET}"
  echo -e "  ${CYAN}-h, --help${RESET}             Show this help message and exit"
  echo -e "  ${CYAN}-i, --install${RESET}          Force run 'pnpm install' in both projects before starting"
  echo -e "  ${CYAN}-b, --backend-only${RESET}     Start ONLY the Backend API (NestJS - Port 3000)"
  echo -e "  ${CYAN}-f, --backoffice-only${RESET}  Start ONLY the Backoffice Portal (Next.js - Port 3002)"
  echo -e "  ${CYAN}-p, --prod${RESET}             Start in production mode instead of development mode"
  echo ""
  echo -e "${BOLD}Examples:${RESET}"
  echo -e "  bash start.sh                 # Start both backend and backoffice in dev mode"
  echo -e "  bash start.sh --install       # Install missing dependencies and start both"
  echo -e "  bash start.sh --backend-only  # Start backend service only"
  echo ""
}

log_info() {
  echo -e "${BLUE}ℹ️  [INFO]${RESET} $1"
}

log_success() {
  echo -e "${GREEN}✔  [SUCCESS]${RESET} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠️  [WARNING]${RESET} $1"
}

log_error() {
  echo -e "${RED}❌ [ERROR]${RESET} $1"
}

# ==============================================================================
# 🛑 Graceful Shutdown Handler
# ==============================================================================
cleanup() {
  echo -e "\n\n${BOLD}${YELLOW}🛑 Shutting down services gracefully...${RESET}"

  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${DIM}  Stopping Backend API (PID: ${BACKEND_PID})...${RESET}"
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [ -n "$BACKOFFICE_PID" ] && kill -0 "$BACKOFFICE_PID" 2>/dev/null; then
    echo -e "${DIM}  Stopping Backoffice Portal (PID: ${BACKOFFICE_PID})...${RESET}"
    kill "$BACKOFFICE_PID" 2>/dev/null || true
  fi

  # Terminate child processes on Windows / Git Bash / Linux
  if command -v taskkill >/dev/null 2>&1; then
    # Kill any dangling node processes spawned under this tree if on Windows
    taskkill //F //T //PID "$$" 2>/dev/null || true
  fi

  # Wait briefly for background processes to exit
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKOFFICE_PID" 2>/dev/null || true

  echo -e "${BOLD}${GREEN}✔ All services stopped cleanly. Goodbye!${RESET}\n"
  exit 0
}

# Trap termination signals
trap cleanup SIGINT SIGTERM SIGHUP EXIT

# ==============================================================================
# 🔍 Parse Command Line Arguments
# ==============================================================================
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      print_help
      trap - SIGINT SIGTERM SIGHUP EXIT
      exit 0
      ;;
    -i|--install)
      FORCE_INSTALL=true
      shift
      ;;
    -b|--backend-only)
      START_BACKOFFICE=false
      shift
      ;;
    -f|--backoffice-only)
      START_BACKEND=false
      shift
      ;;
    -p|--prod)
      PROD_MODE=true
      shift
      ;;
    *)
      log_warn "Unknown option: $1"
      print_help
      trap - SIGINT SIGTERM SIGHUP EXIT
      exit 1
      ;;
  esac
done

print_banner

# ==============================================================================
# 🧪 1. Pre-flight Environment & Tooling Verification
# ==============================================================================
echo -e "${BOLD}${CYAN}--- [1/4] Checking System Requirements ---${RESET}"

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  log_error "Node.js is not installed or not in PATH. Please install Node.js (v20+ recommended)."
  trap - SIGINT SIGTERM SIGHUP EXIT
  exit 1
fi
NODE_VERSION=$(node -v)
log_success "Node.js detected: ${BOLD}${NODE_VERSION}${RESET}"

# Check pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  log_error "pnpm is not installed! Per project rules, pnpm must be used."
  echo -e "${YELLOW}👉 Install pnpm via: npm install -g pnpm or corepack enable${RESET}"
  trap - SIGINT SIGTERM SIGHUP EXIT
  exit 1
fi
PNPM_VERSION=$(pnpm -v)
log_success "pnpm detected: ${BOLD}v${PNPM_VERSION}${RESET}"

# Check directory structure
if [ "$START_BACKEND" = true ] && [ ! -d "$BACKEND_DIR" ]; then
  log_error "Backend directory not found at: ${BACKEND_DIR}"
  trap - SIGINT SIGTERM SIGHUP EXIT
  exit 1
fi

if [ "$START_BACKOFFICE" = true ] && [ ! -d "$BACKOFFICE_DIR" ]; then
  log_error "Backoffice directory not found at: ${BACKOFFICE_DIR}"
  trap - SIGINT SIGTERM SIGHUP EXIT
  exit 1
fi

echo ""

# ==============================================================================
# ⚙️ 2. Environment Configuration Verification
# ==============================================================================
echo -e "${BOLD}${CYAN}--- [2/4] Verifying Environment Profiles ---${RESET}"

# Backend environment check
if [ "$START_BACKEND" = true ]; then
  if [ -f "${BACKEND_DIR}/.env.development" ] || [ -f "${BACKEND_DIR}/.env" ]; then
    log_success "Backend environment config found (.env.development / .env)"
  else
    if [ -f "${BACKEND_DIR}/.env.example" ]; then
      log_warn "Backend .env not found. Copying .env.example to .env.development..."
      cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env.development"
      log_success "Created ${BACKEND_DIR}/.env.development from template"
    else
      log_warn "No .env or .env.development found in ${BACKEND_DIR}"
    fi
  fi
fi

# Backoffice environment check
if [ "$START_BACKOFFICE" = true ]; then
  if [ -f "${BACKOFFICE_DIR}/.env.development" ] || [ -f "${BACKOFFICE_DIR}/.env.local" ] || [ -f "${BACKOFFICE_DIR}/.env" ]; then
    log_success "Backoffice environment config found (.env.development / .env.local)"
  else
    if [ -f "${BACKOFFICE_DIR}/.env.example" ]; then
      log_warn "Backoffice .env not found. Copying .env.example to .env.development..."
      cp "${BACKOFFICE_DIR}/.env.example" "${BACKOFFICE_DIR}/.env.development"
      log_success "Created ${BACKOFFICE_DIR}/.env.development from template"
    else
      log_warn "No .env or .env.development found in ${BACKOFFICE_DIR}"
    fi
  fi
fi

echo ""

# ==============================================================================
# 📦 3. Dependency Management (pnpm install)
# ==============================================================================
echo -e "${BOLD}${CYAN}--- [3/4] Checking Dependencies ---${RESET}"

# Ensure pnpm runs cleanly in non-interactive / shell environments without TTY aborts
export CI=true

# Check backend dependencies & binaries
if [ "$START_BACKEND" = true ]; then
  BACKEND_NEST_CLI="${BACKEND_DIR}/node_modules/@nestjs/cli"
  BACKEND_BIN="${BACKEND_DIR}/node_modules/.bin/nest"
  
  if [ "$FORCE_INSTALL" = true ] || [ ! -d "${BACKEND_DIR}/node_modules" ] || [ ! -d "$BACKEND_NEST_CLI" ] || [ ! -f "$BACKEND_BIN" ]; then
    log_info "Installing / updating Backend dependencies via 'pnpm install'..."
    (cd "$BACKEND_DIR" && pnpm install --config.confirmModulesPurge=false)
    log_success "Backend dependencies ready."
  else
    log_success "Backend dependencies already installed (${DIM}superapp_backend/node_modules${RESET})"
  fi
fi

# Check backoffice dependencies & binaries
if [ "$START_BACKOFFICE" = true ]; then
  BO_NEXT="${BACKOFFICE_DIR}/node_modules/next"
  BO_BIN="${BACKOFFICE_DIR}/node_modules/.bin/next"
  
  if [ "$FORCE_INSTALL" = true ] || [ ! -d "${BACKOFFICE_DIR}/node_modules" ] || [ ! -d "$BO_NEXT" ] || [ ! -f "$BO_BIN" ]; then
    log_info "Installing / updating Backoffice dependencies via 'pnpm install'..."
    (cd "$BACKOFFICE_DIR" && pnpm install --config.confirmModulesPurge=false)
    log_success "Backoffice dependencies ready."
  else
    log_success "Backoffice dependencies already installed (${DIM}superapp_backoffice/node_modules${RESET})"
  fi
fi

echo ""

# ==============================================================================
# 🌐 4. Port Conflict Inspection
# ==============================================================================
check_port() {
  local port=$1
  local service_name=$2
  
  if command -v lsof >/dev/null 2>&1; then
    if lsof -i :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      local pid
      pid=$(lsof -i :"$port" -sTCP:LISTEN -t | head -n 1)
      log_warn "Port :${port} is already in use by PID ${pid} (${service_name})"
    fi
  elif command -v netstat >/dev/null 2>&1; then
    if netstat -ano 2>/dev/null | grep -E "(:${port}|0.0.0.0:${port}|127.0.0.1:${port})" | grep -i "LISTENING" >/dev/null 2>&1; then
      log_warn "Port :${port} appears to be in use (${service_name})"
    fi
  fi
}

if [ "$START_BACKEND" = true ]; then
  check_port 3000 "Backend API"
fi

if [ "$START_BACKOFFICE" = true ]; then
  check_port 3002 "Backoffice Portal"
fi

# ==============================================================================
# 🚀 5. Launch Services Concurrently
# ==============================================================================
echo -e "${BOLD}${CYAN}--- [4/4] Starting Services ---${RESET}"

# Summary Table
echo -e "${BOLD}${GREEN}┌────────────────────────────────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${GREEN}│                     ⚡ RUNNING SERVICES SUMMARY ⚡                 │${RESET}"
echo -e "${BOLD}${GREEN}├────────────────────────────────────────────────────────────────────┤${RESET}"
if [ "$START_BACKEND" = true ]; then
  echo -e "${BOLD}${GREEN}│${RESET}  ${BOLD}🚀 Backend API:${RESET}        http://localhost:3000                          ${BOLD}${GREEN}│${RESET}"
  echo -e "${BOLD}${GREEN}│${RESET}  ${BOLD}📚 Swagger Docs:${RESET}       http://localhost:3000/api/docs                 ${BOLD}${GREEN}│${RESET}"
fi
if [ "$START_BACKOFFICE" = true ]; then
  echo -e "${BOLD}${GREEN}│${RESET}  ${BOLD}💻 Backoffice Portal:${RESET}  http://localhost:3002                          ${BOLD}${GREEN}│${RESET}"
fi
echo -e "${BOLD}${GREEN}│${RESET}  ${BOLD}🛠️  Mode:${RESET}               $( [ "$PROD_MODE" = true ] && echo "Production" || echo "Development (Hot-Reload / Watch)" )          ${BOLD}${GREEN}│${RESET}"
echo -e "${BOLD}${GREEN}│${RESET}  ${BOLD}🛑 Stop Action:${RESET}        Press ${BOLD}${YELLOW}Ctrl + C${RESET} in this terminal to exit       ${BOLD}${GREEN}│${RESET}"
echo -e "${BOLD}${GREEN}└────────────────────────────────────────────────────────────────────┘${RESET}\n"

# Start Backend Process
if [ "$START_BACKEND" = true ]; then
  if [ "$PROD_MODE" = true ]; then
    log_info "Starting Backend in Production mode..."
    (cd "$BACKEND_DIR" && pnpm run start:prod) &
    BACKEND_PID=$!
  else
    log_info "Starting Backend in Development mode (${DIM}pnpm run start:dev${RESET})..."
    (cd "$BACKEND_DIR" && pnpm run start:dev) &
    BACKEND_PID=$!
  fi
  log_success "Backend started in background [PID: ${BACKEND_PID}]"
fi

# Start Backoffice Process
if [ "$START_BACKOFFICE" = true ]; then
  if [ "$PROD_MODE" = true ]; then
    log_info "Starting Backoffice in Production mode..."
    (cd "$BACKOFFICE_DIR" && pnpm run start) &
    BACKOFFICE_PID=$!
  else
    log_info "Starting Backoffice in Development mode (${DIM}pnpm run dev${RESET})..."
    (cd "$BACKOFFICE_DIR" && pnpm run dev) &
    BACKOFFICE_PID=$!
  fi
  log_success "Backoffice started in background [PID: ${BACKOFFICE_PID}]"
fi

echo -e "\n${BOLD}${CYAN}📡 Live service output streaming below:${RESET}\n"

# Wait for both processes to complete (or for Ctrl+C signal)
wait
