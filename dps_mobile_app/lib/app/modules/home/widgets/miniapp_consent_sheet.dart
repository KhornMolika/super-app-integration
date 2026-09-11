import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dps_mobile_app/app/config/api_config.dart';
import 'terms_reader_view.dart';

class MiniAppConsentSheet extends StatelessWidget {
  final dynamic app;

  const MiniAppConsentSheet({
    super.key,
    required this.app,
  });

  @override
  Widget build(BuildContext context) {
    final String name = (app['name'] ?? 'Mini App').toString();
    final String version = (app['version'] ?? '1.0.0').toString();
    final String? logoUrl = app['logo'];
    final String? teamName = app['teamName'] ?? app['ownerName'];
    final String description = (app['shortDescription'] ?? app['fullDescription'] ?? 'This verified Mini App runs seamlessly inside the Super App environment.').toString();
    final String? termsUrl = app['termsUrl'];
    final String? termsDesc = app['termsDescription'];
    final String? privacyUrl = app['privacyPolicyUrl'];
    final String? privacyDesc = app['privacyPolicyDescription'];
    final List<dynamic> permissions = (app['permissions'] as List? ?? []);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: Color(0xFF1E293B), width: 1.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black87,
            blurRadius: 30,
            offset: Offset(0, -10),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Drag Handle
            Center(
              child: Container(
                width: 44,
                height: 4.5,
                margin: const EdgeInsets.only(top: 12, bottom: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF334155),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),

            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header with App Identity
                    Row(
                      children: [
                        _buildLogo(logoUrl, name),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      name,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.35)),
                                    ),
                                    child: Text(
                                      'v$version',
                                      style: const TextStyle(
                                        color: Color(0xFF34D399),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                teamName != null && teamName.isNotEmpty
                                    ? 'Provided by $teamName'
                                    : 'Super App Ecosystem Partner',
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // 1. About / Mini App Description
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.info_outline, size: 14, color: Color(0xFF38BDF8)),
                              SizedBox(width: 6),
                              Text(
                                'ABOUT THIS MINI APP',
                                style: TextStyle(
                                  color: Color(0xFF38BDF8),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            description,
                            style: const TextStyle(
                              color: Color(0xFFE2E8F0),
                              fontSize: 13,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // 2. Native Permissions & Capabilities
                    if (permissions.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      const Text(
                        'DEVICE CAPABILITIES REQUIRED',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.4)),
                        ),
                        child: Column(
                          children: permissions.map((p) {
                            final String type = (p is Map ? (p['type'] ?? p['name'] ?? 'Permission') : p).toString();
                            final String purpose = (p is Map ? (p['purpose'] ?? 'Required for app functionality') : 'Required for app functionality').toString();
                            final IconData icon = _getPermissionIcon(type);

                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(icon, size: 14, color: const Color(0xFF38BDF8)),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          type,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 1),
                                        Text(
                                          purpose,
                                          style: const TextStyle(
                                            color: Color(0xFF94A3B8),
                                            fontSize: 11,
                                            height: 1.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],

                    // 3. Terms & Privacy Policy Data Summary
                    const SizedBox(height: 16),
                    const Text(
                      'DATA & LEGAL TERMS',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (privacyDesc != null && privacyDesc.trim().isNotEmpty) ...[
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.shield_outlined, size: 15, color: Color(0xFF34D399)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: RichText(
                                    text: TextSpan(
                                      style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
                                      children: [
                                        const TextSpan(
                                          text: 'Privacy Notice: ',
                                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        TextSpan(text: privacyDesc),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                          ],
                          if (termsDesc != null && termsDesc.trim().isNotEmpty) ...[
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.gavel_outlined, size: 15, color: Color(0xFFA78BFA)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: RichText(
                                    text: TextSpan(
                                      style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
                                      children: [
                                        const TextSpan(
                                          text: 'Terms of Service: ',
                                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        TextSpan(text: termsDesc),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                          ],

                          // Clickable Links to view full webview content
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              if (termsUrl != null && termsUrl.trim().isNotEmpty)
                                InkWell(
                                  onTap: () => Get.to(() => TermsReaderView(
                                    title: '$name Terms of Service',
                                    url: termsUrl,
                                  )),
                                  borderRadius: BorderRadius.circular(6),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          'View Terms of Service',
                                          style: TextStyle(
                                            color: Color(0xFF38BDF8),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            decoration: TextDecoration.underline,
                                          ),
                                        ),
                                        SizedBox(width: 4),
                                        Icon(Icons.launch, size: 11, color: Color(0xFF38BDF8)),
                                      ],
                                    ),
                                  ),
                                ),
                              if (termsUrl != null && privacyUrl != null)
                                const Text('•', style: TextStyle(color: Color(0xFF64748B))),
                              if (privacyUrl != null && privacyUrl.trim().isNotEmpty)
                                InkWell(
                                  onTap: () => Get.to(() => TermsReaderView(
                                    title: '$name Privacy Policy',
                                    url: privacyUrl,
                                  )),
                                  borderRadius: BorderRadius.circular(6),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          'View Privacy Policy',
                                          style: TextStyle(
                                            color: Color(0xFF38BDF8),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            decoration: TextDecoration.underline,
                                          ),
                                        ),
                                        SizedBox(width: 4),
                                        Icon(Icons.launch, size: 11, color: Color(0xFF38BDF8)),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Bottom Buttons
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: const BoxDecoration(
                color: Color(0xFF0B1120),
                border: Border(top: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF334155)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () => Get.back(result: false),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        elevation: 4,
                        shadowColor: const Color(0xFF0284C7).withValues(alpha: 0.5),
                      ),
                      onPressed: () => Get.back(result: true),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Agree & Launch',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(width: 6),
                          Icon(Icons.arrow_forward, size: 15, color: Colors.white),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogo(String? logoUrl, String name) {
    const double size = 48.0;
    if (logoUrl != null && logoUrl.isNotEmpty) {
      if (logoUrl.startsWith('data:image')) {
        try {
          final base64Str = logoUrl.split(',').last;
          final bytes = base64Decode(base64Str);
          return ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.memory(
              bytes,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _buildFallbackAvatar(name, size),
            ),
          );
        } catch (_) {}
      } else {
        final resolvedUrl = ApiConfig.resolveUrl(logoUrl);
        return ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Image.network(
            resolvedUrl,
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _buildFallbackAvatar(name, size),
          ),
        );
      }
    }
    return _buildFallbackAvatar(name, size);
  }

  Widget _buildFallbackAvatar(String name, double size) {
    final initial = name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'M';
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF6366F1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.42,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  IconData _getPermissionIcon(String type) {
    final t = type.toLowerCase();
    if (t.contains('camera')) return Icons.camera_alt_outlined;
    if (t.contains('location') || t.contains('geolocator')) return Icons.location_on_outlined;
    if (t.contains('bio') || t.contains('finger') || t.contains('auth')) return Icons.fingerprint;
    if (t.contains('storage') || t.contains('file')) return Icons.folder_open_outlined;
    if (t.contains('photo') || t.contains('image')) return Icons.photo_library_outlined;
    if (t.contains('contact')) return Icons.contacts_outlined;
    if (t.contains('nfc')) return Icons.nfc_outlined;
    return Icons.security_outlined;
  }
}
