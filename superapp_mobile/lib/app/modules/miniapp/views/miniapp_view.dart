import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/miniapp_controller.dart';
import '../widgets/miniapp_iframe.dart';

class MiniappView extends GetView<MiniappController> {
  const MiniappView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        title: Text(controller.appName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: buildMiniAppIframe(
        url: controller.finalUrl,
        viewTypeId: controller.viewTypeId,
        controller: controller.webViewController,
      ),
    );
  }
}
