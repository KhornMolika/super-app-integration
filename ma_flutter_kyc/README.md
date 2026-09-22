# Digital KYC Verifier Mini App (`dps_miniapp_mobile_kyc_verifier`)

A native Flutter package Mini App for Super App ecosystem integration.

## Features
- **Document Photo Capture** (uses platform-supported `Camera` permission)
- **GPS Coordinates Verification** (uses platform-supported `Location` permission)
- **Biometric Identity Confirmation** (uses platform-supported `Biometrics` permission)
- **Clean Interface**: Uses standard constructor arguments (`jwtToken`, `userId`, `onExit`) without external framework coupling.

## Super App Usage
```dart
import 'package:dps_miniapp_mobile_kyc_verifier/dsp_miniapp_kyc_verifier.dart';

KycVerifierAppEntry(
  jwtToken: activeUserToken,
  userId: activeUserId,
  onExit: () => Navigator.of(context).pop(),
)
```
