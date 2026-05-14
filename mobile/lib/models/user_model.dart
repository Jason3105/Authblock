class UserModel {
  final String prnNo;
  final String fullName;

  const UserModel({required this.prnNo, required this.fullName});

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        prnNo: json['prn_no'] ?? '',
        fullName: json['full_name'] ?? '',
      );

  Map<String, dynamic> toJson() => {'prn_no': prnNo, 'full_name': fullName};
}

class AdminModel {
  final int id;
  final String name;
  final String email;
  final String adminType;
  final String? position;
  final String? firebaseUid;
  final String? firebasePhotoUrl;

  const AdminModel({
    required this.id,
    required this.name,
    required this.email,
    required this.adminType,
    this.position,
    this.firebaseUid,
    this.firebasePhotoUrl,
  });

  factory AdminModel.fromJson(Map<String, dynamic> json) => AdminModel(
        id: json['id'] != null ? int.tryParse(json['id'].toString()) ?? 0 : 0,
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        adminType: json['admin_type']?.toString() ?? 'admin',
        position: json['position']?.toString(),
        firebaseUid: json['firebase_uid']?.toString(),
        firebasePhotoUrl: json['firebase_photo_url']?.toString(),
      );

  bool get isSuperAdmin => adminType == 'superadmin';
}
