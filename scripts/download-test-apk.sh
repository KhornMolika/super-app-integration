#!/usr/bin/env bash
# Shell script to download Super App Test Build APK
OUTPUT="${HOME}/Downloads/superapp-test-build.apk"
URL="http://localhost:8081/repository/apk-test-builds/superapp/v1.1.0/app-debug.apk"

echo "Downloading Super App Universal Test APK from Nexus..."
mkdir -p "${HOME}/Downloads"
curl -fSL --progress-bar -o "$OUTPUT" "$URL"

if [ -f "$OUTPUT" ]; then
    echo "Download completed successfully!"
    echo "Saved to: $OUTPUT"
else
    echo "Download failed. Make sure Nexus container is running on port 8081."
fi
