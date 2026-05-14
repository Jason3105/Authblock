import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../models/marksheet_model.dart';
import '../../theme/app_theme.dart';

class AdminMarksheetsScreen extends StatefulWidget {
  const AdminMarksheetsScreen({super.key});

  @override
  State<AdminMarksheetsScreen> createState() => _AdminMarksheetsScreenState();
}

class _AdminMarksheetsScreenState extends State<AdminMarksheetsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _api = ApiService();
  List<MarksheetModel> _history = [];
  bool _loadingHistory = false;
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _tabs.addListener(() {
      if (_tabs.index == 1) _loadHistory();
    });
    _loadHistory();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    if (_loadingHistory) return;
    setState(() => _loadingHistory = true);
    try {
      final data = await _api.getAllMarksheets();
      if (!mounted) return;
      setState(() {
        _history = data;
        _loadingHistory = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingHistory = false);
    }
  }

  List<MarksheetModel> get _filtered {
    if (_query.isEmpty) return _history;
    final q = _query.toLowerCase();
    return _history.where((m) {
      return m.studentName.toLowerCase().contains(q) ||
          m.prnNo.contains(q) ||
          (m.serialNo?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppTheme.surface,
        appBar: AppBar(
          title: const Text('Certificates'),
          bottom: TabBar(
            controller: _tabs,
            indicatorColor: AppTheme.adminAccent,
            labelColor: AppTheme.adminAccent,
            unselectedLabelColor: AppTheme.muted,
            labelStyle: const TextStyle(
                fontWeight: FontWeight.w700, fontSize: 13),
            tabs: const [
              Tab(text: 'Issue Certificate'),
              Tab(text: 'History'),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabs,
          children: [
            _buildIssuePage(),
            _buildHistoryPage(),
          ],
        ),
      );

  // ─── Issue Tab ───────────────────────────────────────────────────────────

  Widget _buildIssuePage() => const _IssueForm();

  // ─── History Tab ─────────────────────────────────────────────────────────

  Widget _buildHistoryPage() => Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'Search by name, PRN, or serial...',
                prefixIcon:
                    const Icon(Icons.search_rounded, color: AppTheme.muted),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
              ),
            ),
          ),
          Expanded(
            child: _loadingHistory
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppTheme.adminAccent))
                : _filtered.isEmpty
                    ? _emptyState()
                    : RefreshIndicator(
                        onRefresh: _loadHistory,
                        color: AppTheme.adminAccent,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 4),
                          itemCount: _filtered.length,
                          itemBuilder: (ctx, i) =>
                              _historyTile(_filtered[i]),
                        ),
                      ),
          ),
        ],
      );

  Widget _historyTile(MarksheetModel m) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: cardDecoration(radius: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        m.studentName,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.onSurface),
                      ),
                      Text(
                        m.prnNo,
                        style: const TextStyle(
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: AppTheme.muted),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: m.isPassed
                        ? AppTheme.successLight
                        : AppTheme.errorLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    m.remarks ?? '—',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: m.isPassed ? AppTheme.success : AppTheme.error),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _chip('SGPI: ${m.sgpi ?? "—"}'),
                const SizedBox(width: 6),
                _chip('CGPI: ${m.cgpi ?? "—"}'),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    m.sessionName,
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.muted),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                if (m.supabasePdfUrl != null)
                  _linkBtn('Marksheet', m.supabasePdfUrl!),
                if (m.supabasePdfUrl != null && m.certificateUrl != null)
                  const SizedBox(width: 8),
                if (m.certificateUrl != null)
                  _linkBtn('Certificate', m.certificateUrl!,
                      color: AppTheme.adminAccent),
                if (m.txHashData != null) ...[
                  const SizedBox(width: 8),
                  _linkBtn(
                    'Etherscan',
                    'https://sepolia.etherscan.io/tx/${m.txHashData}',
                    color: const Color(0xFF0EA5E9),
                    icon: Icons.open_in_new_rounded,
                  ),
                ],
              ],
            ),
          ],
        ),
      );

  Widget _chip(String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppTheme.borderLight,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(label,
            style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppTheme.slate700)),
      );

  Widget _linkBtn(String label, String url,
          {Color color = AppTheme.primary,
          IconData icon = Icons.link_rounded}) =>
      GestureDetector(
        onTap: () => _launch(url),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
              Text(label,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: color)),
            ],
          ),
        ),
      );

  Widget _emptyState() => const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.folder_open_rounded,
                size: 52, color: AppTheme.border),
            SizedBox(height: 14),
            Text('No certificates found',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.muted)),
          ],
        ),
      );

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

// ─── Issue Form ─────────────────────────────────────────────────────────────

class _IssueForm extends StatefulWidget {
  const _IssueForm();

  @override
  State<_IssueForm> createState() => _IssueFormState();
}

class _IssueFormState extends State<_IssueForm> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiService();

  final _serial = TextEditingController();
  final _prn = TextEditingController();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _examination = TextEditingController();
  final _branch = TextEditingController();
  final _session = TextEditingController();
  final _sgpi = TextEditingController();
  final _cgpi = TextEditingController();
  final _remarks = TextEditingController(text: 'SUCCESSFUL');
  final _date = TextEditingController();

  final List<_SubjectControllers> _subjects = [];

  bool _submitting = false;
  String? _error;
  String? _successMsg;
  String? _successUrl;

  @override
  void dispose() {
    for (final c in [
      _serial, _prn, _name, _email, _examination,
      _branch, _session, _sgpi, _cgpi, _remarks, _date
    ]) {
      c.dispose();
    }
    for (final s in _subjects) {
      s.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
      _successMsg = null;
      _successUrl = null;
    });

    try {
      final data = await _api.issueMarksheet({
        'serial_no': _serial.text.trim(),
        'prn_no': _prn.text.trim(),
        'student_name': _name.text.trim(),
        'student_email': _email.text.trim(),
        'examination': _examination.text.trim(),
        'branch': _branch.text.trim(),
        'session_name': _session.text.trim(),
        'sgpi': _sgpi.text.trim(),
        'cgpi': _cgpi.text.trim(),
        'remarks': _remarks.text.trim(),
        'date': _date.text.trim(),
        'subjects': _subjects.map((s) => s.toMap()).toList(),
      });

      if (!mounted) return;
      setState(() {
        _successMsg =
            'Certificate issued successfully! TX broadcast to blockchain.';
        _successUrl = data['marksheet']?['url']?.toString() ??
            data['certificate']?['url']?.toString();
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_error != null) ...[
                _msgTile(_error!, isError: true),
                const SizedBox(height: 14),
              ],
              if (_successMsg != null) ...[
                _msgTile(_successMsg!, isError: false),
                const SizedBox(height: 14),
              ],
              _section('Student Information'),
              _row([
                _field('Marksheet No.', _serial, required: true),
                _field('PRN No.', _prn, required: true),
              ]),
              const SizedBox(height: 12),
              _row([
                _field('Full Name', _name, required: true),
                _field('Email', _email, keyboard: TextInputType.emailAddress),
              ]),
              const SizedBox(height: 20),
              _section('Academic Details'),
              _field('Examination', _examination, required: true, full: true),
              const SizedBox(height: 12),
              _row([
                _field('Branch', _branch, required: true),
                _field('Session', _session, required: true),
              ]),
              const SizedBox(height: 12),
              _row([
                _field('SGPI', _sgpi, required: true),
                _field('CGPI', _cgpi, required: true),
              ]),
              const SizedBox(height: 12),
              _row([
                _field('Remarks', _remarks, required: true),
                _field('Date (DD-MM-YYYY)', _date, required: true),
              ]),
              const SizedBox(height: 20),
              
              _section('Individual Subject Details'),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _subjects.length,
                itemBuilder: (context, index) {
                  final s = _subjects[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Subject ${index + 1}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.slate700)),
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  s.dispose();
                                  _subjects.removeAt(index);
                                });
                              },
                              child: const Icon(Icons.close_rounded, size: 18, color: AppTheme.error),
                            )
                          ],
                        ),
                        const SizedBox(height: 12),
                        _row([
                          _field('Code', s.code, required: true),
                          _field('Title', s.title, required: true),
                        ]),
                        const SizedBox(height: 10),
                        _row([
                          _field('Credits', s.credits, required: true, keyboard: TextInputType.text),
                          _field('Grade', s.grade, required: true),
                        ]),
                        const SizedBox(height: 10),
                        _row([
                          _field('GP', s.gp, required: true, keyboard: TextInputType.text),
                          _field('CPGP', s.cpgp, required: true, keyboard: TextInputType.text),
                        ]),
                      ],
                    ),
                  );
                },
              ),
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _subjects.add(_SubjectControllers());
                  });
                },
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Add Subject'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.adminAccent,
                  side: const BorderSide(color: AppTheme.adminAccent),
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.adminAccent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2.5))
                      : const Text('Issue Certificate',
                          style: TextStyle(fontSize: 16)),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'For bulk issuance, use the web admin panel.',
                  style: TextStyle(fontSize: 12, color: AppTheme.muted),
                ),
              ),
            ],
          ),
        ),
      );

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(
          title,
          style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppTheme.slate700,
              letterSpacing: 0.4),
        ),
      );

  Widget _row(List<Widget> children) => Row(
        children: (children.map<Widget>((w) => Expanded(child: w)).toList())
          ..insertAll(1, [const SizedBox(width: 10)]),
      );

  Widget _field(
    String label,
    TextEditingController ctrl, {
    bool required = false,
    bool full = false,
    TextInputType? keyboard,
  }) {
    final field = TextFormField(
      controller: ctrl,
      keyboardType: keyboard,
      decoration: InputDecoration(
        labelText: label,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      validator: required
          ? (v) =>
              v == null || v.trim().isEmpty ? '$label is required' : null
          : null,
    );
    if (full) return field;
    return field;
  }

  Widget _msgTile(String msg, {required bool isError}) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isError ? AppTheme.errorLight : AppTheme.successLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: (isError ? AppTheme.error : AppTheme.success)
                  .withOpacity(0.25)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: isError ? AppTheme.error : AppTheme.success,
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                msg,
                style: TextStyle(
                    color: isError ? AppTheme.error : AppTheme.success,
                    fontSize: 13,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );
}

class _SubjectControllers {
  final code = TextEditingController();
  final title = TextEditingController();
  final credits = TextEditingController();
  final grade = TextEditingController();
  final gp = TextEditingController();
  final cpgp = TextEditingController();

  void dispose() {
    code.dispose();
    title.dispose();
    credits.dispose();
    grade.dispose();
    gp.dispose();
    cpgp.dispose();
  }

  Map<String, String> toMap() => {
        'code': code.text.trim(),
        'title': title.text.trim(),
        'credits': credits.text.trim(),
        'grade': grade.text.trim(),
        'gp': gp.text.trim(),
        'cpgp': cpgp.text.trim(),
      };
}

