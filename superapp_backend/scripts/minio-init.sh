#!/bin/sh
set -e

USER="${MINIO_ACCESS_KEY:-${MINIO_ROOT_USER:-admin}}"
PASS="${MINIO_SECRET_KEY:-${MINIO_ROOT_PASSWORD}}"

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
echo "Ensuring public assets bucket mini-app-assets exists..."
/usr/bin/mc mb myminio/mini-app-assets --ignore-existing || true
/usr/bin/mc anonymous set download myminio/mini-app-assets || true

# 2. Strictly PRIVATE quarantine bucket for Flutter package submissions (.zip)
echo "Ensuring quarantine bucket package-submissions exists..."
/usr/bin/mc mb myminio/package-submissions --ignore-existing || true

# 3. Strictly PRIVATE quarantine bucket for Native SDK submissions (.aar / .xcframework)
echo "Ensuring quarantine bucket sdk-submissions exists..."
/usr/bin/mc mb myminio/sdk-submissions --ignore-existing || true

echo "MinIO AIStor initialization complete with standardized 3-bucket architecture."
exit 0
