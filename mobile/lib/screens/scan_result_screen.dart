import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/marksheet_model.dart';
import '../widgets/marksheet_card.dart';
import '../theme/app_theme.dart';

class ScanResultScreen extends StatelessWidget {
  const ScanResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (data == null) {
      return const Scaffold(body: Center(child: Text('No scan data')));
    }

    final user = data['user'] as Map<String, dynamic>? ?? {};
    final rawMarksheets = data['marksheets'] as List<dynamic>? ?? [];
    final logs = data['logs'] as Map<String, dynamic>? ?? {};
    final marksheets = rawMarksheets
        .map((m) => MarksheetModel.fromJson(m as Map<String, dynamic>))
        .toList();

    final txHash = logs['tx_hash'] as String?;
    final timestamp = logs['timestamp'] as String?;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Scan Result'),
        actions: [
          TextButton.icon(
            onPressed: () => Navigator.pushReplacementNamed(context, '/scan'),
            icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
            label: const Text('Scan Again'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Verified Badge ──
            _buildVerifiedBanner(user, timestamp),
            const SizedBox(height: 20),
            // ── Blockchain Log ──
            if (txHash != null) _buildBlockchainLog(txHash, timestamp),
            const SizedBox(height: 24),
            // ── Marksheets ──
            if (marksheets.isNotEmpty) ...[
              const Text(
                'Academic Records',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.onSurface),
              ),
              const SizedBox(height: 14),
              ...marksheets.map((m) => MarksheetCard(marksheet: m)),
            ] else
              _buildEmptyMarksheets(),
          ],
        ),
      ),
    );
  }

  Widget _buildVerifiedBanner(Map<String, dynamic> user, String? timestamp) =>
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.successLight,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.success.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.success,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded,
                      color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Verification Successful',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Identity verified against Blockchain',
                        style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.success,
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Divider(color: Color(0xFFBBF7D0), height: 1),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _infoTile('Student Name',
                      user['full_name']?.toString() ?? '—'),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _infoTile(
                      'PRN No.', user['prn_no']?.toString() ?? '—'),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _infoTile(String label, String value) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(),
              style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.muted,
                  letterSpacing: 0.6)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.onSurface)),
        ],
      );

  Widget _buildBlockchainLog(String txHash, String? timestamp) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.slate900,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF34D399),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Blockchain Log',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (timestamp != null) ...[
              _logRow('Timestamp',
                  DateTime.tryParse(timestamp)?.toLocal().toString() ?? timestamp,
                  Colors.white54),
              const SizedBox(height: 8),
            ],
            _logRow('Scan TX Hash', txHash, const Color(0xFF34D399)),
            const SizedBox(height: 14),
            GestureDetector(
              onTap: () => _launch(
                  'https://sepolia.etherscan.io/tx/$txHash'),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 9),
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.open_in_new_rounded,
                        size: 14, color: Color(0xFF60A5FA)),
                    SizedBox(width: 6),
                    Text(
                      'View on Etherscan',
                      style: TextStyle(
                        color: Color(0xFF60A5FA),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  Widget _logRow(String label, String value, Color valueColor) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  color: Colors.white38,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.6)),
          const SizedBox(height: 3),
          Text(
            value.length > 50
                ? '${value.substring(0, 22)}...${value.substring(value.length - 10)}'
                : value,
            style: TextStyle(
                fontSize: 11,
                color: valueColor,
                fontWeight: FontWeight.w600,
                fontFamily: 'monospace'),
          ),
        ],
      );

  Widget _buildEmptyMarksheets() => Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: const Center(
          child: Text(
            'No credentials found for this student.',
            style: TextStyle(color: AppTheme.muted, fontSize: 14),
          ),
        ),
      );

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
