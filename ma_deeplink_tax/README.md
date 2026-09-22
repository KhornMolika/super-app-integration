# Cambodia E-Tax Mini App (`ma_deeplink_tax`)

Sample **Deep Link** Mini App demonstrating integration with external native applications and store/web fallback routing.

## Configuration

- **URL Scheme**: `cambodia-tax://declarations/new`
- **Fallback URL**: `https://tax.gov.kh/download`
- **Play Store**: `https://play.google.com/store/apps/details?id=kh.gov.tax`
- **App Store**: `https://apps.apple.com/app/cambodia-tax/id123456`

## Host Support
Supported on Android 11+ via declared `<queries>` intent filters in `AndroidManifest.xml` and on iOS via `LSApplicationQueriesSchemes` in `Info.plist`.
