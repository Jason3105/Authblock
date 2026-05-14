import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class AuthService {
  static const String _studentKey = 'student_session';
  static const String _adminKey = 'admin_session';
  static const String _roleKey = 'auth_role';

  // ─── Student ──────────────────────────────────────────────────────────────

  Future<void> saveStudentSession(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_studentKey, jsonEncode(user.toJson()));
    await prefs.setString(_roleKey, 'student');
  }

  Future<UserModel?> getStudentSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_studentKey);
    if (raw == null) return null;
    try {
      return UserModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  Future<void> saveAdminSession(AdminModel admin) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_adminKey, jsonEncode({
      'id': admin.id,
      'name': admin.name,
      'email': admin.email,
      'admin_type': admin.adminType,
      'position': admin.position,
      'firebase_uid': admin.firebaseUid,
      'firebase_photo_url': admin.firebasePhotoUrl,
    }));
    await prefs.setString(_roleKey, 'admin');
  }

  Future<AdminModel?> getAdminSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_adminKey);
    if (raw == null) return null;
    try {
      return AdminModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ─── Common ───────────────────────────────────────────────────────────────

  Future<String?> getRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_roleKey);
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_studentKey);
    await prefs.remove(_adminKey);
    await prefs.remove(_roleKey);
  }

  Future<bool> hasSession() async {
    final role = await getRole();
    return role != null;
  }
}
