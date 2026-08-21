#!/usr/bin/env bash
# Wrapper to run Security Gate 1 for dsp_miniapp_trust_regulator
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$DIR/../scripts/security-gate1-scan.sh" ]; then
  bash "$DIR/../scripts/security-gate1-scan.sh" -d "$DIR" "$@"
else
  bash "$DIR/scripts/security-gate1-scan.sh" -d "$DIR" "$@"
fi
