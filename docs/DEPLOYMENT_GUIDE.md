# Authblock Certificate System - Deployment Guide

## 🎯 Overview

The Authblock certificate system issues **blockchain-verified digital certificates** with a dual-hash verification architecture. Both the original marksheet AND a blockchain verification certificate are issued.

---

## 📋 Pre-Deployment Checklist

### 1. **Database Migration**
Run the SQL script to create the `certificates` table:

```bash
# Copy content from: scripts/create_certificates_table.sql
# Paste into NeonDB SQL Editor and execute
```

**What it creates:**
- `certificates` table with dual-hash columns
- Indexes for fast lookups
- Auto-update triggers

### 2. **Supabase Storage**
Bucket `Auth_Certificates` should already exist with:
- ✅ Public access enabled
- ✅ INSERT permissions allowed
- ✅ File uploads enabled

### 3. **Environment Variables**
Verify in `.env.local`:
```env
# Blockchain
PRIVATE_KEY=your_wallet_private_key
NEXT_PUBLIC_CONTRACT_ADDRESS=0x078988AbE64835A3445e5Be7fea65a0056aaF228
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...

# Database
DATABASE_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Base URL (for QR codes)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Change for production
```

---

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
npm install
```

**Key packages:**
- `pdf-lib` - PDF generation
- `qrcode` - QR code generation
- `react-qr-code` - QR display component
- `html2canvas`, `jspdf` - Certificate export

### Step 2: Run Database Migration
```sql
-- Execute in NeonDB SQL Editor
-- File: scripts/create_certificates_table.sql
```

### Step 3: Test Certificate Issuance

#### Manual Entry:
1. Navigate to `/admin/marksheets`
2. Use "Manual Entry" tab
3. Fill in student details
4. Click "Issue Certificate"

#### Bulk Upload:
1. Download template from "Bulk CSV Upload" tab
2. Fill in student data (supports up to 20 subjects)
3. Upload CSV/XLSX file
4. Watch terminal logs for progress

### Step 4: Verify Certificate Flow

After issuing a certificate, verify:
1. ✅ PDF generated in Supabase `Auth_Certificates` bucket
2. ✅ Two blockchain transactions (data hash + PDF hash)
3. ✅ Database entry in `certificates` table
4. ✅ Certificate appears in "History" tab
5. ✅ QR code scans to verification URL

---

## 🔄 Certificate Issuance Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Generate Certificate Data (JSON)                     │
│    - Name, PRN, SGPI, CGPI, Branch, Session, etc.      │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Hash Essential Data (Data Hash)                      │
│    - SHA-256 of student academic JSON                   │
│    - Result: 0x7a3d2e4f...                             │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Store Data Hash on Blockchain                        │
│    - Transaction: 0x8b4c3f...                           │
│    - Ethereum Sepolia Testnet                           │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Generate QR Code                                      │
│    - URL: /verify?cert=ABC-123&hash=0x...&tx=0x...    │
│    - Embeds data hash + transaction hash               │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Generate PDF Certificate                             │
│    - Authblock branding                                 │
│    - Student info, SGPI/CGPI                           │
│    - QR code embedded                                   │
│    - Blockchain verification section                    │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Upload PDF to Supabase                               │
│    - Bucket: Auth_Certificates                         │
│    - Filename: ABC-2024-1234-5678.pdf                  │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Hash the PDF File (Certificate Hash)                 │
│    - SHA-256 of PDF bytes                              │
│    - Result: 0x9c5d4e...                               │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Store PDF Hash on Blockchain                         │
│    - Transaction: 0x1a2b3c...                          │
│    - Verifies certificate authenticity                  │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Save to Database                                      │
│    - certificate_id, data, hashes, TX hashes, PDF URL   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### `certificates` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `certificate_id` | TEXT | Unique certificate ID (e.g., ABC-2024-1234-5678) |
| `student_name` | TEXT | Student full name |
| `prn_no` | TEXT | PRN number |
| `serial_no` | TEXT | Serial number (optional) |
| `examination` | TEXT | Exam name |
| `branch` | TEXT | Branch/course |
| `session_name` | TEXT | Session (e.g., June-2025) |
| `sgpi` | TEXT | SGPI |
| `cgpi` | TEXT | CGPI |
| `remarks` | TEXT | Result (PASS/FAIL) |
| `subjects` | JSONB | Subject details array |
| `certificate_data` | JSONB | Full certificate JSON |
| `pdf_url` | TEXT | Supabase storage URL |
| **`data_hash`** | TEXT | Hash of essential JSON data |
| **`tx_hash_data`** | TEXT | Blockchain TX for data hash |
| **`certificate_hash`** | TEXT | Hash of PDF file |
| **`tx_hash_certificate`** | TEXT | Blockchain TX for PDF hash |
| `issued_by` | TEXT | Admin ID who issued |
| `issue_date` | TIMESTAMP | Issuance timestamp |
| `created_at` | TIMESTAMP | Record creation |
| `updated_at` | TIMESTAMP | Last update |

---

## 📡 API Endpoints

### Issue Certificate
```http
POST /api/admin/certificates/issue
Content-Type: application/json

{
  "student_name": "John Doe",
  "prn_no": "20230164000000",
  "serial_no": "SN-1234",
  "examination": "BE Sem-IV",
  "branch": "Computer Engineering",
  "session_name": "June-2025",
  "sgpi": "9.5",
  "cgpi": "9.3",
  "remarks": "SUCCESSFUL",
  "date": "30-06-2025",
  "subjects": [
    {
      "code": "CSC401",
      "title": "Data Structures",
      "credits": "4",
      "grade": "O",
      "gp": "10",
      "cpgp": "40"
    }
  ],
  "issued_by": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "certificate_id": "ABC-2024-1234-5678",
  "pdf_url": "https://...supabase.co/storage/.../ABC-2024-1234-5678.pdf",
  "verification_url": "http://localhost:3000/verify?cert=ABC-2024-1234-5678&hash=0x...&tx=0x...",
  "blockchain": {
    "data_hash": "0x7a3d2e...",
    "tx_data": "0x8b4c3f...",
    "pdf_hash": "0x9c5d4e...",
    "tx_certificate": "0x1a2b3c..."
  },
  "id": 42
}
```

### List Certificates
```http
GET /api/admin/certificates/list?search=John&limit=50&offset=0
```

### Get Certificate
```http
GET /api/admin/certificates/ABC-2024-1234-5678
```

### Verify Certificate
```http
GET /api/verify/certificate?cert=ABC-2024-1234-5678&hash=0x...
```

---

## 🎨 Certificate Design

The PDF certificate features:
- **Authblock branding** - Logo and color scheme
- **A4 Landscape** format (842 x 595 pts)
- **Dark theme** - Blue gradient header
- **Student info** section
- **Academic details** - SGPI, CGPI, results
- **QR code** (150x150) for instant verification
- **Blockchain section** - Data hash + TX hash
- **Footer** with verification URL

---

## 🔍 Verification Flow

### Via QR Code:
1. Student scans QR code on certificate
2. Opens: `/verify?cert=ABC-123&hash=0x...&tx=0x...`
3. API checks:
   - Certificate exists in database
   - Data hash matches stored hash
   - Hash exists on blockchain
   - Recomputes hash to verify integrity
4. Returns: ✓ Valid / ✗ Invalid

### Manual Verification:
1. User enters certificate ID at `/verify`
2. Same verification process
3. Displays certificate data if valid

---

## 📊 Admin Dashboard

### Features:
1. **Manual Entry** - Single certificate issuance
2. **Bulk Upload** - CSV/XLSX batch processing
3. **History** - View all issued certificates
   - Search by name, PRN, certificate ID
   - Download PDF
   - View certificate details
   - See blockchain hashes

---

## 🔐 Security Features

1. **Dual-Hash System**
   - Data hash: Verifies academic data integrity
   - PDF hash: Verifies document authenticity

2. **Blockchain Immutability**
   - Hashes stored on Ethereum cannot be altered
   - Timestamped proof of issuance

3. **QR Code Verification**
   - Includes data hash + transaction hash
   - Instant verification without downloading

4. **Tamper Detection**
   - Any modification changes the hash
   - Mismatch detected during verification

---

## 🧪 Testing

### Test Manual Issuance:
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to http://localhost:3000/admin/marksheets
# 3. Login as admin
# 4. Use "Manual Entry" tab
# 5. Fill in test data:
#    - Name: Test Student
#    - PRN: 12345678901234
#    - SGPI: 9.0
#    - CGPI: 8.5
# 6. Click "Issue Certificate"
# 7. Verify:
#    - Success message appears
#    - PDF downloads/opens
#    - Console shows blockchain TXs
#    - Certificate appears in History
```

### Test Bulk Upload:
```bash
# 1. Download template from "Bulk CSV Upload" tab
# 2. Add 2-3 test students
# 3. Upload file
# 4. Watch terminal logs
# 5. Verify certificates in History tab
```

### Test Verification:
```bash
# 1. Get certificate ID from History
# 2. Navigate to /verify
# 3. Enter certificate ID
# 4. Scan QR code with phone
# 5. Verify both methods work
```

---

## 📝 Troubleshooting

### Certificate not generating:
- Check blockchain connection (Alchemy RPC)
- Verify wallet has ETH for gas fees
- Check Supabase bucket permissions

### PDF upload fails:
- Ensure `Auth_Certificates` bucket exists
- Check bucket is public
- Verify Supabase credentials

### Blockchain TX fails:
- Insufficient gas/ETH in wallet
- RPC endpoint down
- Contract address incorrect

### QR code not working:
- Check `NEXT_PUBLIC_BASE_URL` is correct
- Ensure verification API is accessible
- Verify QR data format

---

## 🚀 Production Deployment

1. **Update Environment Variables:**
   ```env
   NEXT_PUBLIC_BASE_URL=https://authblock.vercel.app  # Your domain
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Run Database Migration:**
   - Execute `create_certificates_table.sql` in production DB

4. **Test End-to-End:**
   - Issue test certificate
   - Verify QR code works
   - Check blockchain TXs on Etherscan

5. **Monitor:**
   - Check Supabase storage quota
   - Monitor blockchain gas costs
   - Track certificate issuance rate

---

## 📞 Support

For issues or questions:
- Check logs in browser console
- Review terminal output for errors
- Verify environment variables
- Check Supabase and blockchain dashboard

---

## ✅ Success Criteria

System is working correctly when:
- ✅ Certificates issue successfully (manual + bulk)
- ✅ PDFs appear in Supabase storage
- ✅ Two blockchain TXs confirmed for each certificate
- ✅ Certificates appear in History tab
- ✅ QR codes scan and verify correctly
- ✅ Verification API returns valid data
- ✅ No errors in console or terminal

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0
**Status:** ✅ Ready for Deployment
