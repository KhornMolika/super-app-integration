import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

Widget buildMiniAppIframe({
  required String url,
  required String viewTypeId,
  required WebViewController? controller,
}) {
  if (controller != null) {
    return WebViewWidget(controller: controller);
  }
  return const Center(child: CircularProgressIndicator());
}
