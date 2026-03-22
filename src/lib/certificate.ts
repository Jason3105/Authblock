import crypto from 'crypto'

export interface CertificateData {
  // Student Info
  name: string
  prn_no: string
  serial_no: string

  // Academic Info
  examination: string
  branch: string
  session: string

  // Results
  sgpi: string
  cgpi: string
  remarks: string

  // Totals
  totals: {
    credits: string
    gp: string
    cp: string
    cpgp: string
  }

  // Certificate Meta
  certificate_id: string
  issue_date: string
  blockchain_hash?: string
  verification_url?: string
}

export interface CertificateHashes {
  certificateHash: string  // Hash of the full certificate (for blockchain)
  dataHash: string         // Hash of just the JSON data (for verification)
}

/**
 * Generate a unique certificate ID
 */
export function generateCertificateId(prn: string, session: string): string {
  const timestamp = Date.now()
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase()
  const prnPart = prn.substring(prn.length - 4)
  const sessionPart = session.replace(/[^0-9]/g, '').substring(0, 4)

  return `ABC-${sessionPart}-${prnPart}-${randomPart}-${timestamp.toString(36).toUpperCase()}`
}

/**
 * Create certificate data from extracted marksheet info
 */
export function createCertificateData(extractedData: any, universityName?: string): CertificateData {
  const certificateId = generateCertificateId(
    extractedData.prn_no || 'UNKNOWN',
    extractedData.session || new Date().getFullYear().toString()
  )

  return {
    name: extractedData.name || '',
    prn_no: extractedData.prn_no || '',
    serial_no: extractedData.serial_no || '',
    examination: extractedData.examination || '',
    branch: extractedData.branch || '',
    session: extractedData.session || '',
    sgpi: extractedData.sgpi || '',
    cgpi: extractedData.cgpi || '',
    remarks: extractedData.remarks || '',
    totals: extractedData.totals || { credits: '', gp: '', cp: '', cpgp: '' },
    certificate_id: certificateId,
    issue_date: new Date().toISOString(),
    verification_url: undefined // Will be set later
  }
}

/**
 * Generate JSON data hash - This is what students can verify
 * Contains essential student academic data + certificate_id for uniqueness
 */
export function generateDataHash(certificateData: CertificateData): string {
  // Extract essential academic data + certificate_id for uniqueness
  // NOTE: issue_date is excluded because OCR cannot extract exact timestamp from certificate
  const essentialData = {
    name: certificateData.name,
    prn_no: certificateData.prn_no,
    serial_no: certificateData.serial_no,
    examination: certificateData.examination,
    branch: certificateData.branch,
    session: certificateData.session,
    sgpi: certificateData.sgpi,
    cgpi: certificateData.cgpi,
    remarks: certificateData.remarks,
    certificate_id: certificateData.certificate_id  // Sufficient for uniqueness
  }

  // Sort keys for consistent hashing
  const sortedJson = JSON.stringify(essentialData, Object.keys(essentialData).sort())

  const hash = crypto
    .createHash('sha256')
    .update(sortedJson)
    .digest('hex')

  return '0x' + hash
}

/**
 * Generate certificate document hash - For certificate authenticity
 * This hashes the full certificate data including metadata
 */
export function generateCertificateHash(certificateData: CertificateData): string {
  // Create a clean copy without blockchain_hash for hashing
  const cleanData = { ...certificateData }
  delete cleanData.blockchain_hash
  delete cleanData.verification_url

  // Include all certificate data
  const fullJson = JSON.stringify(cleanData, Object.keys(cleanData).sort())

  const hash = crypto
    .createHash('sha256')
    .update(fullJson)
    .digest('hex')

  return '0x' + hash
}

/**
 * Generate both hashes for certificate
 */
export function generateCertificateHashes(certificateData: CertificateData): CertificateHashes {
  return {
    dataHash: generateDataHash(certificateData),
    certificateHash: generateCertificateHash(certificateData)
  }
}

/**
 * Verify certificate data against stored hashes
 */
export function verifyCertificateHash(
  certificateData: CertificateData,
  storedCertHash: string,
  storedDataHash: string
): { valid: boolean; certificateMatch: boolean; dataMatch: boolean } {
  const { certificateHash, dataHash } = generateCertificateHashes(certificateData)

  const certificateMatch = certificateHash.toLowerCase() === storedCertHash.toLowerCase()
  const dataMatch = dataHash.toLowerCase() === storedDataHash.toLowerCase()

  return {
    valid: certificateMatch && dataMatch,
    certificateMatch,
    dataMatch
  }
}

/**
 * Format certificate data for display
 */
export function formatCertificateForPrint(data: CertificateData): string {
  return `
╔════════════════════════════════════════════════════════════════╗
║              AUTHBLOCK VERIFICATION CERTIFICATE                ║
║         Fr. Conceicao Rodrigues College of Engineering         ║
╠════════════════════════════════════════════════════════════════╣
║  Certificate ID: ${data.certificate_id}
║  Issue Date: ${new Date(data.issue_date).toLocaleDateString('en-IN')}
╠════════════════════════════════════════════════════════════════╣
║  STUDENT INFORMATION
║  Name: ${data.name}
║  PRN: ${data.prn_no}
║  Serial: ${data.serial_no}
║  Branch: ${data.branch}
╠════════════════════════════════════════════════════════════════╣
║  ACADEMIC DETAILS
║  Examination: ${data.examination}
║  Session: ${data.session}
║  SGPI: ${data.sgpi} | CGPI: ${data.cgpi}
║  Result: ${data.remarks}
║  Credits: ${data.totals.credits}
╠════════════════════════════════════════════════════════════════╣
║  BLOCKCHAIN VERIFICATION
║  Hash: ${data.blockchain_hash || 'Pending'}
║  Status: ✓ Secured on Ethereum Blockchain
╚════════════════════════════════════════════════════════════════╝
  `.trim()
}
