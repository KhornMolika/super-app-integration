#!/usr/bin/env bash
# Provisions the Nexus hosted repositories used by the native SDK artifact pipeline.
# Idempotent: repositories that already exist are skipped.
#
# Usage: NEXUS_ADMIN_PASSWORD=... ./scripts/setup-nexus-sdk-repositories.sh
# Env:   NEXUS_BASE_URL (default http://localhost:8081), NEXUS_ADMIN_USER (default admin),
#        NEXUS_ADMIN_PASSWORD (required)
set -euo pipefail

NEXUS_BASE_URL="${NEXUS_BASE_URL:-http://localhost:8081}"
NEXUS_BASE_URL="${NEXUS_BASE_URL%/}"
NEXUS_ADMIN_USER="${NEXUS_ADMIN_USER:-admin}"
: "${NEXUS_ADMIN_PASSWORD:?NEXUS_ADMIN_PASSWORD is required}"

API="$NEXUS_BASE_URL/service/rest/v1"
CURL_AUTH=(-u "$NEXUS_ADMIN_USER:$NEXUS_ADMIN_PASSWORD")

repo_exists() {
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "${CURL_AUTH[@]}" "$API/repositories/$1")
  [ "$code" = "200" ]
}

# create_repo <name> <format: raw|maven> <write-policy> <extra-json-fragment>
create_repo() {
  local name="$1" format="$2" write_policy="$3" extra="$4" code body
  if repo_exists "$name"; then
    echo "[skip] $name already exists"
    return 0
  fi
  body=$(cat <<JSON
{
  "name": "$name",
  "online": true,
  "storage": {
    "blobStoreName": "default",
    "strictContentTypeValidation": false,
    "writePolicy": "$write_policy"
  }$extra
}
JSON
)
  code=$(curl -s -o /dev/null -w '%{http_code}' "${CURL_AUTH[@]}" \
    -X POST -H 'Content-Type: application/json' -d "$body" \
    "$API/repositories/$format/hosted")
  if [ "$code" = "201" ] || [ "$code" = "204" ]; then
    echo "[created] $name ($format hosted)"
  else
    echo "[error] failed to create $name (HTTP $code)" >&2
    return 1
  fi
}

echo "Provisioning SDK repositories on $NEXUS_BASE_URL"

RAW_EXTRA=',
  "raw": { "contentDisposition": "ATTACHMENT" }'
MAVEN_EXTRA=',
  "maven": { "versionPolicy": "RELEASE", "layoutPolicy": "STRICT", "contentDisposition": "ATTACHMENT" }'

create_repo raw-sdk-artifacts raw ALLOW "$RAW_EXTRA"
create_repo cocoapods-specs   raw ALLOW "$RAW_EXTRA"
create_repo apk-test-builds   raw ALLOW "$RAW_EXTRA"
create_repo apk-releases      raw ALLOW "$RAW_EXTRA"
create_repo maven-sdk-hosted  maven ALLOW "$MAVEN_EXTRA"

echo "Done."
