import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getAdminDashboardStats();
      if (!mounted) return;
      setState(() {
        _stats = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AuthProvider>().admin;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.adminAccent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.admin_panel_settings_rounded,
                  color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            const Text('Admin Dashboard'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: _confirmLogout,
            tooltip: 'Log Out',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadStats,
        color: AppTheme.adminAccent,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Welcome ──
              _buildWelcome(admin?.name ?? 'Admin'),
              const SizedBox(height: 24),
              // ── Stats ──
              if (_loading)
                const Center(
                    child: CircularProgressIndicator(
                        color: AppTheme.adminAccent))
              else if (_error != null)
                _errorWidget(_error!)
              else if (_stats != null)
                _buildStats(_stats!),
              const SizedBox(height: 28),
              // ── Quick Actions ──
              _buildQuickActions(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcome(String name) => Column(
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
          const Text(
            'Here\'s your admin overview.',
            style: TextStyle(fontSize: 14, color: AppTheme.muted),
          ),
        ],
      );

  Widget _buildStats(Map<String, dynamic> stats) {
    final totalStudents = stats['totalStudents'] ?? 0;
    final totalMarksheets = stats['totalMarksheets'] ?? 0;
    final totalScans = stats['totalScans'] ?? 0;
    final totalAdmins = stats['totalAdmins'] ?? 0;

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.4,
      children: [
        _statCard('Total Students', totalStudents.toString(),
            Icons.people_rounded, AppTheme.primary, AppTheme.primaryLight),
        _statCard('Certificates', totalMarksheets.toString(),
            Icons.description_rounded, AppTheme.success, AppTheme.successLight),
        _statCard('QR Scans', totalScans.toString(),
            Icons.qr_code_scanner_rounded, AppTheme.warning, AppTheme.warningLight),
        _statCard('Admins', totalAdmins.toString(),
            Icons.manage_accounts_rounded, AppTheme.adminAccent, AppTheme.adminLight),
      ],
    );
  }

  Widget _statCard(
      String label, String value, IconData icon, Color color, Color bg) =>
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 16,
                offset: const Offset(0, 4))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration:
                  BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const Spacer(),
            Text(
              value,
              style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.onSurface),
            ),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 12, color: AppTheme.muted, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );

  Widget _buildQuickActions(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Quick Actions',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppTheme.onSurface),
          ),
          const SizedBox(height: 14),
          _actionTile(
            icon: Icons.add_circle_outline_rounded,
            iconColor: AppTheme.primary,
            iconBg: AppTheme.primaryLight,
            title: 'Issue Certificates',
            subtitle: 'Manually or via CSV bulk upload',
            onTap: () => Navigator.pushNamed(context, '/admin/marksheets'),
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.qr_code_scanner_rounded,
            iconColor: AppTheme.success,
            iconBg: AppTheme.successLight,
            title: 'Scan QR Code',
            subtitle: 'Verify a student\'s identity',
            onTap: () => Navigator.pushNamed(context, '/scan'),
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.people_outline_rounded,
            iconColor: AppTheme.adminAccent,
            iconBg: AppTheme.adminLight,
            title: 'Manage Admins',
            subtitle: 'Add or remove admin accounts',
            onTap: () => Navigator.pushNamed(context, '/admin/users'),
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.shield_outlined,
            iconColor: AppTheme.warning,
            iconBg: AppTheme.warningLight,
            title: 'Verify Certificate',
            subtitle: 'Check blockchain record',
            onTap: () => Navigator.pushNamed(context, '/verify'),
          ),
        ],
      );

  Widget _actionTile({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                    color: iconBg, borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.onSurface)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: AppTheme.muted)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: AppTheme.muted),
            ],
          ),
        ),
      );

  Widget _errorWidget(String msg) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.errorLight,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(msg,
            style: const TextStyle(
                color: AppTheme.error, fontWeight: FontWeight.w600)),
      );

  Future<void> _confirmLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Log Out',
            style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('Log out of the admin portal?'),
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
