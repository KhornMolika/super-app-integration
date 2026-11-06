#!/bin/sh
set -e

# ==============================================================================
# MinIO Initialization Script (SEC-OPS-2026-STORAGE-01)
# Container entrypoint for superapp-minio-init using MinIO Client (/usr/bin/mc).
# Automatically creates the unified private bucket `superapp-storage` and sets up
# the Virtual Prefix Hierarchy.
# ==============================================================================

USER="${MINIO_ACCESS_KEY:-${MINIO_ROOT_USER:-super-app-svc}}"
PASS="${MINIO_SECRET_KEY:-${MINIO_ROOT_PASSWORD}}"
BUCKET="${MINIO_BUCKET_NAME:-superapp-storage}"
ENDPOINT="${MINIO_ENDPOINT:-minio}"
PORT="${MINIO_PORT:-9000}"

echo "Waiting for MinIO server at http://${ENDPOINT}:${PORT}..."
until /usr/bin/mc alias set myminio "http://${ENDPOINT}:${PORT}" "$USER" "$PASS"; do
  echo "MinIO server not ready yet, retrying in 2 seconds..."
  sleep 2
done

echo "Successfully connected to MinIO alias."

# 1. Handle License Registration (if present)
if [ -n "$MINIO_SUBNET_LICENSE" ]; then
  echo "Detected MINIO_SUBNET_LICENSE in environment."
  echo "$MINIO_SUBNET_LICENSE" > /tmp/minio.license
  if /usr/bin/mc license register myminio --api-key "$MINIO_SUBNET_LICENSE"; then
    echo "Successfully registered MinIO license using API key."
  elif /usr/bin/mc license register myminio --license /tmp/minio.license; then
    echo "Successfully registered MinIO license using license file."
  elif /usr/bin/mc license update myminio /tmp/minio.license; then
    echo "Successfully updated MinIO license from file."
  else
    echo "Warning: Direct license registration failed. Attempting airgap or manual registration..."
    /usr/bin/mc license register myminio --airgap || true
  fi
  rm -f /tmp/minio.license
fi

# 2. Ensure unified, 100% PRIVATE bucket exists
echo "Ensuring unified private bucket ${BUCKET} exists..."
/usr/bin/mc mb "myminio/${BUCKET}" --ignore-existing || true

# Explicitly clear anonymous public read (Strict Zero-Trust policy)
/usr/bin/mc anonymous set none "myminio/${BUCKET}" || true

# 3. Initialize Virtual Prefix Hierarchy
echo "Initializing Virtual Prefix Hierarchy in ${BUCKET}..."
PREFIXES="platform/branding/ platform/banners/ miniapps/ organizations/ users/backoffice/ users/end-users/ quarantine/packages/ quarantine/sdks/ reports/security/"

for prefix in $PREFIXES; do
  echo "# SuperApp Virtual Directory Placeholder" | /usr/bin/mc pipe "myminio/${BUCKET}/${prefix}.keep" || true
done

echo "MinIO AIStor initialization complete: ${BUCKET} configured with virtual prefix hierarchy."
exit 0
