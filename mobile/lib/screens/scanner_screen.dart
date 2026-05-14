import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController _scanner = MobileScannerController();
  final ApiService _api = ApiService();
  bool _processing = false;
  bool _torchOn = false;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final barcode = capture.barcodes.firstOrNull;
    final raw = barcode?.rawValue;
    if (raw == null) return;

    // Validate Authblock QR format
    if (!raw.startsWith('AUTHBLOCK_SECURE_QR:')) {
      _showError('Invalid QR code. Only Authblock issued QR codes are supported.');
      return;
    }

    setState(() => _processing = true);
    await _scanner.stop();

    final token = raw.split(':')[1];
    try {
      final result = await _api.scanQr(token);
      if (!mounted) return;
      Navigator.pushReplacementNamed(
        context,
        '/scan/result',
        arguments: result,
      );
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      _showError(msg);
      await _scanner.start();
      if (mounted) setState(() => _processing = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // ── Camera ──
            MobileScanner(
              controller: _scanner,
              onDetect: _onDetect,
            ),

            // ── Scanning Overlay ──
            _ScanOverlay(processing: _processing),

            // ── Top Controls ──
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    _iconBtn(
                      Icons.arrow_back_ios_rounded,
                      () => Navigator.pop(context),
                    ),
                    const Spacer(),
                    const Text(
                      'Scan QR Code',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Spacer(),
                    _iconBtn(
                      _torchOn ? Icons.flash_off_rounded : Icons.flash_on_rounded,
                      () {
                        _scanner.toggleTorch();
                        setState(() => _torchOn = !_torchOn);
                      },
                    ),
                  ],
                ),
              ),
            ),

            // ── Processing Overlay ──
            if (_processing)
              Container(
                color: Colors.black54,
                child: const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2.5),
                      SizedBox(height: 16),
                      Text(
                        'Verifying & logging to blockchain...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // ── Bottom Hint ──
            if (!_processing)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: const Text(
                            'Point camera at the student\'s Authblock QR code',
                            style:
                                TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      );

  Widget _iconBtn(IconData icon, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.black38,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      );
}

class _ScanOverlay extends StatelessWidget {
  final bool processing;
  const _ScanOverlay({required this.processing});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final scanArea = size.width * 0.65;

    return Stack(
      children: [
        // Dark surround
        ColorFiltered(
          colorFilter: const ColorFilter.mode(
              Colors.black54, BlendMode.srcOut),
          child: Stack(
            children: [
              Container(color: Colors.transparent),
              Center(
                child: Container(
                  width: scanArea,
                  height: scanArea,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ],
          ),
        ),
        // Corner brackets
        Center(
          child: SizedBox(
            width: scanArea,
            height: scanArea,
            child: CustomPaint(
              painter: _CornerPainter(
                  color: processing ? AppTheme.success : Colors.white),
            ),
          ),
        ),
      ],
    );
  }
}

class _CornerPainter extends CustomPainter {
  final Color color;
  _CornerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    const len = 28.0;
    const r = 12.0;

    // TL
    canvas.drawLine(const Offset(r, 0), const Offset(len, 0), paint);
    canvas.drawLine(const Offset(0, r), const Offset(0, len), paint);
    canvas.drawArc(const Rect.fromLTWH(0, 0, r * 2, r * 2),
        -3.14, 1.57, false, paint);
    // TR
    canvas.drawLine(Offset(size.width - len, 0), Offset(size.width - r, 0), paint);
    canvas.drawLine(Offset(size.width, r), Offset(size.width, len), paint);
    canvas.drawArc(Rect.fromLTWH(size.width - r * 2, 0, r * 2, r * 2),
        -1.57, 1.57, false, paint);
    // BL
    canvas.drawLine(Offset(0, size.height - len), Offset(0, size.height - r), paint);
    canvas.drawLine(Offset(r, size.height), Offset(len, size.height), paint);
    canvas.drawArc(Rect.fromLTWH(0, size.height - r * 2, r * 2, r * 2),
        1.57, 1.57, false, paint);
    // BR
    canvas.drawLine(Offset(size.width, size.height - len),
        Offset(size.width, size.height - r), paint);
    canvas.drawLine(Offset(size.width - len, size.height),
        Offset(size.width - r, size.height), paint);
    canvas.drawArc(
        Rect.fromLTWH(size.width - r * 2, size.height - r * 2, r * 2, r * 2),
        0, 1.57, false, paint);
  }

  @override
  bool shouldRepaint(_CornerPainter old) => old.color != color;
}
