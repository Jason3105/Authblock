import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { uploadToS3 } from '@/lib/s3'
import { sql } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import QRCode from 'qrcode'
import { getBlockchainContract } from '@/lib/blockchain'
import {
  createCertificateData,
  generateMarksheetCoordinateHash,
  type MarksheetCoordinateMap,
  type CertificateData
} from '@/lib/certificate'
import { publishIssuanceNotification } from '@/lib/notifications'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      serial_no, student_name, student_email, prn_no, examination, branch, session_name, sgpi, cgpi, date, remarks, subjects, issued_by
    } = body

    if (!student_name || !prn_no || !serial_no) {
      return NextResponse.json({ error: 'Missing required student data' }, { status: 400 })
    }

    console.log('[Issue] === STARTING DUAL ISSUANCE (Marksheet + Certificate) ===')
    console.log('[Issue] Student:', student_name, 'PRN:', prn_no)

    // ============================================================
    // PART 1: GENERATE MARKSHEET PDF (with coordinate tracking)
    // ============================================================
    console.log('\n[Marksheet] Generating marksheet PDF...')

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Standard A4
    const width = 595.28
    const height = 841.89
    const page = pdfDoc.addPage([width, height])

    // Load Template Image
    const templatePath = path.join(process.cwd(), 'public', 'FRCRCE_Marksheet_Template.png')
    const imgBytes = fs.readFileSync(templatePath)
    const img = await pdfDoc.embedPng(imgBytes)

    page.drawImage(img, { x: 0, y: 0, width, height })

    // ── Coordinate mapping collector ───────────────────────────────────────────
    // Tracks the critical semantic fields drawn on the marksheet for hashing.
    const coordinateMap: MarksheetCoordinateMap[] = []

    const drawPoint = (text: any, x: number, y: number, isBold = true, size = 10) => {
      page.drawText(String(text ?? ''), { x, y, size, font: isBold ? font : fontRegular, color: rgb(0, 0, 0) })
    }

    // Helper that draws AND records semantic coordinate entry
    const drawAndTrack = (field: string, text: any, x: number, y: number, isBold = true, size = 10) => {
      const str = String(text ?? '')
      drawPoint(str, x, y, isBold, size)
      coordinateMap.push({ field, x, y, value: str })
    }

    // ── Draw & track critical, semantically labelled fields ───────────────────
    drawAndTrack('Serial No.',   serial_no,    440, 685, true, 11)
    drawAndTrack('Full Name',    student_name, 150, 647, true, 11)
    drawAndTrack('Examination',  examination,  150, 630, true, 11)
    drawAndTrack('Branch',       branch,       150, 612, true, 11)
    drawAndTrack('Session',      session_name, 150, 595, true, 11)
    drawAndTrack('PRN Number',   prn_no,       150, 580, true, 11)

    // Subjects — drawn but NOT tracked in the semantic coordinate map per plan
    let currentY = 485
    for (const sub of subjects || []) {
      drawPoint(sub.code,  90,  currentY, false, 9)
      drawPoint(sub.title, 145, currentY, true,  9)
      drawPoint(sub.credits, 368, currentY, true, 9)
      drawPoint(sub.grade,   398, currentY, true, 9)
      drawPoint(sub.gp,      430, currentY, true, 9)
      const cp = sub.grade === 'F' ? '0' : sub.credits
      drawPoint(cp === '--' ? '--' : cp, 470, currentY, true, 9)
      drawPoint(sub.cpgp, 510, currentY, true, 9)
      currentY -= 20
    }

    // Totals
    const totalCredits = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.credits === '--' ? '0' : (s.credits || '0')), 0)
    const totalGp      = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.gp === '--' ? '0' : (s.gp || '0')), 0)
    const totalCp      = (subjects || []).reduce((acc: number, s: any) => acc + (s.grade === 'F' || s.credits === '--' ? 0 : parseInt(s.credits || '0')), 0)
    const totalCpGp    = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.cpgp === '--' ? '0' : (s.cpgp || '0')), 0)

    drawPoint(totalCredits.toString(), 365, 140, true, 10)
    drawPoint(totalGp.toString(),      395, 140, true, 10)
    drawPoint(totalCp.toString(),      470, 140, true, 10)
    drawPoint(totalCpGp.toString(),    507, 140, true, 10)

    // Track the summary results row
    drawAndTrack('Remarks', remarks || 'SUCCESSFUL', 130, 118, true, 10)
    drawAndTrack('SGPI',    sgpi,                    277, 118, true, 10)
    drawAndTrack('CGPI',    cgpi,                    335, 118, true, 10)
    drawPoint(date, 130, 100, true, 10)

    console.log('[Marksheet] Coordinate map collected:', coordinateMap.length, 'fields')
    console.log('[Marksheet] Coordinate map:', JSON.stringify(coordinateMap, null, 2))

    // ── Generate marksheet coordinate hash (data_hash) ─────────────────────
    const marksheetDataHash = generateMarksheetCoordinateHash(coordinateMap)
    console.log('[Marksheet] Coordinate Hash (data_hash):', marksheetDataHash.substring(0, 20) + '...')

    // ── Finalise marksheet PDF bytes (before QR, so hash is over clean data) ─
    const marksheetPdfBytes = await pdfDoc.save()
    const marksheetFileName = `${prn_no}_${Date.now()}.pdf`
    console.log('[Marksheet] PDF generated, size:', marksheetPdfBytes.length, 'bytes')

    // ── Generate marksheet PDF hash (pdf_hash) ─────────────────────────────
    const marksheetPdfHash = '0x' + crypto.createHash('sha256').update(marksheetPdfBytes).digest('hex')
    console.log('[Marksheet] PDF Hash (pdf_hash):', marksheetPdfHash.substring(0, 20) + '...')

    // ============================================================
    // PART 2: REGISTER MARKSHEET DATA HASH ON BLOCKCHAIN (tx_hash_data)
    // ============================================================
    let tx_hash_data: string | null = null
    try {
      const { contract } = await getBlockchainContract()
      console.log('[Blockchain] Registering marksheet coordinate data hash...')
      const txData = await contract.registerHash(marksheetDataHash)
      // Fire-and-forget: capture hash immediately, mining continues in background
      tx_hash_data = txData.hash
      console.log('[Blockchain] ✓ Marksheet data hash broadcast (processing in background)! TX:', tx_hash_data)
    } catch (e: any) {
      console.error('[Blockchain] Failed to broadcast marksheet data hash:', e)
      throw new Error('Failed to register marksheet data hash: ' + e.message)
    }

    // ============================================================
    // PART 3: REGISTER MARKSHEET PDF HASH ON BLOCKCHAIN (tx_hash_pdf)
    // ============================================================
    let tx_hash_pdf: string | null = null
    try {
      const { contract } = await getBlockchainContract()
      console.log('[Blockchain] Registering marksheet PDF hash...')
      const txPdf = await contract.registerHash(marksheetPdfHash)
      // Fire-and-forget: capture hash immediately, mining continues in background
      tx_hash_pdf = txPdf.hash
      console.log('[Blockchain] ✓ Marksheet PDF hash broadcast (processing in background)! TX:', tx_hash_pdf)
    } catch (e: any) {
      console.error('[Blockchain] Failed to broadcast marksheet PDF hash:', e)
      throw new Error('Failed to register marksheet PDF hash: ' + e.message)
    }

    // ============================================================
    // PART 4: CREATE VERIFICATION URL & QR CODE
    // (verification URL uses the marksheet data hash)
    // ============================================================
    const extractedData = {
      name: String(student_name || ''),
      prn_no: String(prn_no || ''),
      serial_no: String(serial_no || ''),
      examination: String(examination || ''),
      branch: String(branch || ''),
      session: String(session_name || ''),
      sgpi: String(sgpi || ''),
      cgpi: String(cgpi || ''),
      remarks: String(remarks || 'SUCCESSFUL'),
      totals: {
        credits: totalCredits.toString(),
        gp: totalGp.toString(),
        cp: totalCp.toString(),
        cpgp: totalCpGp.toString()
      }
    }

    const certificateData: CertificateData = createCertificateData(extractedData)
    // Attach the marksheet hashes to certificate metadata
    certificateData.blockchain_hash = marksheetDataHash

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify?cert=${certificateData.certificate_id}&hash=${marksheetDataHash}&tx=${tx_hash_data}`
    const qrScanUrl       = `${baseUrl}/verify?cert=${certificateData.certificate_id}`
    certificateData.verification_url = verificationUrl
    console.log('[Certificate] Verification URL created (references marksheet hashes)')

    // Generate QR Code
    const qrBuffer = await QRCode.toBuffer(qrScanUrl, {
      errorCorrectionLevel: 'L',
      type: 'png',
      width: 300,
      margin: 2
    })

    // ============================================================
    // PART 5: GENERATE AUTHBLOCK CERTIFICATE PDF WITH QR CODE
    // (Authblock cert lists marksheet hashes — no new blockchain tx)
    // ============================================================
    const certPdfDoc = await PDFDocument.create()
    const certPage   = certPdfDoc.addPage([595.28, 841.89])
    const cw = 595.28
    const ch = 841.89

    const fontBold = await certPdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontReg  = await certPdfDoc.embedFont(StandardFonts.Helvetica)
    const qrImage  = await certPdfDoc.embedPng(qrBuffer)

    // String coercion helper — pdf-lib strictly requires string, never number
    const s = (v: any): string => String(v ?? '')

    const BLACK = rgb(0,    0,    0)
    const DARK  = rgb(0.13, 0.13, 0.13)
    const LGREY = rgb(0.35, 0.35, 0.35)
    const BLUE  = rgb(0.11, 0.30, 0.87)
    const WHITE = rgb(1,    1,    1)
    const GREEN = rgb(0.05, 0.50, 0.15)
    const RED   = rgb(0.70, 0.05, 0.05)

    // ── White background ──
    certPage.drawRectangle({ x: 0, y: 0, width: cw, height: ch, color: WHITE })
    // ── Top accent bar ──
    certPage.drawRectangle({ x: 0, y: ch - 10, width: cw, height: 10, color: BLUE })

    // ── Header ───────────────────────────────────────────────────
    const headerY = ch - 55
    certPage.drawText('AUTHBLOCK', { x: 40, y: headerY + 12, size: 28, font: fontBold, color: BLUE })
    certPage.drawText('Blockchain Certification Authority · Fr. Conceicao Rodrigues College of Engineering', {
      x: 40, y: headerY - 6, size: 9, font: fontReg, color: LGREY
    })
    certPage.drawRectangle({ x: 40, y: ch - 80, width: cw - 80, height: 1.5, color: BLUE })

    // ── Certificate title ────────────────────────────────────────
    certPage.drawText('BLOCKCHAIN VERIFICATION CERTIFICATE', { x: 40, y: ch - 102, size: 15, font: fontBold, color: BLACK })
    certPage.drawText('Marksheet — Cryptographically Secured on Ethereum (Sepolia)', {
      x: 40, y: ch - 120, size: 9, font: fontReg, color: LGREY
    })

    // ── Certificate ID band ──────────────────────────────────────
    certPage.drawRectangle({ x: 40, y: ch - 152, width: cw - 80, height: 22, color: rgb(0.95, 0.97, 1) })
    certPage.drawRectangle({ x: 40, y: ch - 152, width: cw - 80, height: 22, borderColor: rgb(0.80, 0.88, 1), borderWidth: 0.8 })
    certPage.drawText('Certificate ID:', { x: 48, y: ch - 145, size: 9, font: fontBold, color: BLUE })
    certPage.drawText(s(certificateData.certificate_id), { x: 118, y: ch - 145, size: 9, font: fontBold, color: BLACK })

    // ── Student Information ──────────────────────────────────────
    let yPos = ch - 183
    certPage.drawText('STUDENT INFORMATION', { x: 40, y: yPos, size: 11, font: fontBold, color: BLUE })
    certPage.drawRectangle({ x: 40, y: yPos - 4, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    yPos -= 22

    certPage.drawText('Full Name', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    certPage.drawText('Serial No.', { x: 310, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(s(certificateData.name), { x: 40, y: yPos, size: 13, font: fontBold, color: BLACK })
    certPage.drawText(s(certificateData.serial_no) || '—', { x: 310, y: yPos, size: 13, font: fontBold, color: BLACK })
    yPos -= 22

    certPage.drawText('PRN Number', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    certPage.drawText('Branch / Programme', { x: 310, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(s(certificateData.prn_no), { x: 40, y: yPos, size: 13, font: fontBold, color: BLACK })
    certPage.drawText(s(certificateData.branch), { x: 310, y: yPos, size: 13, font: fontBold, color: BLACK })
    yPos -= 28

    // ── Academic Details ─────────────────────────────────────────
    certPage.drawText('ACADEMIC DETAILS', { x: 40, y: yPos, size: 11, font: fontBold, color: BLUE })
    certPage.drawRectangle({ x: 40, y: yPos - 4, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    yPos -= 22

    certPage.drawText('Examination', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    certPage.drawText('Session', { x: 310, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(s(certificateData.examination), { x: 40, y: yPos, size: 12, font: fontBold, color: BLACK })
    certPage.drawText(s(certificateData.session), { x: 310, y: yPos, size: 12, font: fontBold, color: BLACK })
    yPos -= 28

    certPage.drawText('SGPI', { x: 40, y: yPos, size: 9, font: fontBold, color: LGREY })
    certPage.drawText('CGPI', { x: 160, y: yPos, size: 9, font: fontBold, color: LGREY })
    certPage.drawText('Remark', { x: 310, y: yPos, size: 9, font: fontBold, color: LGREY })
    yPos -= 18
    certPage.drawText(s(certificateData.sgpi) || '—', { x: 40, y: yPos, size: 22, font: fontBold, color: BLUE })
    certPage.drawText(s(certificateData.cgpi) || '—', { x: 160, y: yPos, size: 22, font: fontBold, color: BLUE })
    const isPass = s(certificateData.remarks).toUpperCase().includes('PASS') || s(certificateData.remarks).toUpperCase().includes('SUCCESS')
    certPage.drawText(s(certificateData.remarks), { x: 310, y: yPos, size: 16, font: fontBold, color: isPass ? GREEN : RED })
    yPos -= 30

    certPage.drawText(`Total Credits: ${totalCredits}   Total GP: ${totalGp}   Total CP: ${totalCp}   Total CPGP: ${totalCpGp}`, {
      x: 40, y: yPos, size: 10, font: fontReg, color: DARK
    })
    yPos -= 30

    // ── Blockchain Verification (Marksheet Hashes) ───────────────
    certPage.drawText('MARKSHEET BLOCKCHAIN ANCHORS', { x: 40, y: yPos, size: 11, font: fontBold, color: BLUE })
    certPage.drawRectangle({ x: 40, y: yPos - 4, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    yPos -= 22

    certPage.drawText('Issue Date', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(new Date(certificateData.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), {
      x: 40, y: yPos, size: 12, font: fontBold, color: BLACK
    })
    yPos -= 22

    certPage.drawText('Marksheet Data Hash (SHA-256)', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(marksheetDataHash, { x: 40, y: yPos, size: 7.5, font: fontReg, color: DARK })
    yPos -= 18

    certPage.drawText('Marksheet PDF Hash (SHA-256)', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(marksheetPdfHash, { x: 40, y: yPos, size: 7.5, font: fontReg, color: DARK })
    yPos -= 18

    certPage.drawText('Data Hash Transaction (Sepolia)', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(tx_hash_data || 'N/A', { x: 40, y: yPos, size: 7.5, font: fontReg, color: DARK })
    yPos -= 20

    certPage.drawText('[OK] Marksheet Secured on Ethereum Blockchain (Sepolia)', {
      x: 40, y: yPos, size: 10, font: fontBold, color: GREEN
    })

    // ── QR Code ─────────────────────────────────────────────────
    const qrSize = 110
    const qrX = (cw - qrSize) / 2
    const qrY = 58
    certPage.drawRectangle({ x: 40, y: yPos - 8, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    certPage.drawText('SCAN TO VERIFY MARKSHEET AUTHENTICITY', {
      x: (cw - 170) / 2, y: qrY + qrSize + 10, size: 9, font: fontBold, color: BLUE
    })
    certPage.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })
    certPage.drawText('Scan QR code to verify this marksheet on the blockchain', {
      x: (cw - 230) / 2, y: qrY - 12, size: 8, font: fontReg, color: LGREY
    })

    // ── Footer ───────────────────────────────────────────────────
    certPage.drawRectangle({ x: 40, y: 30, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    certPage.drawText('This is a digitally signed blockchain certificate issued by Authblock.', {
      x: 40, y: 18, size: 7, font: fontReg, color: LGREY
    })
    certPage.drawText(`Verify at: ${baseUrl}/verify`, {
      x: (cw - 100) / 2, y: 8, size: 7, font: fontReg, color: BLUE
    })
    certPage.drawRectangle({ x: 0, y: 0, width: cw, height: 6, color: BLUE })

    const certPdfBytes = await certPdfDoc.save()
    console.log('[Certificate] Authblock Certificate PDF generated, size:', certPdfBytes.length, 'bytes')

    // ============================================================
    // PART 6: UPLOAD AUTHBLOCK CERTIFICATE TO AWS S3
    // ============================================================
    const certS3Key = `certificates/${certificateData.certificate_id}.pdf`
    console.log('[S3] Uploading certificate to authblock-docs/certificates/...')

    const certPdfUrl = await uploadToS3(certS3Key, certPdfBytes, 'application/pdf')
    console.log('[S3] ✓ Certificate uploaded:', certPdfUrl)

    // ============================================================
    // PART 7: UPLOAD MARKSHEET TO AWS S3
    // ============================================================
    console.log('\n[S3] Uploading marksheet to authblock-docs/marksheets/...')

    const marksheetS3Key = `marksheets/${marksheetFileName}`
    const marksheetPdfUrl = await uploadToS3(marksheetS3Key, marksheetPdfBytes, 'application/pdf')
    console.log('[S3] ✓ Marksheet uploaded:', marksheetPdfUrl)

    // ============================================================
    // PART 8: SAVE TO DATABASE
    // data_hash  = marksheet coordinate hash (semantic fields + x/y)
    // pdf_hash   = marksheet PDF hash
    // tx_hash_data = blockchain tx for data_hash
    // tx_hash_pdf  = blockchain tx for pdf_hash
    // ============================================================
    const subjectsJson    = JSON.stringify(subjects || [])
    const certificateJson = JSON.stringify({
      ...certificateData,
      // Stored for OCR/canvas verification: tells the verifier exactly where on
      // the PDF page each field lives so text can be extracted and compared.
      // x/y are NOT part of the blockchain hash — only field+value are hashed.
      ocr_coordinate_map: coordinateMap
    })

    // @ts-ignore
    const db = sql()

    console.log('\n[Database] Auto-registering student in users table...')
    await db`
      INSERT INTO users (prn_no, full_name, student_email)
      VALUES (${prn_no}, ${student_name}, ${student_email || null})
      ON CONFLICT (prn_no) DO UPDATE 
      SET student_email = COALESCE(users.student_email, EXCLUDED.student_email)
    `

    const result = await db`
      INSERT INTO marksheets (
        serial_no, student_name, prn_no, examination, branch, session_name, sgpi, cgpi, remarks, subjects,
        supabase_pdf_url, issued_by,
        pdf_hash, data_hash, tx_hash_pdf, tx_hash_data,
        certificate_id, certificate_url, verification_url, certificate_data
      ) VALUES (
        ${serial_no}, ${student_name}, ${prn_no}, ${examination}, ${branch}, ${session_name}, ${sgpi}, ${cgpi}, ${remarks}, ${subjectsJson},
        ${marksheetPdfUrl}, ${issued_by},
        ${marksheetPdfHash}, ${marksheetDataHash}, ${tx_hash_pdf}, ${tx_hash_data},
        ${certificateData.certificate_id}, ${certPdfUrl}, ${verificationUrl}, ${certificateJson}
      )
      RETURNING id
    `

    // @ts-ignore
    const newId = result && result[0] ? result[0].id : null
    console.log('\n[Database] ✓ Saved to marksheets table with ID:', newId)

    // ============================================================
    // PART 9: SEND EMAIL NOTIFICATION DIRECTLY VIA SES
    // (fire-and-forget: any failure does NOT affect the issuance response)
    // ============================================================
    publishIssuanceNotification({
      studentName:     String(student_name || ''),
      studentEmail:    String(student_email || ''),
      prnNo:           String(prn_no || ''),
      serialNo:        String(serial_no || ''),
      examination:     String(examination || ''),
      branch:          String(branch || ''),
      session:         String(session_name || ''),
      sgpi:            String(sgpi || ''),
      cgpi:            String(cgpi || ''),
      remarks:         String(remarks || 'SUCCESSFUL'),
      marksheetUrl:    marksheetPdfUrl,
      certificateUrl:  certPdfUrl,
      certificateId:   certificateData.certificate_id,
      verificationUrl: verificationUrl,
      issueDate:       new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    }).catch(e => console.error('[Notify] Email notification failed:', e))

    console.log('[Issue] === DUAL ISSUANCE COMPLETE ===\n')

    return NextResponse.json({
      success: true,
      id: newId,
      marksheet: {
        url: marksheetPdfUrl
      },
      certificate: {
        id: certificateData.certificate_id,
        url: certPdfUrl,
        marksheet_data_hash: marksheetDataHash,
        marksheet_pdf_hash: marksheetPdfHash,
        tx_data: tx_hash_data,
        tx_pdf: tx_hash_pdf,
        verification_url: verificationUrl
      }
    })

  } catch (err: any) {
    console.error('[issue] ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
