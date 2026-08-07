import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../controllers/miniapp_controller.dart';

class MiniappView extends GetView<MiniappController> {
  const MiniappView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mini App'),
      ),
      body: WebViewWidget(controller: controller.webViewController),
    );
  }
}
