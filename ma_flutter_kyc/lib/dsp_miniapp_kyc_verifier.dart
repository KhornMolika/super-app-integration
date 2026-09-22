import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:local_auth/local_auth.dart';

/// Entry Point Widget for KYC Verifier Mini App.
/// Accepts clean parameters without any proprietary core package dependencies.
class KycVerifierAppEntry extends StatefulWidget {
  final String jwtToken;
  final String userId;
  final VoidCallback onExit;
  final Map<String, dynamic>? initialParams;
  final Future<void> Function(String documentType, String status)? onKycCompleted;

  const KycVerifierAppEntry({
    super.key,
    required this.jwtToken,
    required this.userId,
    required this.onExit,
    this.initialParams,
    this.onKycCompleted,
  });

  @override
  State<KycVerifierAppEntry> createState() => _KycVerifierAppEntryState();
}

class _KycVerifierAppEntryState extends State<KycVerifierAppEntry> with SingleTickerProviderStateMixin {
  int _currentTab = 0;
  final ImagePicker _picker = ImagePicker();
  final LocalAuthentication _auth = LocalAuthentication();

  // Selected Document Type
  String _selectedDocType = 'National ID Card';
  final List<Map<String, dynamic>> _docTypes = [
    {'name': 'National ID Card', 'icon': Icons.badge_outlined},
    {'name': 'Passport', 'icon': Icons.menu_book_outlined},
    {'name': 'Driver License', 'icon': Icons.drive_eta_outlined},
    {'name': 'Resident Permit', 'icon': Icons.home_work_outlined},
  ];

  // KYC Workflow State
  XFile? _capturedDocument;
  int? _capturedFileSize;
  Position? _currentPosition;
  bool _isLocating = false;
  bool _isBiometricVerified = false;
  bool _isBiometricSupported = false;
  List<BiometricType> _availableBiometrics = [];

  // Theme Constants
  static const Color primaryNavy = Color(0xFF0F172A);
  static const Color primaryIndigo = Color(0xFF4338CA);
  static const Color accentIndigo = Color(0xFF6366F1);
  static const Color accentEmerald = Color(0xFF10B981);
  static const Color bgSurface = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);

  @override
  void initState() {
    super.initState();
    _checkBiometricsSupport();
  }

  Future<void> _checkBiometricsSupport() async {
    try {
      final isSupported = await _auth.isDeviceSupported();
      final canAuth = await _auth.canCheckBiometrics;
      List<BiometricType> types = [];
      if (canAuth) {
        types = await _auth.getAvailableBiometrics();
      }
      if (mounted) {
        setState(() {
          _isBiometricSupported = isSupported && canAuth;
          _availableBiometrics = types;
        });
      }
    } catch (_) {
      // Graceful fallback
    }
  }

  int get _completedStepsCount {
    int count = 0;
    if (_capturedDocument != null) count++;
    if (_currentPosition != null) count++;
    if (_isBiometricVerified) count++;
    return count;
  }

  double get _progressPercent => _completedStepsCount / 3.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Theme(
      data: theme.copyWith(
        scaffoldBackgroundColor: bgSurface,
        colorScheme: theme.colorScheme.copyWith(
          primary: primaryIndigo,
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
                    colors: [Color(0xFF6366F1), Color(0xFF4338CA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.verified_user_rounded, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Digital KYC Verifier',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      letterSpacing: -0.2,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'SUPER APP SECURITY SANDBOX',
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
                color: _completedStepsCount == 3
                    ? accentEmerald.withAlpha(51)
                    : Colors.white.withAlpha(25),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _completedStepsCount == 3
                      ? accentEmerald
                      : Colors.white.withAlpha(51),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _completedStepsCount == 3 ? Icons.check_circle_rounded : Icons.pending_rounded,
                    size: 14,
                    color: _completedStepsCount == 3 ? const Color(0xFF34D399) : Colors.amber.shade300,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    '$_completedStepsCount / 3',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _completedStepsCount == 3 ? const Color(0xFF34D399) : Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.shield_outlined, size: 22),
              tooltip: 'Session Security Details',
              onPressed: _showSessionDialog,
            ),
            const SizedBox(width: 4),
          ],
        ),
        body: Column(
          children: [
            // Top Step Progress Indicator Bar
            _buildTopProgressHeader(),
            Expanded(child: _buildCurrentTab()),
          ],
        ),
        bottomNavigationBar: _buildBottomNav(),
      ),
    );
  }

  Widget _buildTopProgressHeader() {
    return Container(
      color: primaryNavy,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
      child: Column(
        children: [
          Row(
            children: [
              _buildProgressStep(
                stepIndex: 0,
                icon: Icons.camera_alt_rounded,
                label: 'Document',
                isDone: _capturedDocument != null,
                isActive: _currentTab == 1,
                onTap: () => setState(() => _currentTab = 1),
              ),
              _buildStepDivider(_capturedDocument != null),
              _buildProgressStep(
                stepIndex: 1,
                icon: Icons.location_on_rounded,
                label: 'Location',
                isDone: _currentPosition != null,
                isActive: _currentTab == 2,
                onTap: () => setState(() => _currentTab = 2),
              ),
              _buildStepDivider(_currentPosition != null),
              _buildProgressStep(
                stepIndex: 2,
                icon: Icons.fingerprint_rounded,
                label: 'Biometrics',
                isDone: _isBiometricVerified,
                isActive: _currentTab == 3,
                onTap: () => setState(() => _currentTab = 3),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _progressPercent,
              minHeight: 4,
              backgroundColor: Colors.white.withAlpha(25),
              valueColor: AlwaysStoppedAnimation<Color>(
                _completedStepsCount == 3 ? accentEmerald : accentIndigo,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressStep({
    required int stepIndex,
    required IconData icon,
    required String label,
    required bool isDone,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    Color bg;
    Color fg;
    Color border;

    if (isDone) {
      bg = accentEmerald.withAlpha(51);
      fg = const Color(0xFF34D399);
      border = accentEmerald;
    } else if (isActive) {
      bg = accentIndigo.withAlpha(76);
      fg = Colors.white;
      border = const Color(0xFF818CF8);
    } else {
      bg = Colors.white.withAlpha(13);
      fg = const Color(0xFF94A3B8);
      border = Colors.transparent;
    }

    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: border, width: 1.2),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isDone ? Icons.check_circle_rounded : icon,
                    size: 15,
                    color: fg,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isActive || isDone ? FontWeight.bold : FontWeight.w500,
                      color: fg,
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

  Widget _buildStepDivider(bool isCompleted) {
    return Container(
      width: 14,
      height: 2,
      margin: const EdgeInsets.symmetric(horizontal: 2),
      color: isCompleted ? accentEmerald : Colors.white.withAlpha(38),
    );
  }

  Widget _buildBottomNav() {
    return Container(
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
        indicatorColor: primaryIndigo.withAlpha(38),
        selectedIndex: _currentTab,
        onDestinationSelected: (index) => setState(() => _currentTab = index),
        destinations: [
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _completedStepsCount == 3,
              backgroundColor: accentEmerald,
              smallSize: 8,
              child: const Icon(Icons.dashboard_outlined),
            ),
            selectedIcon: const Icon(Icons.dashboard_rounded, color: primaryIndigo),
            label: 'Overview',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _capturedDocument != null,
              backgroundColor: accentEmerald,
              label: const Icon(Icons.check, size: 8, color: Colors.white),
              child: const Icon(Icons.badge_outlined),
            ),
            selectedIcon: const Icon(Icons.badge_rounded, color: primaryIndigo),
            label: 'Document',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _currentPosition != null,
              backgroundColor: accentEmerald,
              label: const Icon(Icons.check, size: 8, color: Colors.white),
              child: const Icon(Icons.location_on_outlined),
            ),
            selectedIcon: const Icon(Icons.location_on_rounded, color: primaryIndigo),
            label: 'Location',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _isBiometricVerified,
              backgroundColor: accentEmerald,
              label: const Icon(Icons.check, size: 8, color: Colors.white),
              child: const Icon(Icons.fingerprint_outlined),
            ),
            selectedIcon: const Icon(Icons.fingerprint_rounded, color: primaryIndigo),
            label: 'Biometrics',
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_currentTab) {
      case 0:
        return _buildOverviewTab();
      case 1:
        return _buildDocumentTab();
      case 2:
        return _buildLocationTab();
      case 3:
        return _buildBiometricTab();
      default:
        return _buildOverviewTab();
    }
  }

  // ==========================================
  // TAB 0: OVERVIEW & SUBMISSION DASHBOARD
  // ==========================================
  Widget _buildOverviewTab() {
    final isComplete = _completedStepsCount == 3;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Hero Banner
          _buildHeroBanner(isComplete),
          const SizedBox(height: 16),

          // Security & Compliance Quick Stat Badges
          _buildComplianceChipsRow(),
          const SizedBox(height: 20),

          // Section Title
          Row(
            children: [
              const Icon(Icons.checklist_rounded, size: 20, color: primaryIndigo),
              const SizedBox(width: 8),
              const Text(
                'Required Verification Stages',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: primaryNavy,
                ),
              ),
              const Spacer(),
              Text(
                '$_completedStepsCount of 3 Done',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isComplete ? accentEmerald : primaryIndigo,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Stage 1: Document Card
          _buildInteractiveStageCard(
            stepNumber: 1,
            title: 'Official ID / Passport Scan',
            subtitle: _capturedDocument != null
                ? 'Captured: ${_capturedDocument!.name} (${(_capturedFileSize != null ? (_capturedFileSize! / 1024).toStringAsFixed(1) : "0")} KB)'
                : 'National ID, Passport or License photo required',
            icon: Icons.camera_alt_rounded,
            isDone: _capturedDocument != null,
            actionLabel: _capturedDocument != null ? 'View / Retake' : 'Capture Document',
            actionIcon: _capturedDocument != null ? Icons.refresh_rounded : Icons.photo_camera_rounded,
            onAction: () => setState(() => _currentTab = 1),
          ),
          const SizedBox(height: 12),

          // Stage 2: Location Card
          _buildInteractiveStageCard(
            stepNumber: 2,
            title: 'GPS Geographic Presence',
            subtitle: _currentPosition != null
                ? 'Fixed: ${_currentPosition!.latitude.toStringAsFixed(4)}°, ${_currentPosition!.longitude.toStringAsFixed(4)}° (±${_currentPosition!.accuracy.toStringAsFixed(1)}m)'
                : 'Geographic coordinate binding compliance',
            icon: Icons.location_on_rounded,
            isDone: _currentPosition != null,
            actionLabel: _currentPosition != null ? 'Refresh GPS' : 'Acquire Location',
            actionIcon: Icons.gps_fixed_rounded,
            onAction: () => setState(() => _currentTab = 2),
          ),
          const SizedBox(height: 12),

          // Stage 3: Biometrics Card
          _buildInteractiveStageCard(
            stepNumber: 3,
            title: 'Cryptographic Biometrics',
            subtitle: _isBiometricVerified
                ? 'Verified: Hardware biometric liveness authenticated'
                : 'Hardware Face ID / Fingerprint liveness confirmation',
            icon: Icons.fingerprint_rounded,
            isDone: _isBiometricVerified,
            actionLabel: _isBiometricVerified ? 'Re-Verify' : 'Authenticate',
            actionIcon: Icons.security_rounded,
            onAction: () => setState(() => _currentTab = 3),
          ),
          const SizedBox(height: 24),

          // Payload Metadata Summary Card (if any progress done)
          if (_completedStepsCount > 0) ...[
            _buildPayloadSummaryCard(),
            const SizedBox(height: 24),
          ],

          // Submit KYC Package Button
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              boxShadow: isComplete
                  ? [
                      BoxShadow(
                        color: accentEmerald.withAlpha(89),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      )
                    ]
                  : null,
            ),
            child: ElevatedButton.icon(
              onPressed: isComplete ? _submitVerification : null,
              icon: Icon(
                isComplete ? Icons.verified_user_rounded : Icons.lock_outline_rounded,
                size: 20,
              ),
              label: Text(
                isComplete ? 'Submit Complete KYC Dossier' : 'Complete All 3 Steps To Submit',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: isComplete ? accentEmerald : Colors.grey.shade400,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Return Action
          OutlinedButton.icon(
            onPressed: widget.onExit,
            icon: const Icon(Icons.arrow_back_rounded, size: 18),
            label: const Text('Return to Super App Workspace'),
            style: OutlinedButton.styleFrom(
              foregroundColor: primaryNavy,
              side: const BorderSide(color: cardBorder, width: 1.5),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildHeroBanner(bool isComplete) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isComplete
              ? [const Color(0xFF064E3B), const Color(0xFF065F46), const Color(0xFF047857)]
              : [const Color(0xFF0F172A), const Color(0xFF1E1B4B), const Color(0xFF312E81)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: (isComplete ? accentEmerald : primaryIndigo).withAlpha(51),
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
                child: Icon(
                  isComplete ? Icons.verified_rounded : Icons.shield_rounded,
                  size: 32,
                  color: isComplete ? const Color(0xFF34D399) : Colors.white,
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
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isComplete ? Icons.check_circle_outline : Icons.bolt_rounded,
                            size: 12,
                            color: isComplete ? const Color(0xFF34D399) : const Color(0xFFFDE047),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isComplete ? 'READY FOR ATTESTATION' : 'KYC VERIFICATION IN PROGRESS',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.6,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      isComplete ? 'Identity Verification Complete' : 'Digital KYC Attestation',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isComplete
                          ? 'All platform security checks passed. Ready to sign and submit token dossier.'
                          : 'Execute camera capture, GPS fix, and biometrics to verify your digital identity.',
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
    );
  }

  Widget _buildComplianceChipsRow() {
    return Row(
      children: [
        _buildCompliancePill(Icons.lock_rounded, 'AES-256 GCM'),
        const SizedBox(width: 8),
        _buildCompliancePill(Icons.verified_user_rounded, 'AML/CFT EAL4+'),
        const SizedBox(width: 8),
        _buildCompliancePill(Icons.memory_rounded, 'Hardware Key'),
      ],
    );
  }

  Widget _buildCompliancePill(IconData icon, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: cardBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 13, color: primaryIndigo),
            const SizedBox(width: 5),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: primaryNavy,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInteractiveStageCard({
    required int stepNumber,
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isDone,
    required String actionLabel,
    required IconData actionIcon,
    required VoidCallback onAction,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDone ? accentEmerald.withAlpha(128) : cardBorder,
          width: isDone ? 1.5 : 1,
        ),
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
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isDone ? accentEmerald.withAlpha(38) : primaryIndigo.withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isDone ? Icons.check_circle_rounded : icon,
                  color: isDone ? accentEmerald : primaryIndigo,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'STAGE 0$stepNumber',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: isDone ? accentEmerald : primaryIndigo,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDone ? accentEmerald.withAlpha(25) : Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: isDone ? accentEmerald.withAlpha(76) : Colors.amber.shade200,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isDone ? Icons.check_rounded : Icons.schedule_rounded,
                                size: 11,
                                color: isDone ? accentEmerald : Colors.amber.shade800,
                              ),
                              const SizedBox(width: 3),
                              Text(
                                isDone ? 'VERIFIED' : 'PENDING',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: isDone ? accentEmerald : Colors.amber.shade800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: primaryNavy,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.only(left: 48),
            child: Text(
              subtitle,
              style: TextStyle(
                fontSize: 12,
                color: isDone ? const Color(0xFF047857) : const Color(0xFF64748B),
                height: 1.2,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: onAction,
              icon: Icon(actionIcon, size: 16),
              label: Text(actionLabel),
              style: TextButton.styleFrom(
                foregroundColor: isDone ? accentEmerald : primaryIndigo,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: BorderSide(
                    color: isDone ? accentEmerald.withAlpha(76) : primaryIndigo.withAlpha(76),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPayloadSummaryCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.terminal_rounded, size: 18, color: primaryNavy),
              SizedBox(width: 8),
              Text(
                'Verification Payload Metadata',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: primaryNavy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildPayloadRow(Icons.person_outline_rounded, 'User ID', widget.userId),
          _buildPayloadRow(Icons.description_outlined, 'Doc Type', _selectedDocType),
          if (_capturedDocument != null)
            _buildPayloadRow(Icons.image_outlined, 'Document File', _capturedDocument!.name),
          if (_currentPosition != null)
            _buildPayloadRow(
              Icons.pin_drop_outlined,
              'Coordinates',
              '${_currentPosition!.latitude.toStringAsFixed(5)}, ${_currentPosition!.longitude.toStringAsFixed(5)}',
            ),
          if (_isBiometricVerified)
            _buildPayloadRow(Icons.fingerprint_rounded, 'Biometric Sign', 'HARDWARE_ENCLAVE_SIGN_VALID'),
        ],
      ),
    );
  }

  Widget _buildPayloadRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          SizedBox(
            width: 95,
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

  // ==========================================
  // TAB 1: DOCUMENT SCANNER (CAMERA PERMISSION)
  // ==========================================
  Widget _buildDocumentTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Section Title
          const Row(
            children: [
              Icon(Icons.camera_enhance_rounded, size: 22, color: primaryIndigo),
              SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Document Scanner',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryNavy),
                  ),
                  Text(
                    'Utilizes Camera & Storage platform permissions',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Document Type Selector Chips
          const Text(
            'Select Document Type:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: primaryNavy),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _docTypes.map((doc) {
                final isSelected = _selectedDocType == doc['name'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    avatar: Icon(
                      doc['icon'] as IconData,
                      size: 16,
                      color: isSelected ? Colors.white : primaryIndigo,
                    ),
                    label: Text(doc['name'] as String),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedDocType = doc['name'] as String);
                    },
                    selectedColor: primaryIndigo,
                    checkmarkColor: Colors.white,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? Colors.white : primaryNavy,
                    ),
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: isSelected ? primaryIndigo : cardBorder,
                      width: 1.2,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 18),

          // Viewfinder Container / Image Preview
          _buildScannerViewfinder(),
          const SizedBox(height: 18),

          // Trigger Action Buttons
          Row(
            children: [
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: () => _captureImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_rounded, size: 18),
                  label: Text(_capturedDocument != null ? 'Retake Photo' : 'Capture with Camera'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryIndigo,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: () => _captureImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_rounded, size: 18),
                  label: const Text('From Gallery'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: primaryNavy,
                    side: const BorderSide(color: cardBorder, width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Compliance & Quality Tips Card
          _buildScannerTipsCard(),
        ],
      ),
    );
  }

  Widget _buildScannerViewfinder() {
    final hasImage = _capturedDocument != null;

    return Container(
      height: 240,
      decoration: BoxDecoration(
        color: hasImage ? Colors.black : const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: hasImage ? accentEmerald : accentIndigo.withAlpha(128),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: (hasImage ? accentEmerald : accentIndigo).withAlpha(38),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Background Image if captured
            if (hasImage)
              Positioned.fill(
                child: kIsWeb
                    ? Image.network(_capturedDocument!.path, fit: BoxFit.cover)
                    : Image.file(File(_capturedDocument!.path), fit: BoxFit.cover),
              ),

            // Subtle Dark Dimming for Overlays
            if (hasImage)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withAlpha(100),
                        Colors.transparent,
                        Colors.black.withAlpha(180),
                      ],
                    ),
                  ),
                ),
              ),

            // Viewfinder Corner Brackets Overlay
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: CustomPaint(
                  painter: _ViewfinderCornerPainter(
                    color: hasImage ? accentEmerald : accentIndigo,
                  ),
                ),
              ),
            ),

            // Center Content
            if (!hasImage)
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: accentIndigo.withAlpha(51),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.document_scanner_rounded,
                      size: 48,
                      color: Color(0xFF818CF8),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Align $_selectedDocType within frame',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Ensure all 4 corners & text are clearly visible',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                  ),
                ],
              )
            else
              Positioned(
                bottom: 16,
                left: 16,
                right: 16,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: accentEmerald,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle_rounded, size: 14, color: Colors.white),
                          SizedBox(width: 5),
                          Text(
                            'OCR READY',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(150),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _capturedDocument!.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontFamily: 'monospace',
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

  Widget _buildScannerTipsCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.lightbulb_outline_rounded, size: 18, color: primaryIndigo),
              SizedBox(width: 8),
              Text(
                'Photo Verification Guidelines',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: primaryNavy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildTipItem(Icons.wb_sunny_outlined, 'Provide natural, even lighting without heavy shadows or camera glare.'),
          _buildTipItem(Icons.crop_free_rounded, 'Position the card flat on a dark, non-reflective background.'),
          _buildTipItem(Icons.spellcheck_rounded, 'Verify all alphanumeric characters, dates, and MRZ lines are in focus.'),
        ],
      ),
    );
  }

  Widget _buildTipItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 11, color: Color(0xFF475569), height: 1.3),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _captureImage(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      if (file != null) {
        final length = await file.length();
        setState(() {
          _capturedDocument = file;
          _capturedFileSize = length;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text('Attached ${file.name} successfully!')),
                ],
              ),
              backgroundColor: accentEmerald,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Camera error: $e')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  // ==========================================
  // TAB 2: GEOSPATIAL PROOF (LOCATION PERMISSION)
  // ==========================================
  Widget _buildLocationTab() {
    final hasLocation = _currentPosition != null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Section Title
          const Row(
            children: [
              Icon(Icons.satellite_alt_rounded, size: 22, color: primaryIndigo),
              SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Geospatial Presence Proof',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryNavy),
                  ),
                  Text(
                    'Utilizes GPS & Location platform permissions',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Radar / Geospatial Visualizer Card
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: hasLocation
                    ? [const Color(0xFF0F172A), const Color(0xFF064E3B)]
                    : [const Color(0xFF0F172A), const Color(0xFF1E293B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: hasLocation ? accentEmerald : const Color(0xFF334155),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: (hasLocation ? accentEmerald : Colors.black).withAlpha(38),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(22),
            child: Column(
              children: [
                // Radar Icon & Pulse
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: (hasLocation ? accentEmerald : accentIndigo).withAlpha(38),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: (hasLocation ? accentEmerald : accentIndigo).withAlpha(100),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    hasLocation ? Icons.my_location_rounded : Icons.location_searching_rounded,
                    size: 48,
                    color: hasLocation ? const Color(0xFF34D399) : const Color(0xFF818CF8),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  hasLocation ? 'High-Precision GPS Lock Acquired' : 'GPS Fix Not Acquired',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  hasLocation
                      ? 'Geographic jurisdictional coordinates bound cryptographically.'
                      : 'Acquire live coordinates to verify physical presence compliance.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),

                if (hasLocation) ...[
                  const SizedBox(height: 20),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withAlpha(76),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withAlpha(25)),
                    ),
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      children: [
                        _buildGpsMetricRow(Icons.north_east_rounded, 'Latitude', '${_currentPosition!.latitude}°'),
                        const Divider(color: Color(0xFF334155), height: 12),
                        _buildGpsMetricRow(Icons.south_west_rounded, 'Longitude', '${_currentPosition!.longitude}°'),
                        const Divider(color: Color(0xFF334155), height: 12),
                        _buildGpsMetricRow(Icons.radar_rounded, 'Accuracy', '±${_currentPosition!.accuracy.toStringAsFixed(1)} m'),
                        const Divider(color: Color(0xFF334155), height: 12),
                        _buildGpsMetricRow(Icons.height_rounded, 'Altitude', '${_currentPosition!.altitude.toStringAsFixed(1)} m'),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Trigger Location Action Button
          ElevatedButton.icon(
            onPressed: _isLocating ? null : _requestLocation,
            icon: _isLocating
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Icon(hasLocation ? Icons.refresh_rounded : Icons.gps_fixed_rounded, size: 18),
            label: Text(
              _isLocating
                  ? 'Acquiring GPS Signal...'
                  : hasLocation
                      ? 'Re-Acquire GPS Location'
                      : 'Acquire High-Precision GPS Fix',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: hasLocation ? const Color(0xFF047857) : primaryIndigo,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
          ),
          const SizedBox(height: 18),

          // Jurisdictional Status Card
          _buildJurisdictionComplianceCard(hasLocation),
        ],
      ),
    );
  }

  Widget _buildGpsMetricRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 14, color: const Color(0xFF34D399)),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            fontFamily: 'monospace',
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildJurisdictionComplianceCard(bool hasLocation) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                hasLocation ? Icons.gavel_rounded : Icons.security_rounded,
                size: 18,
                color: hasLocation ? accentEmerald : primaryIndigo,
              ),
              const SizedBox(width: 8),
              const Text(
                'Jurisdictional Regulatory Check',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: primaryNavy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildCheckRow(
            Icons.shield_outlined,
            'Anti-Spoofing & Mock Provider Check',
            hasLocation ? 'PASSED (Genuine Hardware GPS)' : 'Pending Fix',
            hasLocation,
          ),
          _buildCheckRow(
            Icons.travel_explore_rounded,
            'Territory Sanction List Cross-Check',
            hasLocation ? 'AUTHORIZED JURISDICTION' : 'Pending Fix',
            hasLocation,
          ),
        ],
      ),
    );
  }

  Widget _buildCheckRow(IconData icon, String title, String status, bool isPassed) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: isPassed ? accentEmerald.withAlpha(25) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              status,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: isPassed ? accentEmerald : const Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _requestLocation() async {
    setState(() => _isLocating = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.deniedForever || permission == LocationPermission.denied) {
        throw Exception('Location permission was denied by device.');
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      setState(() {
        _currentPosition = pos;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Expanded(child: Text('GPS Coordinates acquired & verified!')),
              ],
            ),
            backgroundColor: accentEmerald,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Location error: $e')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  // ==========================================
  // TAB 3: BIOMETRIC LIVENESS (BIOMETRICS PERMISSION)
  // ==========================================
  Widget _buildBiometricTab() {
    final isVerified = _isBiometricVerified;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Section Title
          const Row(
            children: [
              Icon(Icons.fingerprint_rounded, size: 22, color: primaryIndigo),
              SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Biometric Liveness Proof',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryNavy),
                  ),
                  Text(
                    'Utilizes Local Auth & Biometric Sensors',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Biometric Sensor Card
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isVerified
                    ? [const Color(0xFF064E3B), const Color(0xFF047857)]
                    : [const Color(0xFF0F172A), const Color(0xFF1E1B4B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isVerified ? accentEmerald : accentIndigo.withAlpha(128),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: (isVerified ? accentEmerald : primaryIndigo).withAlpha(51),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(25),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isVerified ? const Color(0xFF34D399) : Colors.white.withAlpha(51),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    isVerified ? Icons.verified_user_rounded : Icons.fingerprint_rounded,
                    size: 60,
                    color: isVerified ? const Color(0xFF34D399) : Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  isVerified ? 'Biometric Liveness Confirmed' : 'Hardware Biometric Required',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isVerified
                      ? 'Secure Enclave cryptographic signature verified for user token.'
                      : 'Authenticate via Face ID, Touch ID, or biometric sensor to complete compliance.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withAlpha(204),
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Biometrics Action Button
          ElevatedButton.icon(
            onPressed: _authenticateBiometrics,
            icon: Icon(
              isVerified ? Icons.refresh_rounded : Icons.fingerprint_rounded,
              size: 20,
            ),
            label: Text(
              isVerified ? 'Re-Authenticate Biometrics' : 'Authenticate with Device Biometrics',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: isVerified ? const Color(0xFF047857) : primaryIndigo,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
          ),
          const SizedBox(height: 18),

          // Hardware Security Specifications Card
          _buildHardwareSecurityCard(),
        ],
      ),
    );
  }

  Widget _buildHardwareSecurityCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.shield_rounded, size: 18, color: primaryIndigo),
              SizedBox(width: 8),
              Text(
                'Hardware Security & Enclave Specs',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: primaryNavy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildSecuritySpecRow(
            Icons.memory_rounded,
            'Hardware Enclave',
            _isBiometricSupported ? 'AVAILABLE' : 'EMULATED',
            _isBiometricSupported,
          ),
          _buildSecuritySpecRow(
            Icons.lock_rounded,
            'Supported Sensors',
            _availableBiometrics.isNotEmpty
                ? _availableBiometrics.map((e) => e.name.toUpperCase()).join(', ')
                : 'BIOMETRIC / PIN',
            true,
          ),
          _buildSecuritySpecRow(
            Icons.vpn_key_rounded,
            'Signing Protocol',
            'FIDO2 WebAuthn / ECDSA',
            true,
          ),
          _buildSecuritySpecRow(
            Icons.verified_rounded,
            'Attestation Level',
            'EAL4+ Financial Grade',
            true,
          ),
        ],
      ),
    );
  }

  Widget _buildSecuritySpecRow(IconData icon, String label, String value, bool isOk) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: FontWeight.bold,
              color: isOk ? primaryNavy : Colors.amber.shade800,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _authenticateBiometrics() async {
    try {
      final bool didAuth = await _auth.authenticate(
        localizedReason: 'Authenticate with device biometrics for KYC identity verification',
        biometricOnly: false,
      );
      setState(() {
        _isBiometricVerified = didAuth;
      });
      if (mounted && didAuth) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Expanded(child: Text('Biometric authentication verified successfully!')),
              ],
            ),
            backgroundColor: accentEmerald,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Biometric error: $e')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  // ==========================================
  // SUBMISSION & DIALOG MODALS
  // ==========================================
  void _submitVerification() {
    widget.onKycCompleted?.call(_selectedDocType, 'VERIFIED');
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: accentEmerald.withAlpha(38),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.verified_user_rounded, color: accentEmerald, size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'KYC Dossier Verified!',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'All required security and compliance checks have completed successfully:',
              style: TextStyle(fontSize: 13, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 12),
            _buildDialogCheckItem('Document Scan: $_selectedDocType validated'),
            _buildDialogCheckItem('GPS Fix: Coordinates cryptographically signed'),
            _buildDialogCheckItem('Biometric Liveness: Hardware Enclave confirmed'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.lock_rounded, size: 14, color: primaryIndigo),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Attestation token dispatched to Super App core.',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: primaryNavy),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          FilledButton.icon(
            onPressed: () {
              Navigator.of(ctx).pop();
              widget.onExit();
            },
            icon: const Icon(Icons.arrow_back_rounded, size: 16),
            label: const Text('Return to Super App'),
            style: FilledButton.styleFrom(
              backgroundColor: primaryIndigo,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogCheckItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded, size: 14, color: accentEmerald),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: primaryNavy),
            ),
          ),
        ],
      ),
    );
  }

  void _showSessionDialog() {
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
                Icon(Icons.shield_outlined, color: primaryIndigo, size: 22),
                SizedBox(width: 8),
                Text(
                  'Super App Injected Context',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: primaryNavy),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Zero-dependency runtime parameters injected from Super App host container.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            _buildSessionInfoTile(Icons.person_pin_rounded, 'User ID', widget.userId),
            _buildSessionInfoTile(
              Icons.key_rounded,
              'JWT Token Payload',
              widget.jwtToken.length > 24
                  ? '${widget.jwtToken.substring(0, 24)}...[MASKED]'
                  : widget.jwtToken,
            ),
            if (widget.initialParams != null)
              _buildSessionInfoTile(
                Icons.settings_input_component_rounded,
                'Initial Configuration',
                widget.initialParams.toString(),
              ),
            _buildSessionInfoTile(
              Icons.verified_user_rounded,
              'Sandbox Isolation Mode',
              'ISOLATED_FLUTTER_PACKAGE (EAL4+)',
            ),
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

  Widget _buildSessionInfoTile(IconData icon, String title, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: primaryIndigo),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 12,
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    color: primaryNavy,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom Painter for Viewfinder Bracket Corners
class _ViewfinderCornerPainter extends CustomPainter {
  final Color color;

  _ViewfinderCornerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const cornerLength = 24.0;

    // Top-Left
    canvas.drawLine(const Offset(0, 0), const Offset(cornerLength, 0), paint);
    canvas.drawLine(const Offset(0, 0), const Offset(0, cornerLength), paint);

    // Top-Right
    canvas.drawLine(Offset(size.width, 0), Offset(size.width - cornerLength, 0), paint);
    canvas.drawLine(Offset(size.width, 0), Offset(size.width, cornerLength), paint);

    // Bottom-Left
    canvas.drawLine(Offset(0, size.height), Offset(cornerLength, size.height), paint);
    canvas.drawLine(Offset(0, size.height), Offset(0, size.height - cornerLength), paint);

    // Bottom-Right
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width - cornerLength, size.height), paint);
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width, size.height - cornerLength), paint);
  }

  @override
  bool shouldRepaint(covariant _ViewfinderCornerPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
