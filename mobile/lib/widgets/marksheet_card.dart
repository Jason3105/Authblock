import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/marksheet_model.dart';
import '../theme/app_theme.dart';

class MarksheetCard extends StatefulWidget {
  final MarksheetModel marksheet;
  const MarksheetCard({super.key, required this.marksheet});

  @override
  State<MarksheetCard> createState() => _MarksheetCardState();
}

class _MarksheetCardState extends State<MarksheetCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final m = widget.marksheet;
    final isPass = m.isPassed;

    return Container(
      decoration: cardDecoration(radius: 20),
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(
        children: [
          // ── Header ──
          _buildHeader(m, isPass),
          // ── Score Row ──
          _buildScoreRow(m, isPass),
          // ── Actions ──
          _buildActions(m),
          // ── Expanded Blockchain Details ──
          if (_expanded) _buildBlockchainDetails(m),
        ],
      ),
    );
  }

  Widget _buildHeader(MarksheetModel m, bool isPass) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 0),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    m.branch.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.primary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    m.examination,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.onSurface,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppTheme.borderLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.border),
              ),
              child: Text(
                m.sessionName,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.slate700,
                ),
              ),
            ),
          ],
        ),
      );

  Widget _buildScoreRow(MarksheetModel m, bool isPass) => Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            _scoreChip('RESULT', m.remarks ?? '—',
                isPass ? AppTheme.success : AppTheme.error,
                isPass ? AppTheme.successLight : AppTheme.errorLight),
            const SizedBox(width: 12),
            _scoreChip('SGPI', m.sgpi ?? '—', AppTheme.onSurface, AppTheme.borderLight),
            const SizedBox(width: 12),
            _scoreChip('CGPI', m.cgpi ?? '—', AppTheme.onSurface, AppTheme.borderLight),
          ],
        ),
      );

  Widget _scoreChip(String label, String value, Color valueColor, Color bg) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: AppTheme.muted)),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: valueColor)),
          ],
        ),
      );

  Widget _buildActions(MarksheetModel m) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        child: Column(
          children: [
            Row(
              children: [
                if (m.supabasePdfUrl != null)
                  Expanded(
                    child: _actionBtn(
                      icon: Icons.description_outlined,
                      label: 'Marksheet',
                      color: AppTheme.primary,
                      bg: AppTheme.primaryLight,
                      onTap: () => _launch(m.supabasePdfUrl!),
                    ),
                  ),
                if (m.supabasePdfUrl != null && m.certificateUrl != null)
                  const SizedBox(width: 10),
                if (m.certificateUrl != null)
                  Expanded(
                    child: _actionBtn(
                      icon: Icons.verified_outlined,
                      label: 'Certificate',
                      color: const Color(0xFF7C3AED),
                      bg: AppTheme.adminLight,
                      onTap: () => _launch(m.certificateUrl!),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            _blockchainBtn(m),
          ],
        ),
      );

  Widget _actionBtn({
    required IconData icon,
    required String label,
    required Color color,
    required Color bg,
    required VoidCallback onTap,
  }) =>
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(label,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: color)),
            ],
          ),
        ),
      );

  Widget _blockchainBtn(MarksheetModel m) => InkWell(
        onTap: () => setState(() => _expanded = !_expanded),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: AppTheme.slate900,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.shield_outlined, size: 16, color: Color(0xFF34D399)),
              const SizedBox(width: 8),
              const Text(
                'View Blockchain Record',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                _expanded
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                size: 16,
                color: Colors.white54,
              ),
            ],
          ),
        ),
      );

  Widget _buildBlockchainDetails(MarksheetModel m) => Container(
        decoration: const BoxDecoration(
          color: AppTheme.slate900,
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Divider(color: Colors.white12, height: 1),
            const SizedBox(height: 14),
            if (m.dataHash != null)
              _hashRow('Data Hash', m.dataHash!),
            if (m.txHashData != null) ...[
              const SizedBox(height: 10),
              _txRow('TX (Data)', m.txHashData!),
            ],
            if (m.txHashPdf != null) ...[
              const SizedBox(height: 10),
              _txRow('TX (PDF)', m.txHashPdf!),
            ],
            const SizedBox(height: 12),
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
                  '✓ Permanently recorded on Ethereum Blockchain',
                  style: TextStyle(
                    fontSize: 11,
                    color: Color(0xFF34D399),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _hashRow(String label, String hash) => Column(
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
            hash.length > 40 ? '${hash.substring(0, 20)}...${hash.substring(hash.length - 10)}' : hash,
            style: const TextStyle(
                fontSize: 11,
                color: Colors.white70,
                fontFamily: 'monospace'),
          ),
        ],
      );

  Widget _txRow(String label, String tx) => Row(
        children: [
          Expanded(child: _hashRow(label, tx)),
          InkWell(
            onTap: () =>
                _launch('https://sepolia.etherscan.io/tx/$tx'),
            child: const Padding(
              padding: EdgeInsets.only(left: 8),
              child: Text('Etherscan →',
                  style: TextStyle(
                      fontSize: 11,
                      color: Color(0xFF60A5FA),
                      fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      );

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
