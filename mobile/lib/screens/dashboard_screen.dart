import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/marksheet_model.dart';
import '../widgets/marksheet_card.dart';
import '../theme/app_theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = ApiService();
  List<MarksheetModel> _marksheets = [];
  String? _qrToken;
  bool _loadingMarksheets = true;
  bool _generatingQr = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = context.read<AuthProvider>().student;
    if (user == null) return;
    setState(() => _loadingMarksheets = true);

    try {
      // Load QR token + marksheets in parallel
      final results = await Future.wait([
        _api.generateQrToken().catchError((_) => ''),
        _api.fetchMarksheets(user.prnNo),
      ]);
      if (!mounted) return;
      setState(() {
        _qrToken = results[0] as String?;
        _marksheets = results[1] as List<MarksheetModel>;
        _loadingMarksheets = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loadingMarksheets = false;
      });
    }
  }

  Future<void> _regenerateQr() async {
    setState(() => _generatingQr = true);
    try {
      final token = await _api.generateQrToken();
      if (!mounted) return;
      setState(() {
        _qrToken = token;
        _generatingQr = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _generatingQr = false);
    }
  }

  String get _qrData =>
      _qrToken != null ? 'AUTHBLOCK_SECURE_QR:$_qrToken' : '';

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().student;
    if (user == null) return const SizedBox.shrink();

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Credentials', style: TextStyle(fontSize: 17)),
            Text(
              user.prnNo,
              style: const TextStyle(
                  fontSize: 11, color: AppTheme.muted, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner_rounded),
            tooltip: 'Scan QR',
            onPressed: () => Navigator.pushNamed(context, '/scan'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Logout',
            onPressed: _confirmLogout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppTheme.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Greeting ──
              _buildGreeting(user.fullName),
              const SizedBox(height: 20),
              // ── QR Card ──
              _buildQrCard(),
              const SizedBox(height: 24),
              // ── Marksheets ──
              _buildMarksheetsSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreeting(String name) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hello, ${name.split(' ').first} 👋',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: AppTheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${_marksheets.length} blockchain-verified credential${_marksheets.length == 1 ? '' : 's'} issued to your PRN.',
            style: const TextStyle(fontSize: 14, color: AppTheme.muted),
          ),
        ],
      );

  Widget _buildQrCard() => Container(
        padding: const EdgeInsets.all(24),
        decoration: cardDecoration(radius: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Academic Passport QR',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Share this with institutions to verify your credentials.',
                        style: TextStyle(fontSize: 12, color: AppTheme.muted, height: 1.4),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          // Expand QR
                          OutlinedButton.icon(
                            onPressed: _qrToken != null
                                ? () => Navigator.pushNamed(context, '/qr',
                                    arguments: _qrData)
                                : null,
                            icon: const Icon(Icons.open_in_full_rounded, size: 15),
                            label: const Text('Show Full Screen'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Regenerate
                          GestureDetector(
                            onTap: _generatingQr ? null : _regenerateQr,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryLight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: _generatingQr
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: AppTheme.primary))
                                  : const Icon(Icons.refresh_rounded,
                                      size: 18, color: AppTheme.primary),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 20),
                // QR Preview
                _buildQrPreview(),
              ],
            ),
          ],
        ),
      );

  Widget _buildQrPreview() {
    if (_qrToken == null) {
      return Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          color: AppTheme.borderLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.muted),
          ),
        ),
      );
    }
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/qr', arguments: _qrData),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: QrImageView(
          data: _qrData,
          version: QrVersions.auto,
          size: 86,
          eyeStyle: const QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: AppTheme.onSurface,
          ),
          dataModuleStyle: const QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: AppTheme.onSurface,
          ),
        ),
      ),
    );
  }

  Widget _buildMarksheetsSection() {
    if (_loadingMarksheets) {
      return const Center(
          child: Padding(
        padding: EdgeInsets.all(40),
        child: CircularProgressIndicator(color: AppTheme.primary),
      ));
    }

    if (_error != null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.errorLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.error.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: AppTheme.error),
            const SizedBox(width: 12),
            Expanded(
              child: Text(_error!,
                  style: const TextStyle(
                      color: AppTheme.error,
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
    }

    if (_marksheets.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(36),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border, width: 1.5),
        ),
        child: const Column(
          children: [
            Icon(Icons.folder_open_rounded, size: 44, color: AppTheme.border),
            SizedBox(height: 12),
            Text(
              'No Credentials Yet',
              style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.onSurface),
            ),
            SizedBox(height: 6),
            Text(
              'Your university hasn\'t issued any blockchain-verified credentials yet.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.muted, height: 1.4),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Academic Records',
          style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppTheme.onSurface),
        ),
        const SizedBox(height: 14),
        ..._marksheets.map((m) => MarksheetCard(marksheet: m)),
      ],
    );
  }

  Future<void> _confirmLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Log Out',
            style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      await context.read<AuthProvider>().logout();
      if (mounted) Navigator.pushReplacementNamed(context, '/role-select');
    }
  }
}
