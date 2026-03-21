# Authblock Certificate System - Dual Hash Architecture

## Overview

Authblock uses a **dual-hash blockchain verification system** to ensure both data integrity and certificate authenticity.

## Hash Architecture

### 1. Data Hash (Primary Verification)
**Purpose**: Verify the essential academic data

**What it contains**:
- Student name
- PRN number
- Serial number
- Examination details
- Branch
- Session
- SGPI/CGPI
- Remarks
- Totals (credits, GP, CP, CPGP)

**Workflow**:
1. Extract essential student data → Create JSON
2. Hash the JSON → `data_hash`
3. Store `data_hash` on blockchain → Get `tx_hash_data`
4. Embed verification URL with `data_hash` in QR code
5. Students scan QR → Verify data on blockchain

**Usage**:
- **QR Code verification**: Students scan to verify their academic data
- **Quick verification**: Verify specific academic records without downloading certificate
- **Data integrity**: Ensures academic data hasn't been modified

### 2. Certificate Hash (Document Authenticity)
**Purpose**: Verify the complete certificate document

**What it contains**:
- All data from Data Hash
- Certificate ID
- Issue date
- QR code information
- All certificate metadata

**Workflow**:
1. Generate certificate with QR code (includes verification URL)
2. Hash the complete certificate → `certificate_hash`
3. Store `certificate_hash` on blockchain → Get `tx_hash_certificate`
4. Save both hashes to database

**Usage**:
- **Document verification**: Verify the entire certificate is authentic
- **Tampering detection**: Ensures certificate layout/content hasn't been altered
- **Forensic verification**: Full document verification for legal purposes

## Database Schema

```sql
CREATE TABLE certificates (
  -- Identifiers
  certificate_id TEXT UNIQUE NOT NULL,

  -- Student & Academic Data
  student_name TEXT NOT NULL,
  prn_no TEXT NOT NULL,
  -- ... other fields

  -- DUAL HASH SYSTEM
  -- Hash 1: Essential Data (for QR verification)
  data_hash TEXT NOT NULL,
  tx_hash_data TEXT,

  -- Hash 2: Complete Certificate (for document authenticity)
  certificate_hash TEXT NOT NULL,
  tx_hash_certificate TEXT,

  -- Full certificate data
  certificate_data JSONB NOT NULL
);
```

## Issuance Flow

```
1. Admin uploads student data (CSV/XLSX/Manual)
   ↓
2. Generate Certificate Data
   ↓
3. Create Data Hash (essential JSON)
   ↓
4. Store Data Hash on Blockchain → tx_hash_data
   ↓
5. Set QR Code URL: /verify?cert=ABC-123&hash=0x...
   ↓
6. Generate Certificate Hash (complete certificate)
   ↓
7. Store Certificate Hash on Blockchain → tx_hash_certificate
   ↓
8. Save to database with both hashes
   ↓
9. Certificate ready for download/sharing
```

## Verification Flow

### Via QR Code (Data Hash)
```
1. Student scans QR code
   ↓
2. Opens: /verify?cert=ABC-123&hash=0xDataHash...
   ↓
3. API fetches certificate from DB
   ↓
4. Verify hash matches stored data_hash
   ↓
5. Check data_hash exists on blockchain
   ↓
6. Recompute hash from stored data
   ↓
7. Return: ✓ Valid / ✗ Invalid
```

### Manual Certificate Verification
```
1. User uploads certificate PDF/image
   ↓
2. Extract certificate_id from document
   ↓
3. Fetch from database
   ↓
4. Verify both data_hash and certificate_hash on blockchain
   ↓
5. Full integrity check
```

## API Endpoints

### Issue Certificate
```
POST /api/admin/certificates/issue
Body: { student_name, prn_no, sgpi, cgpi, subjects, ... }
Returns: { certificate_id, data_hash, certificate_hash, tx_data, tx_certificate, verification_url }
```

### Verify Certificate
```
GET /api/verify/certificate?cert=ABC-123&hash=0x...
Returns: {
  valid: boolean,
  verification: {
    hash_integrity: boolean,
    on_blockchain: boolean,
    blockchain_timestamp: string,
    data_hash: string
  },
  certificate_data: {...}
}
```

### Fetch Certificate
```
GET /api/admin/certificates/[id]
Returns: { certificate_data, blockchain: { data_hash, certificate_hash, ... } }
```

## Security Features

1. **Tamper Detection**: Any modification to data changes the hash
2. **Blockchain Immutability**: Hashes stored on Ethereum can't be altered
3. **Dual Verification**: Both data and document verified independently
4. **Timestamping**: Blockchain provides immutable timestamp
5. **Hash Integrity Check**: Recompute and compare hashes

## Example QR Code URL

```
https://authblock.vercel.app/verify?cert=ABC-2024-1234-5678&hash=0x7a3d2e...
```

**Parameters**:
- `cert`: Certificate ID
- `hash`: Data hash (for quick verification)

## Benefits

✅ **For Students**:
- Quick QR code verification
- Portable digital certificate
- Blockchain-backed authenticity

✅ **For Universities**:
- Automated issuance
- Reduced fraud
- Immutable record keeping

✅ **For Employers**:
- Instant verification
- No need to contact university
- Cryptographic proof of authenticity

## Technology Stack

- **Blockchain**: Ethereum (Sepolia testnet)
- **Hashing**: SHA-256
- **Storage**: PostgreSQL (NeonDB)
- **Certificate**: React component with QR code
- **Verification**: REST API with blockchain integration
