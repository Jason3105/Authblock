import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import '../config/api_config.dart';
import '../models/user_model.dart';
import '../models/marksheet_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  late final CookieJar _cookieJar;

  ApiService._internal() {
    _cookieJar = CookieJar();
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Content-Type': 'application/json'},
      ),
    );
    _dio.interceptors.add(CookieManager(_cookieJar));
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> login(String prnNo, String fullName) async {
    final response = await _dio.post(
      ApiConfig.login,
      data: {'prn_no': prnNo.trim(), 'full_name': fullName.trim()},
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getSession() async {
    final response = await _dio.get(ApiConfig.session);
    return response.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try {
      await _dio.get(ApiConfig.logout, options: Options(followRedirects: false));
    } catch (_) {}
    await _cookieJar.deleteAll();
  }

  // ─── Dashboard / Marksheets ───────────────────────────────────────────────

  Future<List<MarksheetModel>> fetchMarksheets(String prnNo) async {
    // Use the dedicated student endpoint (reads session cookie automatically)
    // Pass prn_no as a fallback query param for mobile cookie jar edge cases
    final response = await _dio.get(
      ApiConfig.studentMarksheets,
      queryParameters: {'prn_no': prnNo},
    );
    final data = response.data as Map<String, dynamic>;
    return (data['marksheets'] as List<dynamic>? ?? [])
        .map((m) => MarksheetModel.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  // ─── QR ──────────────────────────────────────────────────────────────────

  Future<String> generateQrToken() async {
    final response = await _dio.post(ApiConfig.qrGenerate);
    final data = response.data as Map<String, dynamic>;
    return data['qr_token'] as String;
  }

  Future<Map<String, dynamic>> scanQr(String qrToken) async {
    final response = await _dio.post(
      ApiConfig.qrScan,
      data: {'qr_token': qrToken},
    );
    return response.data as Map<String, dynamic>;
  }

  // ─── Verify ──────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> verifyCertificate({
    String? certId,
    String? hash,
    String? tx,
  }) async {
    final params = <String, String>{};
    if (certId != null) params['cert'] = certId;
    if (hash != null) params['hash'] = hash;
    if (tx != null) params['tx'] = tx;

    final response = await _dio.get(
      ApiConfig.verifyCertificate,
      queryParameters: params,
    );
    return response.data as Map<String, dynamic>;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> checkAdminEmail(String email) async {
    final response = await _dio.post(
      ApiConfig.adminCheckEmail,
      data: {'email': email.toLowerCase()},
    );
    return response.data as Map<String, dynamic>;
  }

  Future<void> linkFirebase({
    required String email,
    required String firebaseUid,
    String? photoUrl,
  }) async {
    await _dio.post(
      ApiConfig.adminLinkFirebase,
      data: {
        'email': email.toLowerCase(),
        'firebase_uid': firebaseUid,
        'firebase_email': email,
        'firebase_photo_url': photoUrl,
      },
    );
  }

  Future<Map<String, dynamic>> getAdminProfile(String email) async {
    final response = await _dio.get(
      ApiConfig.adminMe,
      queryParameters: {'email': email.toLowerCase()},
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getAdminDashboardStats() async {
    final response = await _dio.get(ApiConfig.adminDashboardStats);
    final data = response.data as Map<String, dynamic>;
    // API returns { stats: { certificatesIssued, verifiedOnChain, adminUsers } }
    final stats = data['stats'] as Map<String, dynamic>? ?? {};
    return {
      'totalMarksheets': stats['certificatesIssued'] ?? 0,
      'totalAdmins': stats['adminUsers'] ?? 0,
      'totalVerified': stats['verifiedOnChain'] ?? 0,
      'totalStudents': 0, // not tracked by backend stats endpoint
      'totalScans': 0,
    };
  }

  Future<List<MarksheetModel>> getAllMarksheets() async {
    final response = await _dio.get(ApiConfig.adminMarksheets);
    final data = response.data as Map<String, dynamic>;
    return (data['marksheets'] as List<dynamic>? ?? [])
        .map((m) => MarksheetModel.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> issueMarksheet(Map<String, dynamic> payload) async {
    final response = await _dio.post(
      ApiConfig.adminIssueMarksheet,
      data: payload,
      options: Options(
        receiveTimeout: const Duration(seconds: 30),
      ),
    );
    return response.data as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getAdminUsers() async {
    final response = await _dio.get(ApiConfig.adminUsers);
    final data = response.data as Map<String, dynamic>;
    return (data['admins'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
  }
}
