import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

enum AuthStatus { initial, loading, student, admin, unauthenticated, error }

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final AuthService _authService = AuthService();

  AuthStatus _status = AuthStatus.initial;
  UserModel? _student;
  AdminModel? _admin;
  String? _error;

  AuthStatus get status => _status;
  UserModel? get student => _student;
  AdminModel? get admin => _admin;
  String? get error => _error;
  bool get isLoggedIn =>
      _status == AuthStatus.student || _status == AuthStatus.admin;
  bool get isStudent => _status == AuthStatus.student;
  bool get isAdmin => _status == AuthStatus.admin;

  // ─── App Start: Restore Session ────────────────────────────────────────────

  Future<void> checkSession() async {
    _status = AuthStatus.loading;
    notifyListeners();

    try {
      final role = await _authService.getRole();

      if (role == 'student') {
        final user = await _authService.getStudentSession();
        if (user != null) {
          _student = user;
          _status = AuthStatus.student;
          notifyListeners();
          return;
        }
      } else if (role == 'admin') {
        final adminData = await _authService.getAdminSession();
        if (adminData != null) {
          _admin = adminData;
          _status = AuthStatus.admin;
          notifyListeners();
          return;
        }
      }

      _status = AuthStatus.unauthenticated;
    } catch (_) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  // ─── Student Login ─────────────────────────────────────────────────────────

  Future<bool> loginAsStudent(String prnNo, String fullName) async {
    _status = AuthStatus.loading;
    _error = null;
    notifyListeners();

    try {
      final data = await _api.login(prnNo, fullName);
      if (data['success'] == true && data['user'] != null) {
        _student = UserModel.fromJson(data['user'] as Map<String, dynamic>);
        await _authService.saveStudentSession(_student!);
        _status = AuthStatus.student;
        notifyListeners();
        return true;
      }
      throw Exception(data['error'] ?? 'Login failed');
    } on DioException catch (e) {
      final message = (e.response?.data as Map?)?['error'] ?? e.message;
      _error = message?.toString();
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    }
  }

  // ─── Admin Login (Firebase Google Sign-In) ─────────────────────────────────

  Future<bool> loginAsAdmin(AdminModel adminData) async {
    _admin = adminData;
    await _authService.saveAdminSession(adminData);
    _status = AuthStatus.admin;
    notifyListeners();
    return true;
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  Future<void> logout() async {
    _status = AuthStatus.loading;
    notifyListeners();
    try {
      if (_status == AuthStatus.student) await _api.logout();
    } catch (_) {}
    await _authService.clearSession();
    _student = null;
    _admin = null;
    _error = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    if (_status == AuthStatus.error) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }
}
