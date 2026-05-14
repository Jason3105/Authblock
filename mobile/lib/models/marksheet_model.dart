class MarksheetModel {
  final int? id;
  final String? serialNo;
  final String studentName;
  final String prnNo;
  final String examination;
  final String branch;
  final String sessionName;
  final String? sgpi;
  final String? cgpi;
  final String? remarks;
  final String? supabasePdfUrl;
  final String? certificateUrl;
  final String? verificationUrl;
  final String? certificateId;
  final String? txHashData;
  final String? txHashPdf;
  final String? dataHash;
  final DateTime? issuedAt;

  const MarksheetModel({
    this.id,
    this.serialNo,
    required this.studentName,
    required this.prnNo,
    required this.examination,
    required this.branch,
    required this.sessionName,
    this.sgpi,
    this.cgpi,
    this.remarks,
    this.supabasePdfUrl,
    this.certificateUrl,
    this.verificationUrl,
    this.certificateId,
    this.txHashData,
    this.txHashPdf,
    this.dataHash,
    this.issuedAt,
  });

  factory MarksheetModel.fromJson(Map<String, dynamic> json) => MarksheetModel(
        id: json['id'] != null ? int.tryParse(json['id'].toString()) : null,
        serialNo: json['serial_no'],
        studentName: json['student_name'] ?? '',
        prnNo: json['prn_no'] ?? '',
        examination: json['examination'] ?? '',
        branch: json['branch'] ?? '',
        sessionName: json['session_name'] ?? '',
        sgpi: json['sgpi']?.toString(),
        cgpi: json['cgpi']?.toString(),
        remarks: json['remarks'],
        supabasePdfUrl: json['supabase_pdf_url'],
        certificateUrl: json['certificate_url'],
        verificationUrl: json['verification_url'],
        certificateId: json['certificate_id'],
        txHashData: json['tx_hash_data'],
        txHashPdf: json['tx_hash_pdf'],
        dataHash: json['data_hash'],
        issuedAt: json['issued_at'] != null
            ? DateTime.tryParse(json['issued_at'].toString())
            : null,
      );

  bool get isPassed =>
      (remarks?.toUpperCase().contains('PASS') ?? false) ||
      (remarks?.toUpperCase() == 'SUCCESSFUL');
}

class QrScanLog {
  final String? txHash;
  final String hash;
  final String timestamp;

  const QrScanLog({
    this.txHash,
    required this.hash,
    required this.timestamp,
  });

  factory QrScanLog.fromJson(Map<String, dynamic> json) => QrScanLog(
        txHash: json['tx_hash'],
        hash: json['hash'] ?? '',
        timestamp: json['timestamp'] ?? '',
      );
}
