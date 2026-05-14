import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _prnCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _prnCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final ok = await context
        .read<AuthProvider>()
        .loginAsStudent(_prnCtrl.text.trim(), _nameCtrl.text.trim());

    if (!mounted) return;
    if (ok) {
      Navigator.pushReplacementNamed(context, '/dashboard');
    } else {
      setState(() {
        _error = context.read<AuthProvider>().error ?? 'Login failed';
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
                // ── Back ──
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
                // ── Icon ──
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.school_rounded,
                      color: AppTheme.primary, size: 30),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Student Portal',
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Access your cryptographically secured academic credentials.',
                  style: TextStyle(fontSize: 15, color: AppTheme.muted, height: 1.5),
                ),
                const SizedBox(height: 36),
                // ── Form ──
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      // Error banner
                      if (_error != null) ...[
                        _errorBanner(_error!),
                        const SizedBox(height: 16),
                      ],
                      // PRN
                      TextFormField(
                        controller: _prnCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 15),
                        decoration: const InputDecoration(
                          labelText: 'PRN Number',
                          hintText: '2023015400000000',
                          prefixIcon: Icon(Icons.tag_rounded,
                              color: AppTheme.muted, size: 20),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'PRN is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      // Full Name
                      TextFormField(
                        controller: _nameCtrl,
                        textCapitalization: TextCapitalization.words,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 15),
                        decoration: const InputDecoration(
                          labelText: 'Full Name',
                          hintText: 'As per university records',
                          prefixIcon: Icon(Icons.person_outline_rounded,
                              color: AppTheme.muted, size: 20),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Full name is required';
                          }
                          final words = v.trim().split(RegExp(r'\s+'));
                          if (words.length < 2) {
                            return 'Enter at least 2 words (first and last name)';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 28),
                      // Submit
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          child: _loading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                      color: Colors.white, strokeWidth: 2.5))
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('View Credentials',
                                        style: TextStyle(fontSize: 16)),
                                    Icon(Icons.arrow_forward_rounded, size: 20),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: TextButton.icon(
                    onPressed: () =>
                        Navigator.pushNamed(context, '/verify'),
                    icon: const Icon(Icons.shield_outlined,
                        size: 16, color: AppTheme.muted),
                    label: const Text('Verify a Document Instead',
                        style: TextStyle(
                            color: AppTheme.muted,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );

  Widget _errorBanner(String message) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.errorLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.error.withOpacity(0.2)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline_rounded,
                color: AppTheme.error, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                    color: AppTheme.error,
                    fontSize: 13,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );
}
