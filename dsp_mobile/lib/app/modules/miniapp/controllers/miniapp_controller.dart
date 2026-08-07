import 'package:get/get.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../services/auth_service.dart';

class MiniappController extends GetxController {
  late final WebViewController webViewController;
  final String targetUrl = Get.arguments ?? 'https://flutter.dev';

  @override
  void onInit() {
    super.onInit();
    final token = Get.find<AuthService>().token;
    
    // Append token as query parameter
    final uri = Uri.parse(targetUrl);
    final finalUrl = uri.replace(queryParameters: {
      ...uri.queryParameters,
      'token': token,
    }).toString();

    webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(finalUrl));
  }
}
