#!/bin/sh
set -e

USER="${MINIO_ACCESS_KEY:-${MINIO_ROOT_USER:-admin}}"
PASS="${MINIO_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-admin1234}}"

echo "Waiting for MinIO AIStor server at http://minio:9000..."
until /usr/bin/mc alias set myminio http://minio:9000 "$USER" "$PASS"; do
  echo "MinIO server not ready yet, retrying in 2 seconds..."
  sleep 2
done

echo "Successfully connected to MinIO alias."

# Handle License Registration
if [ -n "$MINIO_SUBNET_LICENSE" ]; then
  echo "Detected MINIO_SUBNET_LICENSE in environment."
  
  # 1. First write the license content to a temporary file in case it is a JWT / license content
  echo "$MINIO_SUBNET_LICENSE" > /tmp/minio.license

  # 2. Try registering with --api-key
  echo "Attempting to register license with --api-key..."
  if /usr/bin/mc license register myminio --api-key "$MINIO_SUBNET_LICENSE"; then
    echo "Successfully registered MinIO license using API key."
  # 3. If that fails, try registering with --license file
  elif /usr/bin/mc license register myminio --license /tmp/minio.license; then
    echo "Successfully registered MinIO license using license file."
  # 4. Try mc license update with file
  elif /usr/bin/mc license update myminio /tmp/minio.license; then
    echo "Successfully updated MinIO license from file."
  else
    echo "Warning: Direct license registration failed. Attempting airgap or manual registration..."
    /usr/bin/mc license register myminio --airgap || true
  fi
  rm -f /tmp/minio.license
fi

# 1. Public bucket for UI assets (logos/banners)
echo "Ensuring public bucket mini-app-logos exists..."
/usr/bin/mc mb myminio/mini-app-logos --ignore-existing || true
/usr/bin/mc anonymous set download myminio/mini-app-logos || true

# 2. Strictly PRIVATE quarantine bucket for untrusted uploaded packages
echo "Ensuring quarantine bucket submissions exists..."
/usr/bin/mc mb myminio/submissions --ignore-existing || true

echo "MinIO AIStor initialization complete."
exit 0
