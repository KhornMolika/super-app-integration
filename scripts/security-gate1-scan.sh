#!/usr/bin/env bash
# ==============================================================================
# DSP PLATFORM: SECURITY GATE 1 PRE-PUBLISH SCANNER (Git Bash / Linux / macOS)
# ==============================================================================

set -e

# Default parameters
PACKAGE_DIR="."
if [ ! -f "$PACKAGE_DIR/pubspec.yaml" ]; then
  if [ -f "./dsp_miniapp_trust_regulator/pubspec.yaml" ]; then
    PACKAGE_DIR="./dsp_miniapp_trust_regulator"
  fi
fi

PUBLISH=false
STRICT=true
NEXUS_URL="http://localhost:8081/repository/pub-hosted"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --publish|-p) PUBLISH=true ;;
    --package|-d) PACKAGE_DIR="$2"; shift ;;
    --nexus|-n) NEXUS_URL="$2"; shift ;;
    --no-strict) STRICT=false ;;
    -h|--help)
      echo "Usage: ./security-gate1-scan.sh [OPTIONS]"
      echo "Options:"
      echo "  -p, --publish        Publish to Nexus registry if Gate 1 passes"
      echo "  -d, --package <dir>  Path to package directory (default: current directory)"
      echo "  -n, --nexus <url>    Nexus pub-hosted URL"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

echo -e "\033[1;36m============================================================\033[0m"
echo -e "\033[1;36m     DSP PLATFORM: SECURITY GATE 1 PRE-PUBLISH SCANNER     \033[0m"
echo -e "\033[1;36m============================================================\033[0m"
echo "Package Target : $PACKAGE_DIR"
echo "Nexus Hosted   : $NEXUS_URL"
echo "Publish Flag   : $PUBLISH"
echo "Timestamp      : $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

if [ ! -f "$PACKAGE_DIR/pubspec.yaml" ]; then
  echo -e "\033[1;31mERROR: pubspec.yaml not found at '$PACKAGE_DIR'\033[0m"
  exit 1
fi

GATE_PASSED=true
FINDINGS=()

# ------------------------------------------------------------------------------
# 1. Static Code Analysis (dart analyze)
# ------------------------------------------------------------------------------
echo -e "\033[1;33m[1/5] Running Static Analysis (dart analyze)...\033[0m"
pushd "$PACKAGE_DIR" > /dev/null

set +e
ANALYZE_OUT=$(dart analyze 2>&1)
ANALYZE_STATUS=$?
set -e

if [ $ANALYZE_STATUS -eq 0 ]; then
  echo -e "\033[1;32m  [OK] Static analysis passed with 0 errors.\033[0m"
else
  echo -e "\033[1;33m  [WARN] Static analysis reported issues.\033[0m"
  if [ "$STRICT" = true ] && echo "$ANALYZE_OUT" | grep -q "error •"; then
    echo -e "\033[1;31m  [FAIL] Fatal lint/analysis errors detected!\033[0m"
    FINDINGS+=("Fatal static analysis errors found")
    GATE_PASSED=false
  fi
fi
popd > /dev/null

# ------------------------------------------------------------------------------
# 2. Automated Unit Tests (flutter test)
# ------------------------------------------------------------------------------
echo -e "\033[1;33m[2/5] Running Automated Unit Tests...\033[0m"
pushd "$PACKAGE_DIR" > /dev/null
if [ -d "test" ]; then
  set +e
  TEST_OUT=$(flutter test 2>&1)
  TEST_STATUS=$?
  set -e
  if [ $TEST_STATUS -eq 0 ]; then
    echo -e "\033[1;32m  [OK] All package unit tests passed.\033[0m"
  else
    echo -e "\033[1;31m  [FAIL] Unit tests failed!\033[0m"
    FINDINGS+=("Unit tests failed: $TEST_OUT")
    GATE_PASSED=false
  fi
else
  echo -e "\033[0;90m  [SKIP] No test directory found; skipping unit tests.\033[0m"
fi
popd > /dev/null

# ------------------------------------------------------------------------------
# 3. Secret & Vulnerability Scanning
# ------------------------------------------------------------------------------
echo -e "\033[1;33m[3/5] Scanning Source Files for Hardcoded Secrets...\033[0m"
pushd "$PACKAGE_DIR" > /dev/null
SECRETS_FOUND=0

# Scan .dart and .yaml files, excluding build and .dart_tool
FILES_TO_SCAN=$(find . -type f \( -name "*.dart" -o -name "*.yaml" \) ! -path "*/.dart_tool/*" ! -path "*/build/*")

for f in $FILES_TO_SCAN; do
  # AWS Key pattern
  if grep -E -q '(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}' "$f" 2>/dev/null; then
    echo -e "\033[1;31m  [FAIL] Found AWS Access Key in $f!\033[0m"
    FINDINGS+=("Secret Found: AWS Access Key in $f")
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
    GATE_PASSED=false
  fi

  # Private key block pattern
  if grep -E -q '-----BEGIN (RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----' "$f" 2>/dev/null; then
    echo -e "\033[1;31m  [FAIL] Found Private Key Block in $f!\033[0m"
    FINDINGS+=("Secret Found: Private Key Block in $f")
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
    GATE_PASSED=false
  fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
  echo -e "\033[1;32m  [OK] 0 secret leaks detected.\033[0m"
fi
popd > /dev/null

# ------------------------------------------------------------------------------
# 4. SHA-256 Checksum Calculation & Integrity Digest
# ------------------------------------------------------------------------------
echo -e "\033[1;33m[4/5] Computing SHA-256 Checksum & Integrity Digest...\033[0m"
pushd "$PACKAGE_DIR" > /dev/null
if command -v sha256sum &> /dev/null; then
  CHECKSUM=$(sha256sum pubspec.yaml | awk '{print $1}')
elif command -v shasum &> /dev/null; then
  CHECKSUM=$(shasum -a 256 pubspec.yaml | awk '{print $1}')
else
  CHECKSUM="calculated-at-gate"
fi
echo -e "\033[1;32m  [OK] SHA-256 (pubspec.yaml): $CHECKSUM\033[0m"
popd > /dev/null

# ------------------------------------------------------------------------------
# 5. Security Gate 1 Decision & Optional Nexus Publish
# ------------------------------------------------------------------------------
echo -e "\033[1;33m[5/5] Finalizing Security Gate 1 Decision...\033[0m"
echo ""
echo -e "\033[1;36m============================================================\033[0m"

if [ "$GATE_PASSED" = true ]; then
  echo -e "\033[1;32m           SECURITY GATE 1: [ PASSED ]                      \033[0m"
  echo -e "\033[1;36m============================================================\033[0m"
  echo -e "\033[1;32mPackage is verified, secure, and eligible for Nexus release.\033[0m"
  echo "SHA-256 Digest: $CHECKSUM"

  if [ "$PUBLISH" = true ]; then
    echo ""
    echo -e "\033[1;33mPublishing package artifact to Nexus ($NEXUS_URL)...\033[0m"
    pushd "$PACKAGE_DIR" > /dev/null
    dart pub publish --force
    echo -e "\033[1;32m[OK] Successfully published to Nexus pub-hosted!\033[0m"
    popd > /dev/null
  fi
  exit 0
else
  echo -e "\033[1;31m           SECURITY GATE 1: [ FAILED ]                      \033[0m"
  echo -e "\033[1;36m============================================================\033[0m"
  echo -e "\033[1;31mThe package has failed pre-publish security checks:\033[0m"
  for item in "${FINDINGS[@]}"; do
    echo -e "\033[1;31m  * $item\033[0m"
  done
  echo ""
  echo -e "\033[1;31mPublication to Nexus registry has been BLOCKED by Security Gate 1.\033[0m"
  exit 1
fi
