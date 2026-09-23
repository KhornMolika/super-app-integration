#!/usr/bin/env bash
# =============================================================================
# Super App Test Build APK Downloader (Dynamic Nexus Package Fetcher)
# =============================================================================
# Dynamically resolves and downloads the hosted Super App APK package from
# Sonatype Nexus repository without hardcoding static versions.
#
# Usage:
#   ./download-test-apk.sh [version|latest] [nexus_url]
# Examples:
#   ./download-test-apk.sh
#   ./download-test-apk.sh latest
#   ./download-test-apk.sh v0.2.4
#   ./download-test-apk.sh latest https://nexus.artifacts.internal
# =============================================================================

set -e

VERSION_ARG="${1:-latest}"
NEXUS_BASE="${2:-${NEXUS_URL:-${NEXT_PUBLIC_NEXUS_URL:-${NEXUS_BASE_URL:-http://localhost:8081}}}}"
NEXUS_BASE="${NEXUS_BASE%/}"

REPO_NAME="${APK_REPO_NAME:-apk-test-builds}"
APP_NAME="${SUPERAPP_NAME:-superapp}"
DOWNLOAD_DIR="${HOME}/Downloads"

echo "=========================================================="
echo ">> Super App Nexus Package Downloader"
echo " Nexus Host : ${NEXUS_BASE}"
echo " Repository : ${REPO_NAME}"
echo " Target     : ${VERSION_ARG}"
echo "=========================================================="

mkdir -p "${DOWNLOAD_DIR}"

# 1. Determine dynamic target URL
if [ "$VERSION_ARG" = "latest" ]; then
    # First attempt to query Nexus REST API for latest versioned asset
    RESOLVED_URL=""
    if command -v curl >/dev/null 2>&1; then
        LATEST_PATH=$(curl -sSL -u "${NEXUS_USER:-admin}:${NEXUS_PASSWORD:-admin123}" "${NEXUS_BASE}/service/rest/v1/assets?repository=${REPO_NAME}" 2>/dev/null | grep -o "\"downloadUrl\" : \"[^\"]*\"" | head -n 1 | cut -d'"' -f4 || true)
        if [ -n "$LATEST_PATH" ]; then
            RESOLVED_URL="$LATEST_PATH"
        fi
    fi

    # Fallback to standard latest alias endpoint if API query did not resolve
    if [ -z "$RESOLVED_URL" ]; then
        RESOLVED_URL="${NEXUS_BASE}/repository/${REPO_NAME}/${APP_NAME}/latest/app-debug.apk"
    fi
    OUTPUT_FILE="${DOWNLOAD_DIR}/superapp-latest.apk"
else
    # Normalize version string with 'v' prefix
    if [[ ! "$VERSION_ARG" =~ ^v ]]; then
        VERSION_TAG="v${VERSION_ARG}"
    else
        VERSION_TAG="${VERSION_ARG}"
    fi
    RESOLVED_URL="${NEXUS_BASE}/repository/${REPO_NAME}/${APP_NAME}/${VERSION_TAG}/app-debug.apk"
    OUTPUT_FILE="${DOWNLOAD_DIR}/superapp-${VERSION_TAG}.apk"
fi

echo " Fetching remote package from: ${RESOLVED_URL}..."
curl -fSL --progress-bar -o "${OUTPUT_FILE}" "${RESOLVED_URL}"

if [ -f "${OUTPUT_FILE}" ] && [ -s "${OUTPUT_FILE}" ]; then
    FILE_SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1 2>/dev/null || echo "OK")
    echo ""
    echo "✅ Successfully downloaded hosted Nexus package!"
    echo "📱 Saved to: ${OUTPUT_FILE} (${FILE_SIZE})"
else
    echo ""
    echo "❌ Download failed from ${RESOLVED_URL}."
    echo "Please verify Sonatype Nexus is running and ${REPO_NAME} contains ${APP_NAME} artifacts."
    exit 1
fi
