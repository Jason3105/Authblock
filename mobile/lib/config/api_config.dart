class ApiConfig {
  static const String baseUrl = 'https://authblock.onrender.com';

  // Auth
  static const String login = '/api/auth/login';
  static const String session = '/api/auth/session';
  static const String logout = '/api/auth/logout';

  // QR
  static const String qrGenerate = '/api/qr/generate';
  static const String qrScan = '/api/qr/scan';

  // Verify
  static const String verifyCertificate = '/api/verify/certificate';

  // Student
  static const String studentMarksheets = '/api/student/marksheets';

  // Admin
  static const String adminCheckEmail = '/api/admin/check-email';
  static const String adminLinkFirebase = '/api/admin/link-firebase';
  static const String adminMe = '/api/admin/me';
  static const String adminMarksheets = '/api/admin/marksheets';
  static const String adminIssueMarksheet = '/api/admin/marksheets/issue';
  static const String adminUsers = '/api/admin/users';
  static const String adminDashboardStats = '/api/admin/dashboard-stats';
}
