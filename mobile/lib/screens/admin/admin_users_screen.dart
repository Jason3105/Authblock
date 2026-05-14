import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final _api = ApiService();
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getAdminUsers();
      if (!mounted) return;
      setState(() {
        _users = data;
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
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppTheme.surface,
        appBar: AppBar(
          title: const Text('Manage Admins'),
        ),
        body: _loading
            ? const Center(
                child:
                    CircularProgressIndicator(color: AppTheme.adminAccent))
            : _error != null
                ? Center(
                    child: Text(_error!,
                        style: const TextStyle(color: AppTheme.error)))
                : RefreshIndicator(
                    onRefresh: _load,
                    color: AppTheme.adminAccent,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _users.length,
                      itemBuilder: (ctx, i) => _userTile(_users[i]),
                    ),
                  ),
      );

  Widget _userTile(Map<String, dynamic> u) {
    final isSuperAdmin = u['admin_type'] == 'superadmin';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: cardDecoration(radius: 16),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: isSuperAdmin
                  ? AppTheme.adminLight
                  : AppTheme.primaryLight,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isSuperAdmin
                  ? Icons.admin_panel_settings_rounded
                  : Icons.manage_accounts_rounded,
              color: isSuperAdmin ? AppTheme.adminAccent : AppTheme.primary,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        u['name']?.toString() ?? '—',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: isSuperAdmin
                            ? AppTheme.adminLight
                            : AppTheme.primaryLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isSuperAdmin ? 'SUPERADMIN' : 'ADMIN',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: isSuperAdmin
                              ? AppTheme.adminAccent
                              : AppTheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  u['email']?.toString() ?? '—',
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.muted),
                ),
                if (u['position'] != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    u['position'].toString(),
                    style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.muted,
                        fontStyle: FontStyle.italic),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
