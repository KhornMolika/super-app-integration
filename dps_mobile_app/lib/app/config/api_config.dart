import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;

class ApiConfig {
  /// Default build-time override via `--dart-define=API_URL=http://...`
  static const String _envApiUrl = String.fromEnvironment('API_URL', defaultValue: '');

  /// Observable current base URL used by all HTTP calls across the Super App
  static final RxString baseUrlRx = 'http://192.168.10.35:3000'.obs;
  static final RxString connectionStatusRx = 'Unknown'.obs;
  static final RxBool isCheckingRx = false.obs;

  static String get baseUrl => baseUrlRx.value;

  static String get currentHost {
    try {
      final uri = Uri.parse(baseUrl);
      return uri.host;
    } catch (_) {
      return '192.168.10.35';
    }
  }

  /// Candidate URLs to test in order of preference across all platforms and machines
  static List<String> get candidateUrls => [
    if (_envApiUrl.isNotEmpty) _envApiUrl,
    'http://192.168.10.35:3000', // Current Wi-Fi LAN IP
    'http://192.168.56.1:3000',  // Ethernet / Host adapter IP
    'http://10.0.2.2:3000',      // Standard Android Studio Emulator
    'http://10.0.3.2:3000',      // Genymotion Android Emulator
    'http://localhost:3000',     // Web, Desktop, or Physical Device via USB (`adb reverse`)
    'http://127.0.0.1:3000',
    'http://192.168.1.152:3000',
  ];

  /// Dynamically detect reachable backend server
  static Future<String> autoDetectServer() async {
    isCheckingRx.value = true;
    connectionStatusRx.value = 'Probing candidates...';

    // If explicit build-time URL provided, try it first
    if (_envApiUrl.isNotEmpty) {
      if (await _pingServer(_envApiUrl)) {
        baseUrlRx.value = _envApiUrl;
        connectionStatusRx.value = 'Connected ($_envApiUrl)';
        isCheckingRx.value = false;
        return _envApiUrl;
      }
    }

    // Try current baseUrl
    if (await _pingServer(baseUrlRx.value)) {
      connectionStatusRx.value = 'Connected (${baseUrlRx.value})';
      isCheckingRx.value = false;
      return baseUrlRx.value;
    }

    // Probe all candidate endpoints in parallel
    for (final candidate in candidateUrls) {
      if (await _pingServer(candidate)) {
        baseUrlRx.value = candidate;
        connectionStatusRx.value = 'Connected ($candidate)';
        isCheckingRx.value = false;
        return candidate;
      }
    }

    connectionStatusRx.value = 'Unreachable';
    isCheckingRx.value = false;
    return baseUrlRx.value;
  }

  static Future<bool> _pingServer(String url) async {
    try {
      final target = Uri.parse('$url/auth/jwks');
      final res = await http.get(target).timeout(const Duration(milliseconds: 1200));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Manually override the server URL or host IP
  static Future<bool> setCustomServer(String input) async {
    String formatted = input.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      if (formatted.contains(':')) {
        formatted = 'http://$formatted';
      } else {
        formatted = 'http://$formatted:3000';
      }
    }
    baseUrlRx.value = formatted;
    return await autoDetectServer().then((val) => val == formatted);
  }

  /// Dynamically rewrites internal host aliases in Mini App URLs to the active host
  static String resolveUrl(String url) {
    if (!kIsWeb && Platform.isAndroid) {
      final host = currentHost;
      return url
          .replaceAll('localhost', host)
          .replaceAll('10.0.2.2', host)
          .replaceAll('127.0.0.1', host);
    }
    return url;
  }
}
