import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

import 'providers/auth_provider.dart';
import 'theme/app_theme.dart';

// Screens
import 'screens/splash_screen.dart';
import 'screens/role_select_screen.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/qr_display_screen.dart';
import 'screens/scanner_screen.dart';
import 'screens/scan_result_screen.dart';
import 'screens/verify_screen.dart';
import 'screens/admin/admin_login_screen.dart';
import 'screens/admin/admin_dashboard_screen.dart';
import 'screens/admin/admin_marksheets_screen.dart';
import 'screens/admin/admin_users_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Status bar styling
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  // Firebase init
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: const AuthblockApp(),
    ),
  );
}

class AuthblockApp extends StatelessWidget {
  const AuthblockApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Authblock',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        initialRoute: '/',
        onGenerateRoute: _onGenerateRoute,
      );

  Route<dynamic>? _onGenerateRoute(RouteSettings settings) {
    Widget page;

    switch (settings.name) {
      case '/':
        page = const SplashScreen();
        break;
      case '/role-select':
        page = const RoleSelectScreen();
        break;
      case '/login':
        page = const LoginScreen();
        break;
      case '/dashboard':
        page = const _StudentGuard(child: DashboardScreen());
        break;
      case '/qr':
        page = const QrDisplayScreen();
        break;
      case '/scan':
        page = const ScannerScreen();
        break;
      case '/scan/result':
        page = const ScanResultScreen();
        break;
      case '/verify':
        page = const VerifyScreen();
        break;
      case '/admin/login':
        page = const AdminLoginScreen();
        break;
      case '/admin/dashboard':
        page = const _AdminGuard(child: AdminDashboardScreen());
        break;
      case '/admin/marksheets':
        page = const _AdminGuard(child: AdminMarksheetsScreen());
        break;
      case '/admin/users':
        page = const _AdminGuard(child: AdminUsersScreen());
        break;
      default:
        page = const RoleSelectScreen();
    }

    return MaterialPageRoute(
      builder: (_) => page,
      settings: settings,
    );
  }
}

// ─── Route Guards ─────────────────────────────────────────────────────────────

class _StudentGuard extends StatelessWidget {
  final Widget child;
  const _StudentGuard({required this.child});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.status == AuthStatus.loading ||
        auth.status == AuthStatus.initial) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!auth.isStudent) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/role-select');
      });
      return const SizedBox.shrink();
    }
    return child;
  }
}

class _AdminGuard extends StatelessWidget {
  final Widget child;
  const _AdminGuard({required this.child});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.status == AuthStatus.loading ||
        auth.status == AuthStatus.initial) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!auth.isAdmin) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/admin/login');
      });
      return const SizedBox.shrink();
    }
    return child;
  }
}
