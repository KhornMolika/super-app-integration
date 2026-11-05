#!/usr/bin/env bash
# scripts/build-sandbox.sh
# macOS/Linux counterpart of build-sandbox.ps1: compiles the Flutter Web super app
# and copies it into the admin portal's public/superapp-sandbox directory.
#
# Environment (all optional):
#   MOBILE_APP_DIR    Flutter app directory, absolute or relative to the backend dir
#                     (default: ../mobile-super-app)
#   SANDBOX_DEST_DIR  Where build/web is copied
#                     (default: ../frontend-super-app-manager/public/superapp-sandbox)
#   FLUTTER_BIN       Flutter executable (default: `flutter` on PATH)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_DIR="$(dirname "$BACKEND_DIR")"

# Resolves a directory relative to the backend dir (where MOBILE_APP_DIR is defined).
resolve_dir() { (cd "$BACKEND_DIR" && cd "$1" 2>/dev/null && pwd) || true; }

MOBILE_DIR="$(resolve_dir "${MOBILE_APP_DIR:-../mobile-super-app}")"
if [ -z "$MOBILE_DIR" ] || [ ! -f "$MOBILE_DIR/pubspec.yaml" ]; then
  echo "Flutter app not found (MOBILE_APP_DIR=${MOBILE_APP_DIR:-unset})." >&2
  exit 1
fi

DEST_DIR="${SANDBOX_DEST_DIR:-$WORKSPACE_DIR/frontend-super-app-manager/public/superapp-sandbox}"

FLUTTER="${FLUTTER_BIN:-$(command -v flutter || true)}"
if [ -z "$FLUTTER" ]; then
  echo "flutter not found: put it on PATH or set FLUTTER_BIN." >&2
  exit 1
fi

echo "========================================="
echo "[BUILD] Compiling Flutter Web Super App Sandbox"
echo " Flutter Executable : $FLUTTER"
echo " Working Directory  : $MOBILE_DIR"
echo " Output Directory   : $DEST_DIR"
if [ -n "${GIT_SSH_COMMAND:-}" ]; then
  echo " Git SSH Command    : Configured (Deploy Keys Active)"
fi
echo "========================================="

cd "$MOBILE_DIR"
echo "Resolving Flutter dependencies..."
"$FLUTTER" pub get

echo "Running: flutter build web --base-href /superapp-sandbox/ --release --no-tree-shake-icons"
"$FLUTTER" build web --base-href /superapp-sandbox/ --release --no-tree-shake-icons

echo "Syncing build artifacts to $DEST_DIR..."
mkdir -p "$DEST_DIR"
cp -R build/web/. "$DEST_DIR"/

echo "Sandbox build artifacts synced to $DEST_DIR."
