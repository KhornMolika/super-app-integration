import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dps_mobile_app/app/config/api_config.dart';
import 'package:dps_mobile_app/app/modules/miniapp/widgets/miniapp_iframe.dart';

class TermsReaderView extends StatefulWidget {
  final String title;
  final String url;

  const TermsReaderView({
    super.key,
    required this.title,
    required this.url,
  });

  @override
  State<TermsReaderView> createState() => _TermsReaderViewState();
}

class _TermsReaderViewState extends State<TermsReaderView> {
  WebViewController? _webViewController;
  bool _isLoading = true;
  String _resolvedUrl = '';
  late final String _viewTypeId;

  @override
  void initState() {
    super.initState();
    _resolvedUrl = ApiConfig.resolveUrl(widget.url);
    _viewTypeId = 'terms-reader-${DateTime.now().millisecondsSinceEpoch}';

    if (!kIsWeb) {
      _webViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..addJavaScriptChannel(
          'DSPNativeBridge',
          onMessageReceived: (JavaScriptMessage message) {
            Get.back();
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (url) {
              if (mounted) setState(() => _isLoading = true);
            },
            onPageFinished: (url) {
              if (mounted) setState(() => _isLoading = false);
            },
            onWebResourceError: (error) {
              if (mounted) setState(() => _isLoading = false);
            },
          ),
        )
        ..loadRequest(Uri.parse(_resolvedUrl));
    } else {
      _isLoading = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
          onPressed: () => Get.back(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              widget.url,
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 11,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_browser, color: Color(0xFF38BDF8), size: 20),
            tooltip: 'Open in external browser',
            onPressed: () async {
              final uri = Uri.parse(_resolvedUrl);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          buildMiniAppIframe(
            url: _resolvedUrl,
            viewTypeId: _viewTypeId,
            controller: _webViewController,
          ),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF0284C7),
              ),
            ),
        ],
      ),
    );
  }
}
