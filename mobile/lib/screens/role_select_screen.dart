import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppTheme.surface,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),
                // ── Logo ──
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.verified_user_rounded,
                          color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'AUTHBLOCK',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                        color: AppTheme.onSurface,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 52),
                // ── Headline ──
                const Text(
                  'Welcome back.',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.onSurface,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'How are you accessing the platform today?',
                  style: TextStyle(
                    fontSize: 15,
                    color: AppTheme.muted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 48),
                // ── Student Card ──
                _roleCard(
                  context,
                  icon: Icons.school_rounded,
                  iconBg: AppTheme.primaryLight,
                  iconColor: AppTheme.primary,
                  title: 'Student Portal',
                  subtitle: 'View your academic credentials\nand QR identity code',
                  badge: 'STUDENT',
                  badgeColor: AppTheme.primary,
                  route: '/login',
                ),
                const SizedBox(height: 14),
                // ── Admin Card ──
                _roleCard(
                  context,
                  icon: Icons.admin_panel_settings_rounded,
                  iconBg: AppTheme.adminLight,
                  iconColor: AppTheme.adminAccent,
                  title: 'Admin Portal',
                  subtitle: 'Issue certificates & manage\nstudent records',
                  badge: 'ADMIN',
                  badgeColor: AppTheme.adminAccent,
                  route: '/admin/login',
                ),
                const Spacer(),
                // ── Scanner Quick Action ──
                Center(
                  child: TextButton.icon(
                    onPressed: () =>
                        Navigator.pushNamed(context, '/scan'),
                    icon: const Icon(Icons.qr_code_scanner_rounded,
                        size: 18, color: AppTheme.muted),
                    label: const Text(
                      'Scan a QR Code',
                      style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.muted,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );

  Widget _roleCard(
    BuildContext context, {
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String badge,
    required Color badgeColor,
    required String route,
  }) =>
      GestureDetector(
        onTap: () => Navigator.pushNamed(context, route),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: iconColor, size: 26),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.onSurface,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            badge,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: badgeColor,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.muted,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: AppTheme.muted),
            ],
          ),
        ),
      );
}
