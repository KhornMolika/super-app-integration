#!/usr/bin/env bash
# Configures the release-assembly callback shared secret on BOTH sides at once, so the
# pair can never be half-configured (backend enforcing a token Jenkins doesn't send => every
# stage/build callback is rejected with 401 and no build ever leaves BUILDING).
#
#   1. generates a random token
#   2. creates/updates the Jenkins "Secret text" credential `release-callback-token`
#   3. ONLY IF (2) succeeded, writes RELEASE_CALLBACK_TOKEN into the backend .env
#
# Usage:
#   scripts/setup-jenkins-callback-token.sh            # do it (needs Jenkins reachable)
#   scripts/setup-jenkins-callback-token.sh --manual   # print the manual steps, change nothing
#
# Reads JENKINS_URL, JENKINS_USER, JENKINS_API_TOKEN from the environment or the .env file.
# Env overrides: ENV_FILE (default: <backend>/.env), CREDENTIAL_ID (default release-callback-token).
# The token is never printed. Restart the backend afterwards so it picks up the new .env value.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"
CREDENTIAL_ID="${CREDENTIAL_ID:-release-callback-token}"

manual() {
  cat <<EOF
Manual setup (same secret in both places):
  1. Generate a value:            openssl rand -hex 32
  2. Backend: add to $ENV_FILE
       RELEASE_CALLBACK_TOKEN=<value>            then restart the backend
  3. Jenkins: Manage Jenkins > Credentials > System > Global > Add Credentials
       Kind: Secret text, ID: $CREDENTIAL_ID, Secret: <value>
Do BOTH, or neither. Verify: a Jenkins build's callbacks should return 2xx (backend log shows
"Rejected release-assembly callback" if they don't).
EOF
}

if [ "${1:-}" = "--manual" ]; then manual; exit 0; fi

getenv() { # name -> value from environment, else from the .env file (last assignment wins)
  local v="${!1:-}"
  if [ -z "$v" ] && [ -f "$ENV_FILE" ]; then
    v="$(grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//")"
  fi
  printf '%s' "$v"
}

JENKINS_URL="$(getenv JENKINS_URL)"; JENKINS_URL="${JENKINS_URL%/}"
JENKINS_USER="$(getenv JENKINS_USER)"
JENKINS_API_TOKEN="$(getenv JENKINS_API_TOKEN)"
if [ -z "$JENKINS_URL" ] || [ -z "$JENKINS_USER" ] || [ -z "$JENKINS_API_TOKEN" ]; then
  echo "JENKINS_URL / JENKINS_USER / JENKINS_API_TOKEN are not all set; nothing changed." >&2
  manual >&2
  exit 1
fi
command -v openssl >/dev/null || { echo "openssl is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required (JSON/XML escaping)" >&2; exit 1; }

# Credentials go to curl on stdin (-K -) so they never show up in `ps`.
jcurl() { # curl args...; auth config on stdin is provided by the caller through AUTH_CFG
  printf '%s\n' "$AUTH_CFG" | curl -sS -K - "$@"
}
AUTH_CFG="$(python3 - "$JENKINS_USER" "$JENKINS_API_TOKEN" <<'PY'
import sys
u, p = sys.argv[1], sys.argv[2]
q = lambda s: s.replace('\\', '\\\\').replace('"', '\\"')
print('user = "%s:%s"' % (q(u), q(p)))
PY
)"

TOKEN="$(openssl rand -hex 32)"

# curl reads its auth config from stdin (-K -), so request bodies go through a private temp file.
umask 077
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

# CSRF crumb (Jenkins may have crumbs disabled; tolerate that).
CRUMB_HDR=()
if crumb="$(jcurl -f "$JENKINS_URL/crumbIssuer/api/json" 2>/dev/null)"; then
  hdr="$(printf '%s' "$crumb" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["crumbRequestField"]+": "+d["crumb"])')" || hdr=""
  [ -n "$hdr" ] && CRUMB_HDR=(-H "$hdr")
fi

STORE="$JENKINS_URL/credentials/store/system/domain/_"
exists_code="$(jcurl -o /dev/null -w '%{http_code}' "$STORE/credential/$CREDENTIAL_ID/api/json" || true)"

if [ "$exists_code" = "200" ]; then
  echo "Updating existing Jenkins credential '$CREDENTIAL_ID'..."
  XML="$(TOKEN="$TOKEN" CID="$CREDENTIAL_ID" python3 - <<'PY'
import os
from xml.sax.saxutils import escape
print('<org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>'
      '<scope>GLOBAL</scope><id>%s</id>'
      '<description>Shared secret for backend release-assembly callbacks</description>'
      '<secret>%s</secret></org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>'
      % (escape(os.environ['CID']), escape(os.environ['TOKEN'])))
PY
)"
  printf '%s' "$XML" > "$BODY_FILE"
  code="$(jcurl -o /dev/null -w '%{http_code}' -X POST "${CRUMB_HDR[@]+"${CRUMB_HDR[@]}"}" \
        -H 'Content-Type: application/xml' --data-binary "@$BODY_FILE" "$STORE/credential/$CREDENTIAL_ID/config.xml" || true)"
elif [ "$exists_code" = "404" ]; then
  echo "Creating Jenkins credential '$CREDENTIAL_ID'..."
  JSON="$(TOKEN="$TOKEN" CID="$CREDENTIAL_ID" python3 - <<'PY'
import os, json
print(json.dumps({"": "0", "credentials": {
  "scope": "GLOBAL", "id": os.environ["CID"], "secret": os.environ["TOKEN"],
  "description": "Shared secret for backend release-assembly callbacks",
  "$class": "org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl"}}))
PY
)"
  printf 'json=%s' "$(printf '%s' "$JSON" | python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=""))')" > "$BODY_FILE"
  code="$(jcurl -o /dev/null -w '%{http_code}' -X POST "${CRUMB_HDR[@]+"${CRUMB_HDR[@]}"}" \
          -H 'Content-Type: application/x-www-form-urlencoded' --data-binary "@$BODY_FILE" "$STORE/createCredentials" || true)"
else
  echo "Could not query Jenkins credentials (HTTP $exists_code) at $JENKINS_URL. Nothing changed." >&2
  manual >&2
  exit 1
fi

case "$code" in
  200|201|302) ;;
  *) echo "Jenkins rejected the credential change (HTTP $code). Backend .env NOT modified." >&2; manual >&2; exit 1 ;;
esac

# Jenkins now holds the secret; only now make the backend enforce it.
touch "$ENV_FILE"
TMP="$(mktemp)"
grep -vE '^[[:space:]]*#?[[:space:]]*RELEASE_CALLBACK_TOKEN=' "$ENV_FILE" > "$TMP" || true
printf 'RELEASE_CALLBACK_TOKEN=%s\n' "$TOKEN" >> "$TMP"
cat "$TMP" > "$ENV_FILE"; rm -f "$TMP"

echo "Done: Jenkins credential '$CREDENTIAL_ID' and RELEASE_CALLBACK_TOKEN in $ENV_FILE now match."
echo "Restart the backend so it enforces the token."
