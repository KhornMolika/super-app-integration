# Digital KYC Verifier Mini App (`ma_flutter_kyc`)

A native Flutter package Mini App for Super App ecosystem integration.

## Features
- **Document Photo Capture** (uses platform-supported `Camera` permission)
- **GPS Coordinates Verification** (uses platform-supported `Location` permission)
- **Biometric Identity Confirmation** (uses platform-supported `Biometrics` permission)
- **Clean Interface**: Uses standard constructor arguments (`jwtToken`, `userId`, `onExit`) without external framework coupling.

## Super App Usage
```dart
import 'package:ma_flutter_kyc/ma_flutter_kyc.dart';

KycVerifierAppEntry(
  jwtToken: activeUserToken,
  userId: activeUserId,
  onExit: () => Navigator.of(context).pop(),
)
```
