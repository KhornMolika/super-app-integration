#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0.0"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../../../vendor-artifacts"

mkdir -p "$OUT"

BUILT="$(find "$HERE/permit-check-sdk/build/outputs/aar" -name "*.aar" | head -1)"

if [[ -z "$BUILT" ]]; then
  echo "ERROR: no AAR produced" >&2
  exit 1
fi

cp "$BUILT" "$OUT/permit-check-sdk-$VERSION.aar"
echo "==> Wrote $OUT/permit-check-sdk-$VERSION.aar"
