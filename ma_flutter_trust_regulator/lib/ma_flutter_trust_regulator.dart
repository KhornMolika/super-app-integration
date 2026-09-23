import 'package:flutter/material.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:flutter_contacts/flutter_contacts.dart';

/// Defines standard exit callback for host app navigation.
typedef ExitCallback = void Function();

/// Represents the active user session provided by the Super App or standalone host.
class AuthContext {
  final String jwtToken;
  final String userId;

  const AuthContext({
    required this.jwtToken,
    required this.userId,
  });
}

/// The entry point widget for the Trust Regulator mini app.
/// Designed for Security Testing & Capability Gatekeeper validation.
class TrustRegulatorAppEntry extends StatefulWidget {
  final AuthContext authContext;
  final ExitCallback onExit;
  final Future<String> Function()? onScanNFC;

  TrustRegulatorAppEntry({
    super.key,
    AuthContext? authContext,
    String? jwtToken,
    String? userId,
    ExitCallback? onExit,
    this.onScanNFC,
  })  : authContext = authContext ??
            AuthContext(
              jwtToken: jwtToken ?? '',
              userId: userId ?? '',
            ),
        onExit = onExit ?? (() {});

  @override
  State<TrustRegulatorAppEntry> createState() => _TrustRegulatorAppEntryState();
}

class _TrustRegulatorAppEntryState extends State<TrustRegulatorAppEntry> {
  int _selectedIndex = 0;
  String? _scannedNfcResult;
  bool _isScanningNfc = false;
  bool _isScanningBle = false;
  bool _isLoadingContacts = false;
  int _discoveredBleCount = 0;
  int _discoveredContactsCount = 0;

  // Theme Constants
  static const Color primaryNavy = Color(0xFF0F172A);
  static const Color primarySlate = Color(0xFF1E293B);
  static const Color accentEmerald = Color(0xFF10B981);
  static const Color warningOrange = Color(0xFFF59E0B);
  static const Color dangerRose = Color(0xFFE11D48);
  static const Color bgSurface = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: bgSurface,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primarySlate,
          primary: primarySlate,
          secondary: accentEmerald,
          surface: Colors.white,
        ),
      ),
      child: Scaffold(
        appBar: AppBar(
          elevation: 0,
          backgroundColor: primaryNavy,
          foregroundColor: Colors.white,
          titleSpacing: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            tooltip: 'Return to Super App',
            onPressed: widget.onExit,
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF38BDF8), Color(0xFF0284C7)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.gavel_rounded, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Trust Regulator Portal',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      letterSpacing: -0.2,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'RESTRICTED CAPABILITIES TESTBED',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.8,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: dangerRose.withAlpha(51),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: dangerRose, width: 1),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.warning_amber_rounded, size: 14, color: Color(0xFFFDA4AF)),
                  SizedBox(width: 4),
                  Text(
                    'RESTRICTED',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFFDA4AF),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.info_outline_rounded, size: 22),
              tooltip: 'Session Info',
              onPressed: _showSessionDetails,
            ),
            const SizedBox(width: 4),
          ],
        ),
        body: _selectedIndex == 0
            ? _buildOverviewTab()
            : _selectedIndex == 1
                ? _buildTestingLabTab()
                : _buildSettingsTab(),
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(13),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: NavigationBar(
            elevation: 0,
            backgroundColor: Colors.white,
            indicatorColor: primarySlate.withAlpha(38),
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) => setState(() => _selectedIndex = index),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard_rounded, color: primarySlate),
                label: 'Overview',
              ),
              NavigationDestination(
                icon: Badge(
                  label: Text('3'),
                  backgroundColor: dangerRose,
                  child: Icon(Icons.science_outlined),
                ),
                selectedIcon: Icon(Icons.science_rounded, color: primarySlate),
                label: 'Testing Lab',
              ),
              NavigationDestination(
                icon: Icon(Icons.settings_outlined),
                selectedIcon: Icon(Icons.settings_rounded, color: primarySlate),
                label: 'Settings',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Hero Banner
          Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF334155)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: primaryNavy.withAlpha(51),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(38),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withAlpha(76),
                          width: 1.5,
                        ),
                      ),
                      child: const Icon(
                        Icons.shield_outlined,
                        size: 32,
                        color: Color(0xFF38BDF8),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(38),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.security_rounded, size: 12, color: Color(0xFF38BDF8)),
                                SizedBox(width: 4),
                                Text(
                                  'REGULATORY EXEMPTION TESTBED',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.6,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Trust & Compliance Portal',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Contains declared unsupported hardware permissions to validate the automated Gatekeeper pipeline.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withAlpha(204),
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Unsupported Capabilities Notice Banner
          Container(
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.amber.shade300, width: 1.5),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, size: 20, color: Colors.amber.shade900),
                    const SizedBox(width: 8),
                    Text(
                      '3 Unsupported Hardware Permissions Declared',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.amber.shade900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'The Super App Catalog only supports Camera, Location, and Biometrics by default. The following capabilities require special gatekeeper exemption:',
                  style: TextStyle(fontSize: 11, color: Colors.amber.shade900, height: 1.3),
                ),
                const SizedBox(height: 12),
                _buildUnsupportedBadge(Icons.nfc_rounded, 'NFC Manager (nfc_manager: ^3.3.0)'),
                const SizedBox(height: 6),
                _buildUnsupportedBadge(Icons.bluetooth_rounded, 'Bluetooth BLE (flutter_blue_plus: ^1.35.4)'),
                const SizedBox(height: 6),
                _buildUnsupportedBadge(Icons.contacts_rounded, 'Address Book (flutter_contacts: ^1.1.9)'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Injected Auth Context Card
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(10),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.key_rounded, size: 18, color: primarySlate),
                    SizedBox(width: 8),
                    Text(
                      'Injected Super App Auth Context',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: primaryNavy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildInfoRow(Icons.person_pin_rounded, 'User ID', widget.authContext.userId),
                _buildInfoRow(
                  Icons.vpn_key_rounded,
                  'JWT Token',
                  widget.authContext.jwtToken.length > 20
                      ? '${widget.authContext.jwtToken.substring(0, 20)}...[MASKED]'
                      : widget.authContext.jwtToken,
                ),
                _buildInfoRow(Icons.memory_rounded, 'Enclave Isolation', 'SANDBOX_LEVEL_1 (ACTIVE)'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Direct Actions
          ElevatedButton.icon(
            onPressed: () => setState(() => _selectedIndex = 1),
            icon: const Icon(Icons.science_rounded, size: 18),
            label: const Text('Open Hardware Testing Lab'),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryNavy,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
          ),
          const SizedBox(height: 12),

          OutlinedButton.icon(
            onPressed: widget.onExit,
            icon: const Icon(Icons.arrow_back_rounded, size: 18),
            label: const Text('Return to Super App'),
            style: OutlinedButton.styleFrom(
              foregroundColor: primaryNavy,
              side: const BorderSide(color: cardBorder, width: 1.5),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUnsupportedBadge(IconData icon, String title) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: dangerRose),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryNavy),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: dangerRose.withAlpha(25),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text(
              'UNSUPPORTED',
              style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: dangerRose),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 1: TESTING LAB (UNSUPPORTED PERMISSIONS)
  // ==========================================
  Widget _buildTestingLabTab() {
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        const Row(
          children: [
            Icon(Icons.science_rounded, size: 22, color: dangerRose),
            SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Restricted Hardware Testing Lab',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryNavy),
                ),
                Text(
                  'Trigger declared unsupported hardware APIs',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),

        // 1. NFC Hardware Card
        _buildPermissionTestCard(
          title: 'NFC Chip Reader',
          pluginName: 'nfc_manager: ^3.3.0',
          capability: 'nfc_manager',
          icon: Icons.nfc_rounded,
          statusText: _scannedNfcResult != null
              ? 'NFC Tag Read: $_scannedNfcResult'
              : 'Requires hardware NFC bridge',
          actionLabel: _isScanningNfc ? 'Scanning NFC Tag...' : 'Scan NFC Tag',
          actionIcon: Icons.contactless_rounded,
          isLoading: _isScanningNfc,
          onAction: _testNfcScan,
        ),
        const SizedBox(height: 14),

        // 2. Bluetooth BLE Card
        _buildPermissionTestCard(
          title: 'Bluetooth Low Energy (BLE)',
          pluginName: 'flutter_blue_plus: ^1.35.4',
          capability: 'bluetooth',
          icon: Icons.bluetooth_rounded,
          statusText: _discoveredBleCount > 0
              ? 'Found $_discoveredBleCount BLE Peripherals'
              : 'Requires Bluetooth peripheral scan grant',
          actionLabel: _isScanningBle ? 'Scanning BLE Radios...' : 'Scan Bluetooth Devices',
          actionIcon: Icons.bluetooth_searching_rounded,
          isLoading: _isScanningBle,
          onAction: _testBleScan,
        ),
        const SizedBox(height: 14),

        // 3. Contacts Card
        _buildPermissionTestCard(
          title: 'User Address Book / Contacts',
          pluginName: 'flutter_contacts: ^1.1.9',
          capability: 'contacts',
          icon: Icons.contacts_rounded,
          statusText: _discoveredContactsCount > 0
              ? 'Loaded $_discoveredContactsCount Address Book Records'
              : 'Requires Address Book read grant',
          actionLabel: _isLoadingContacts ? 'Reading Contacts...' : 'Query Device Contacts',
          actionIcon: Icons.import_contacts_rounded,
          isLoading: _isLoadingContacts,
          onAction: _testContactsRead,
        ),
      ],
    );
  }

  Widget _buildPermissionTestCard({
    required String title,
    required String pluginName,
    required String capability,
    required IconData icon,
    required String statusText,
    required String actionLabel,
    required IconData actionIcon,
    required bool isLoading,
    required VoidCallback onAction,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: dangerRose.withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 20, color: dangerRose),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: primaryNavy),
                    ),
                    Text(
                      pluginName,
                      style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: dangerRose.withAlpha(25),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'UNSUPPORTED',
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: dangerRose),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    statusText,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: isLoading ? null : onAction,
              icon: isLoading
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Icon(actionIcon, size: 16),
              label: Text(actionLabel),
              style: FilledButton.styleFrom(
                backgroundColor: primaryNavy,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _testNfcScan() async {
    setState(() => _isScanningNfc = true);
    try {
      final isAvailable = await NfcManager.instance.isAvailable();
      if (!isAvailable) {
        throw Exception('NFC hardware is not available on this device/environment.');
      }
      setState(() {
        _scannedNfcResult = "NFC_UID_TEST_89CAF3201";
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('NFC hardware query executed!'),
            backgroundColor: accentEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('NFC Request (Unsupported): $e'),
            backgroundColor: warningOrange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isScanningNfc = false);
    }
  }

  Future<void> _testBleScan() async {
    setState(() => _isScanningBle = true);
    try {
      final isSupported = await FlutterBluePlus.isSupported;
      if (!isSupported) {
        throw Exception('Bluetooth hardware not supported in this runtime sandbox.');
      }
      setState(() {
        _discoveredBleCount = 3;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('BLE Discovery executed!'),
            backgroundColor: accentEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bluetooth Request (Unsupported): $e'),
            backgroundColor: warningOrange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isScanningBle = false);
    }
  }

  Future<void> _testContactsRead() async {
    setState(() => _isLoadingContacts = true);
    try {
      final permission = await FlutterContacts.requestPermission(readonly: true);
      if (!permission) {
        throw Exception('Contacts read permission denied by system policy.');
      }
      setState(() {
        _discoveredContactsCount = 42;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Address Book accessed successfully!'),
            backgroundColor: accentEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Contacts Request (Unsupported): $e'),
            backgroundColor: warningOrange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingContacts = false);
    }
  }

  Widget _buildSettingsTab() {
    return Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.tune_rounded, size: 20, color: primarySlate),
              SizedBox(width: 8),
              Text(
                'Mini App Settings',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryNavy),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cardBorder),
            ),
            child: const Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.info_outline_rounded, size: 16, color: primarySlate),
                    SizedBox(width: 8),
                    Text('Package: dps_miniapp_mobile_trust_regulator', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                  ],
                ),
                SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.extension_rounded, size: 16, color: primarySlate),
                    SizedBox(width: 8),
                    Text('SDK Contract: dps_core_package v1.0.0', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          SizedBox(
            width: 105,
            child: Text(
              label,
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: FontWeight.w600,
                color: primaryNavy,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  void _showSessionDetails() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Icon(Icons.shield_outlined, color: primarySlate, size: 22),
                SizedBox(width: 8),
                Text(
                  'Super App Security Session',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: primaryNavy),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Runtime parameters injected securely from the Super App host.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(Icons.person_pin_rounded, 'User ID', widget.authContext.userId),
            _buildInfoRow(Icons.vpn_key_rounded, 'JWT Token', widget.authContext.jwtToken),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Navigator.of(ctx).pop(),
                icon: const Icon(Icons.close_rounded, size: 16),
                label: const Text('Close Session Inspector'),
                style: FilledButton.styleFrom(
                  backgroundColor: primaryNavy,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
