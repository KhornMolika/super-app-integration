// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
// ignore: avoid_web_libraries_in_flutter
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

final Set<String> _registeredViews = {};

Widget buildMiniAppIframe({
  required String url,
  required String viewTypeId,
  required WebViewController? controller,
}) {
  if (!_registeredViews.contains(viewTypeId)) {
    _registeredViews.add(viewTypeId);
    // ignore: undefined_prefixed_name
    ui_web.platformViewRegistry.registerViewFactory(
      viewTypeId,
      (int viewId) {
        final iframe = html.IFrameElement()
          ..src = url
          ..style.border = 'none'
          ..style.width = '100%'
          ..style.height = '100%'
          ..style.backgroundColor = '#080C14'
          ..allow = 'camera; microphone; geolocation; clipboard-read; clipboard-write; autoplay';
        return iframe;
      },
    );
  }

  return SizedBox.expand(
    child: HtmlElementView(viewType: viewTypeId),
  );
}
