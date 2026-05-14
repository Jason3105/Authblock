import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/user_model.dart';
import '../../theme/app_theme.dart';

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final _api = ApiService();
  bool _loading = false;
  String? _error;
  String? _deniedEmail;

  Future<void> _signInWithGoogle() async {
    setState(() {
      _loading = true;
      _error = null;
      _deniedEmail = null;
    });

    String? signedInEmail;

    try {
      // 1. Google Sign-In
      final googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) {
        // User cancelled
        setState(() => _loading = false);
        return;
      }

      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential =
          await FirebaseAuth.instance.signInWithCredential(credential);
      signedInEmail = userCredential.user?.email ?? '';
      final uid = userCredential.user?.uid ?? '';
      final photoUrl = userCredential.user?.photoURL;

      // 2. Check whitelist
      final check = await _api.checkAdminEmail(signedInEmail);
      if (check['allowed'] != true) {
        // Delete firebase user + sign out
        try {
          await userCredential.user?.delete();
        } catch (_) {}
        await FirebaseAuth.instance.signOut();
        await GoogleSignIn().signOut();
        setState(() {
          _deniedEmail = signedInEmail;
          _loading = false;
        });
        return;
      }

      // 3. Link Firebase UID to DB
      await _api.linkFirebase(
          email: signedInEmail, firebaseUid: uid, photoUrl: photoUrl);

      // 4. Fetch admin profile
      final profileData = await _api.getAdminProfile(signedInEmail);
      final admin = AdminModel.fromJson(
          profileData['admin'] as Map<String, dynamic>);

      // 5. Save session
      if (!mounted) return;
      await context.read<AuthProvider>().loginAsAdmin(admin);
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/admin/dashboard');
      }
    } on FirebaseAuthException catch (e) {
      setState(() {
        _error = e.message ?? 'Firebase auth error';
        _loading = false;
      });
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('popup-closed') || msg.contains('cancelled')) {
        setState(() => _loading = false);
        return;
      }
      setState(() {
        _error = msg.replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppTheme.surface,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.arrow_back_ios_rounded,
                          size: 16, color: AppTheme.muted),
                      SizedBox(width: 4),
                      Text('Back',
                          style: TextStyle(
                              fontSize: 14,
                              color: AppTheme.muted,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const SizedBox(height: 40),
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppTheme.adminLight,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.admin_panel_settings_rounded,
                      color: AppTheme.adminAccent, size: 30),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Admin Portal',
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sign in with your authorized Google account to access the admin dashboard.',
                  style: TextStyle(
                      fontSize: 15, color: AppTheme.muted, height: 1.5),
                ),
                const SizedBox(height: 40),

                // ── Denied Banner ──
                if (_deniedEmail != null) ...[
                  _deniedBanner(_deniedEmail!),
                  const SizedBox(height: 16),
                ],

                // ── Error Banner ──
                if (_error != null) ...[
                  _errorBanner(_error!),
                  const SizedBox(height: 16),
                ],

                // ── Google Sign-In Button ──
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _signInWithGoogle,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppTheme.onSurface,
                      side: const BorderSide(color: AppTheme.border, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      elevation: 0,
                    ),
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                color: AppTheme.primary, strokeWidth: 2.5))
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _GoogleIcon(),
                              SizedBox(width: 12),
                              Text(
                                'Continue with Google',
                                style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                  ),
                ),

                const SizedBox(height: 20),
                const Center(
                  child: Text(
                    'Access restricted to authorized administrators only.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppTheme.muted),
                  ),
                ),

                if (_deniedEmail != null || _error != null) ...[
                  const SizedBox(height: 12),
                  Center(
                    child: TextButton(
                      onPressed: () => setState(() {
                        _deniedEmail = null;
                        _error = null;
                      }),
                      child: const Text('← Try a different account',
                          style: TextStyle(
                              color: AppTheme.muted, fontSize: 13)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );

  Widget _deniedBanner(String email) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.errorLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.error.withOpacity(0.25)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.block_rounded, color: AppTheme.error, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Access Denied',
                      style: TextStyle(
                          color: AppTheme.error,
                          fontSize: 13,
                          fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(
                    '$email is not registered as an admin. Contact your superadmin.',
                    style: const TextStyle(
                        color: AppTheme.error,
                        fontSize: 12,
                        fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _errorBanner(String msg) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.warningLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.warning.withOpacity(0.25)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: AppTheme.warning, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(msg,
                  style: const TextStyle(
                      color: AppTheme.warning,
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
}

class _GoogleIcon extends StatelessWidget {
  const _GoogleIcon();

  @override
  Widget build(BuildContext context) => const SizedBox(
        width: 20,
        height: 20,
        child: _GoogleIconPainter(),
      );
}

class _GoogleIconPainter extends StatelessWidget {
  const _GoogleIconPainter();

  @override
  Widget build(BuildContext context) => CustomPaint(painter: _GP());
}

class _GP extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.width / 2;

    // Simplified Google G
    final paints = [
      Paint()..color = const Color(0xFF4285F4),
      Paint()..color = const Color(0xFF34A853),
      Paint()..color = const Color(0xFFFBBC05),
      Paint()..color = const Color(0xFFEA4335),
    ];
    // Top-left quadrant
    canvas.drawArc(Rect.fromCircle(center: c, radius: r),
        -2.356, 1.571, true, paints[3]);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r),
        -0.785, 1.571, true, paints[0]);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r),
        0.785, 1.571, true, paints[1]);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r),
        2.356, 1.571, true, paints[2]);
    // White center
    canvas.drawCircle(c, r * 0.6, Paint()..color = Colors.white);
    // Right blue bar
    final rect = Rect.fromLTWH(c.dx, c.dy - r * 0.25, r, r * 0.5);
    canvas.drawRect(rect, paints[0]);
  }

  @override
  bool shouldRepaint(_) => false;
}
