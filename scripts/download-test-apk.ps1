# PowerShell script to download Super App Test Build APK
$output = "$HOME\Downloads\superapp-test-build.apk"
$url = "http://localhost:8081/repository/apk-test-builds/superapp/v1.1.0/app-debug.apk"

Write-Host "Downloading Super App Universal Test APK from Nexus..." -ForegroundColor Cyan
curl.exe -fSL --progress-bar -o $output $url

if (Test-Path $output) {
    $sizeMb = [math]::Round((Get-Item $output).Length / 1MB, 1)
    Write-Host "Download completed successfully!" -ForegroundColor Green
    Write-Host "Saved to: $output ($sizeMb MB)" -ForegroundColor Yellow
} else {
    Write-Host "Download failed. Make sure Nexus container is running on port 8081." -ForegroundColor Red
}
