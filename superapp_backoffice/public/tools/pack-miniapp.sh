#!/usr/bin/env bash
# ==========================================================
# 📦 Super App Mini App Clean Packaging Utility (Bash)
# ==========================================================
# Cleans local Flutter build caches, removes temporary tooling artifacts,
# and compresses only necessary source files into a minimal, clean zip archive.

set -euo pipefail

OUTPUT_DIR="${1:-.}"

echo "=========================================================="
echo " 📦 Super App Mini App Clean Packaging Utility"
echo "=========================================================="

# 1. Verify pubspec.yaml exists
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ Error: pubspec.yaml not found in current directory."
    echo "   Please execute this script from the root of your Flutter Mini App project."
    exit 1
fi

# 2. Extract Mini App Name & Version
APP_NAME=$(grep -E "^name:" pubspec.yaml | head -n 1 | awk '{print $2}' | tr -d '"' | tr -d "'" | tr -d '\r')
APP_VERSION=$(grep -E "^version:" pubspec.yaml | head -n 1 | awk '{print $2}' | tr -d '"' | tr -d "'" | tr -d '\r')

APP_NAME="${APP_NAME:-miniapp}"
APP_VERSION="${APP_VERSION:-1.0.0}"

echo "📱 App Name    : ${APP_NAME}"
echo "🏷️ Version     : ${APP_VERSION}"

# 3. Clean local build artifacts
echo ""
echo "🧹 Step 1/3: Cleaning local build caches with 'flutter clean'..."
if command -v flutter >/dev/null 2>&1; then
    flutter clean >/dev/null 2>&1 || true
    echo "   ✓ 'flutter clean' completed."
else
    echo "   ⚠️ 'flutter' CLI not found; proceeding with manual folder cleanup..."
fi

rm -rf build .dart_tool .gradle android/.gradle android/app/build ios/Pods .idea .vscode node_modules __MACOSX *.apk *.aar *.ipa *.tmp *.log .DS_Store 2>/dev/null || true

# 4. Prepare Files for Packaging
echo ""
echo "📁 Step 2/3: Gathering source files..."

INCLUDED_ITEMS=()
if [ -d "lib" ]; then INCLUDED_ITEMS+=("lib"); else echo "❌ Missing mandatory lib/ folder"; exit 1; fi
if [ -f "pubspec.yaml" ]; then INCLUDED_ITEMS+=("pubspec.yaml"); else echo "❌ Missing pubspec.yaml"; exit 1; fi

for opt in assets pubspec.lock README.md CHANGELOG.md LICENSE android ios test; do
    if [ -e "$opt" ]; then
        INCLUDED_ITEMS+=("$opt")
    fi
done

# 5. Compress Archive
echo ""
echo "🗜️ Step 3/3: Creating optimized zip archive..."

mkdir -p "$OUTPUT_DIR"
CLEAN_VERSION=$(echo "$APP_VERSION" | tr -c '[:alnum:].-' '_')
ZIP_FILE="${OUTPUT_DIR}/${APP_NAME}-${CLEAN_VERSION}.zip"

rm -f "$ZIP_FILE"

zip -q -r "$ZIP_FILE" "${INCLUDED_ITEMS[@]}" -x "*.DS_Store" "*__MACOSX*" "*.git*" "*build/*" "*.dart_tool/*"

FILE_SIZE_BYTES=$(wc -c < "$ZIP_FILE" | tr -d ' ')
FILE_SIZE_KB=$(awk "BEGIN {printf \"%.1f\", ${FILE_SIZE_BYTES}/1024}")
FILE_SIZE_MB=$(awk "BEGIN {printf \"%.2f\", ${FILE_SIZE_BYTES}/(1024*1024)}")

echo ""
echo "=========================================================="
echo " ✅ Mini App Package Successfully Created!"
echo " 📦 File: ${ZIP_FILE}"
if [ "$FILE_SIZE_BYTES" -ge 1048576 ]; then
    echo " 💾 Size: ${FILE_SIZE_MB} MB"
else
    echo " 💾 Size: ${FILE_SIZE_KB} KB"
fi
echo "=========================================================="
echo "🚀 You can now upload this clean archive in the Super App Backoffice."
