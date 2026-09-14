#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0.0"
SCHEME="PermitCheckSDK"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$HERE/build"
OUT="$HERE/../../../vendor-artifacts"

mkdir -p "$OUT"

DEVICE_FW="$(find "$BUILD/ios.xcarchive" -name "$SCHEME.framework" -type d | head -1)"
SIM_FW="$(find "$BUILD/ios-sim.xcarchive" -name "$SCHEME.framework" -type d | head -1)"

if [[ -z "$DEVICE_FW" || -z "$SIM_FW" ]]; then
  echo "ERROR: could not locate built frameworks in the archives" >&2
  exit 1
fi

echo "==> Device framework:    $DEVICE_FW"
echo "==> Simulator framework: $SIM_FW"

install_modules() {
  local dd="$1" fw="$2"
  local src
  src="$(find "$dd" -type d -name "$SCHEME.swiftmodule" -path "*BuildProductsPath*" | head -1 || true)"

  if [[ -z "$src" ]]; then
    echo "ERROR: no $SCHEME.swiftmodule directory found under $dd" >&2
    exit 1
  fi

  mkdir -p "$fw/Modules"
  cp -R "$src" "$fw/Modules/"
  echo "==> Installed $(basename "$src") into $fw"
}

install_modules "$BUILD/dd-device" "$DEVICE_FW"
install_modules "$BUILD/dd-sim" "$SIM_FW"

rm -rf "$OUT/$SCHEME.xcframework"
xcodebuild -create-xcframework \
  -framework "$DEVICE_FW" \
  -framework "$SIM_FW" \
  -output "$OUT/$SCHEME.xcframework"

echo "==> Wrote $OUT/$SCHEME.xcframework (version $VERSION, carried by the podspec)"
