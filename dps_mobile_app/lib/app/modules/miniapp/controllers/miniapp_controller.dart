import 'dart:convert';
import 'package:get/get.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../services/auth_service.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:local_auth/local_auth.dart';
import 'package:dps_mobile_app/app/config/api_config.dart';

class MiniappController extends GetxController {
  WebViewController? webViewController;
  String targetUrl = 'https://flutter.dev';
  String finalUrl = 'https://flutter.dev';
  String viewTypeId = 'miniapp-iframe';
  List<String> permissions = [];
  String appName = 'Mini App';

  bool hasPermission(String perm) {
    final needle = perm.toLowerCase();
    return permissions.any((p) {
      final lp = p.toLowerCase();
      return lp == needle || lp.contains(needle);
    });
  }

  @override
  void onInit() {
    super.onInit();
    
    final args = Get.arguments;
    if (args is Map) {
      targetUrl = args['url']?.toString() ?? 'https://flutter.dev';
      final rawPerms = args['permissions'];
      if (rawPerms is List) {
        permissions = rawPerms.map((p) {
          if (p is Map) {
            return (p['type'] ?? p['name'] ?? p['permission'] ?? '').toString();
          }
          return p.toString();
        }).where((p) => p.isNotEmpty).toList();
      } else {
        permissions = [];
      }
      appName = args['name']?.toString() ?? 'Mini App';
    } else if (args is String) {
      targetUrl = args;
      permissions = [];
      appName = 'Mini App';
    } else {
      targetUrl = 'https://flutter.dev';
      permissions = [];
      appName = 'Mini App';
    }

    final token = Get.find<AuthService>().token;
    
    // Resolve host IP for Android devices/emulators
    String parsedTargetUrl = ApiConfig.resolveUrl(targetUrl);

    // Append token as query parameter
    final uri = Uri.parse(parsedTargetUrl);
    finalUrl = uri.replace(queryParameters: {
      ...uri.queryParameters,
      if (token.isNotEmpty) 'token': token,
    }).toString();

    viewTypeId = 'miniapp-iframe-${DateTime.now().millisecondsSinceEpoch}';

    if (!kIsWeb) {
      _initMobileWebViewController();
    }
  }

  void _initMobileWebViewController() {
    late final WebViewController ctrl;
    ctrl = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'DSPNativeBridge',
        onMessageReceived: (JavaScriptMessage message) async {
          try {
            final data = jsonDecode(message.message);
            final action = data['action'];
            final callbackId = data['callbackId'];

            if (action == 'getLocation') {
              if (!hasPermission('Location') && !hasPermission('Geolocation')) {
                debugPrint('Super App blocked Location access for this Mini App.');
                final blockedLocation = '{"lat": 0, "lng": 0, "error": "Permission denied by Super App settings"}';
                ctrl.runJavaScript(
                  "if (window.dspCallback) window.dspCallback('$callbackId', $blockedLocation);"
                );
                return;
              }

              try {
                bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
                if (!serviceEnabled) {
                  throw Exception('Location services are disabled.');
                }

                LocationPermission permission = await Geolocator.checkPermission();
                if (permission == LocationPermission.denied) {
                  permission = await Geolocator.requestPermission();
                  if (permission == LocationPermission.denied) {
                    throw Exception('Location permissions are denied');
                  }
                }
                
                if (permission == LocationPermission.deniedForever) {
                  throw Exception('Location permissions are permanently denied');
                } 

                Position position = await Geolocator.getCurrentPosition();
                
                final realLocation = '{"lat": ${position.latitude}, "lng": ${position.longitude}}';
                
                // Send the real response back to the WebView asynchronously
                ctrl.runJavaScript(
                  "if (window.dspCallback) window.dspCallback('$callbackId', $realLocation);"
                );
              } catch (locationError) {
                debugPrint('Location Error: $locationError');
                // You could also send an error object back to the JS side here
                final fallbackLocation = '{"lat": 0, "lng": 0, "error": "${locationError.toString().replaceAll('"', "'")}"}';
                ctrl.runJavaScript(
                  "if (window.dspCallback) window.dspCallback('$callbackId', $fallbackLocation);"
                );
              }
            }

            if (action == 'openCamera') {
              if (!hasPermission('Camera')) {
                final blocked = '{"error": "Camera permission denied by Super App settings"}';
                ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $blocked);");
                return;
              }

              try {
                final ImagePicker picker = ImagePicker();
                final XFile? image = await picker.pickImage(source: ImageSource.camera, imageQuality: 50);
                
                if (image != null) {
                  final bytes = await image.readAsBytes();
                  final base64Image = base64Encode(bytes);
                  final response = '{"image": "data:image/jpeg;base64,$base64Image"}';
                  ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $response);");
                } else {
                  final response = '{"error": "User cancelled camera"}';
                  ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $response);");
                }
              } catch (e) {
                final errorResp = '{"error": "Failed to open camera: ${e.toString().replaceAll('"', "'")}"}';
                ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $errorResp);");
              }
            }

            if (action == 'authenticate') {
              if (!hasPermission('Biometrics') && !hasPermission('Auth')) {
                final blocked = '{"error": "Biometrics permission denied by Super App settings"}';
                ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $blocked);");
                return;
              }

              try {
                final LocalAuthentication auth = LocalAuthentication();
                final bool canAuthenticateWithBiometrics = await auth.canCheckBiometrics;
                final bool canAuthenticate = canAuthenticateWithBiometrics || await auth.isDeviceSupported();
                
                if (!canAuthenticate) {
                  final errorResp = '{"error": "Device does not support biometrics"}';
                  ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $errorResp);");
                  return;
                }

                final bool didAuthenticate = await auth.authenticate(
                  localizedReason: 'Please authenticate to proceed in this Mini App',
                  biometricOnly: false,
                );

                if (didAuthenticate) {
                  final response = '{"success": true}';
                  ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $response);");
                } else {
                  final response = '{"error": "Authentication failed or cancelled"}';
                  ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $response);");
                }
              } catch (e) {
                String errorMessage = e.toString().replaceAll('"', "'");
                if (errorMessage.contains('noCredentialsSet') || errorMessage.contains('NotEnrolled')) {
                  errorMessage = "Please set up a screen lock (PIN/Pattern/Biometric) in your device settings to use this feature.";
                } else {
                  errorMessage = "Authentication error: $errorMessage";
                }
                
                final errorResp = '{"error": "$errorMessage"}';
                ctrl.runJavaScript("if (window.dspCallback) window.dspCallback('$callbackId', $errorResp);");
              }
            }
          } catch (e) {
            debugPrint('Error parsing JS message: $e');
          }
        },
      )
      ..loadRequest(Uri.parse(finalUrl));
    webViewController = ctrl;
  }
}
