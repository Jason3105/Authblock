import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class VerifyScreen extends StatefulWidget {
  const VerifyScreen({super.key});

  @override
  State<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends State<VerifyScreen> {
  final _ctrl = TextEditingController();
  final _api = ApiService();
  bool _loading = false;
  Map<String, dynamic>? _result;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final input = _ctrl.text.trim();
    if (input.isEmpty) return;
    setState(() {
      _loading = true;
      _result = null;
      _error = null;
    });

    try {
      final isHash = input.startsWith('0x');
      final data = await _api.verifyCertificate(
        certId: isHash ? null : input,
        hash: isHash ? input : null,
      );
      if (!mounted) return;
      setState(() {
        _result = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppTheme.surface,
        appBar: AppBar(
          title: const Text('Verify Certificate'),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Hero ──
              _buildHero(),
              const SizedBox(height: 28),
              // ── Search ──
              _buildSearchBox(),
              const SizedBox(height: 20),
              // ── Result ──
              if (_loading)
                const Center(
                    child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: AppTheme.primary),
                )),
              if (_error != null) _buildError(_error!),
              if (_result != null) _buildResult(_result!),
            ],
          ),
        ),
      );

  Widget _buildHero() => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppTheme.primary, Color(0xFF1D4ED8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Blockchain\nVerification',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      height: 1.2,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Enter a Certificate ID or hash to verify authenticity on the Ethereum blockchain.',
                    style: TextStyle(
                        color: Colors.white70, fontSize: 13, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            const Icon(Icons.verified_rounded,
                color: Colors.white24, size: 64),
          ],
        ),
      );

  Widget _buildSearchBox() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Certificate ID or Hash',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.onSurface),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _ctrl,
                  style: const TextStyle(
                      fontSize: 13,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600),
                  decoration: const InputDecoration(
                    hintText: 'ABC-2024-0001-XXXX or 0x...',
                    prefixIcon:
                        Icon(Icons.search_rounded, color: AppTheme.muted),
                  ),
                  onFieldSubmitted: (_) => _verify(),
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: _loading ? null : _verify,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('Verify'),
              ),
            ],
          ),
        ],
      );

  Widget _buildError(String msg) => Container(
        margin: const EdgeInsets.only(top: 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.errorLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.error.withOpacity(0.2)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline_rounded,
                color: AppTheme.error, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(msg,
                  style: const TextStyle(
                      color: AppTheme.error,
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );

  Widget _buildResult(Map<String, dynamic> data) {
    final verified = data['verified'] as bool? ?? false;
    final cert = data['certificate'] as Map<String, dynamic>? ?? {};
    final verification = data['verification'] as Map<String, dynamic>? ?? {};
    final blockchain = data['blockchain'] as Map<String, dynamic>? ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Status ──
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: verified ? AppTheme.successLight : AppTheme.errorLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: (verified ? AppTheme.success : AppTheme.error)
                    .withOpacity(0.25)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: verified ? AppTheme.success : AppTheme.error,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  verified ? Icons.verified_rounded : Icons.cancel_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      verified ? 'Certificate Verified ✓' : 'Verification Failed',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: verified ? AppTheme.success : AppTheme.error,
                      ),
                    ),
                    if (verified)
                      const Text(
                        'Recorded on Ethereum Blockchain',
                        style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.muted,
                            fontWeight: FontWeight.w500),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // ── Student Details ──
        if (cert.isNotEmpty) ...[
          _sectionCard('Student Details', [
            _detailRow('Name', cert['student_name']),
            _detailRow('PRN', cert['prn_no']),
            _detailRow('Examination', cert['examination']),
            _detailRow('Branch', cert['branch']),
            _detailRow('Session', cert['session']),
            _detailRow('SGPI', cert['sgpi']),
            _detailRow('CGPI', cert['cgpi']),
            _detailRow('Result', cert['remarks']),
          ]),
          const SizedBox(height: 12),
        ],
        // ── Verification Checks ──
        _sectionCard('Verification Checks', [
          _checkRow('Hash Valid', verification['hash_valid'] as bool? ?? false),
          _checkRow('Transaction Valid',
              verification['transaction_valid'] as bool? ?? false),
          _checkRow(
              'On Blockchain', verification['on_blockchain'] as bool? ?? false),
          if (verification['blockchain_timestamp'] != null)
            _detailRow('Anchored On',
                _formatTs(verification['blockchain_timestamp'] as String)),
        ]),
        const SizedBox(height: 12),
        // ── Blockchain Links ──
        if (blockchain['etherscan_data_url'] != null) ...[
          _sectionCard('Blockchain Links', [
            _linkRow('Data TX on Etherscan',
                blockchain['etherscan_data_url'] as String),
            if (blockchain['etherscan_pdf_url'] != null)
              _linkRow('PDF TX on Etherscan',
                  blockchain['etherscan_pdf_url'] as String),
          ]),
        ],
        // ── PDF Links ──
        if (cert['marksheet_url'] != null || cert['certificate_url'] != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              if (cert['marksheet_url'] != null)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _launch(cert['marksheet_url']!.toString()),
                    icon: const Icon(Icons.description_outlined, size: 16),
                    label: const Text('Marksheet PDF'),
                  ),
                ),
              if (cert['marksheet_url'] != null &&
                  cert['certificate_url'] != null)
                const SizedBox(width: 10),
              if (cert['certificate_url'] != null)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () =>
                        _launch(cert['certificate_url']!.toString()),
                    icon: const Icon(Icons.verified_outlined, size: 16),
                    label: const Text('Certificate'),
                  ),
                ),
            ],
          ),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _sectionCard(String title, List<Widget> children) => Container(
        padding: const EdgeInsets.all(18),
        decoration: cardDecoration(radius: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title.toUpperCase(),
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: AppTheme.muted)),
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      );

  Widget _detailRow(String label, dynamic value) {
    if (value == null || value.toString().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.muted,
                    fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: Text(value.toString(),
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.onSurface)),
          ),
        ],
      ),
    );
  }

  Widget _checkRow(String label, bool ok) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Icon(
              ok ? Icons.check_circle_rounded : Icons.cancel_rounded,
              size: 18,
              color: ok ? AppTheme.success : AppTheme.error,
            ),
            const SizedBox(width: 10),
            Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurface)),
          ],
        ),
      );

  Widget _linkRow(String label, String url) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: GestureDetector(
          onTap: () => _launch(url),
          child: Row(
            children: [
              const Icon(Icons.open_in_new_rounded,
                  size: 15, color: AppTheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primary,
                        decoration: TextDecoration.underline)),
              ),
            ],
          ),
        ),
      );

  String _formatTs(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
