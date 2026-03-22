import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { supabase } from '@/lib/supabase'
import { sql } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import QRCode from 'qrcode'
import { getBlockchainContract } from '@/lib/blockchain'
import { createCertificateData, generateDataHash, type CertificateData } from '@/lib/certificate'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      serial_no, student_name, prn_no, examination, branch, session_name, sgpi, cgpi, date, remarks, subjects, issued_by
    } = body

    if (!student_name || !prn_no || !serial_no) {
      return NextResponse.json({ error: 'Missing required student data' }, { status: 400 })
    }

    console.log('[Issue] === STARTING DUAL ISSUANCE (Marksheet + Certificate) ===')
    console.log('[Issue] Student:', student_name, 'PRN:', prn_no)

    // ============================================================
    // PART 1: GENERATE MARKSHEET PDF
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

    // Draw text coordinates
    const drawPoint = (text: string, x: number, y: number, isBold = true, size = 10) => {
      page.drawText(text || '', { x, y, size, font: isBold ? font : fontRegular, color: rgb(0,0,0) })
    }

    drawPoint(serial_no, 440, 685, true, 11)
    drawPoint(student_name, 150, 647, true, 11)
    drawPoint(examination, 150, 630, true, 11)
    drawPoint(branch, 150, 612, true, 11)
    drawPoint(session_name, 150, 595, true, 11)
    drawPoint(prn_no, 150, 580, true, 11)

    // Subjects
    let currentY = 485
    for (const sub of subjects || []) {
      drawPoint(sub.code, 90, currentY, false, 9)
      drawPoint(sub.title, 145, currentY, true, 9)
      drawPoint(sub.credits, 368, currentY, true, 9)
      drawPoint(sub.grade, 398, currentY, true, 9)
      drawPoint(sub.gp, 430, currentY, true, 9)
      const cp = sub.grade === 'F' ? '0' : sub.credits
      drawPoint(cp === '--' ? '--' : cp, 470, currentY, true, 9)
      drawPoint(sub.cpgp, 510, currentY, true, 9)
      currentY -= 20
    }

    // Totals
    const totalCredits = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.credits === '--' ? '0' : (s.credits || '0')), 0)
    const totalGp = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.gp === '--' ? '0' : (s.gp || '0')), 0)
    const totalCp = (subjects || []).reduce((acc: number, s: any) => acc + (s.grade === 'F' || s.credits === '--' ? 0 : parseInt(s.credits || '0')), 0)
    const totalCpGp = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.cpgp === '--' ? '0' : (s.cpgp || '0')), 0)

    drawPoint(totalCredits.toString(), 365, 140, true, 10)
    drawPoint(totalGp.toString(), 395, 140, true, 10)
    drawPoint(totalCp.toString(), 470, 140, true, 10)
    drawPoint(totalCpGp.toString(), 507, 140, true, 10)

    drawPoint(remarks || 'SUCCESSFUL', 130, 118, true, 10)
    drawPoint(sgpi, 277, 118, true, 10)
    drawPoint(cgpi, 335, 118, true, 10)
    drawPoint(date, 130, 100, true, 10)

    const marksheetPdfBytes = await pdfDoc.save()
    const marksheetFileName = `${prn_no}_${Date.now()}.pdf`

    console.log('[Marksheet] PDF generated, size:', marksheetPdfBytes.length, 'bytes')

    // ============================================================
    // PART 2: GENERATE AUTHBLOCK CERTIFICATE (Data Hash First)
    // ============================================================
    console.log('\n[Certificate] Generating Authblock certificate...')

    // Create certificate data structure
    const extractedData = {
      name: student_name,
      prn_no,
      serial_no: serial_no || '',
      examination: examination || '',
      branch: branch || '',
      session: session_name || '',
      sgpi: sgpi || '',
      cgpi: cgpi || '',
      remarks: remarks || 'SUCCESSFUL',
      totals: {
        credits: totalCredits.toString(),
        gp: totalGp.toString(),
        cp: totalCp.toString(),
        cpgp: totalCpGp.toString()
      }
    }

    const certificateData: CertificateData = createCertificateData(extractedData)
    const certDataHash = generateDataHash(certificateData)
    console.log('[Certificate] ID:', certificateData.certificate_id)
    console.log('[Certificate] Data Hash:', certDataHash.substring(0, 20) + '...')

    // ============================================================
    // PART 3: REGISTER CERTIFICATE DATA HASH ON BLOCKCHAIN
    // ============================================================
    let tx_hash_data = null
    try {
      const { contract } = await getBlockchainContract()
      console.log('[Blockchain] Registering certificate data hash...')
      const txCertData = await contract.registerHash(certDataHash)
      const recCertData = await txCertData.wait()
      tx_hash_data = recCertData.hash
      console.log('[Blockchain] ✓ Certificate data hash stored! TX:', tx_hash_data)
    } catch (e: any) {
      console.error('[Blockchain] Failed to store certificate data hash:', e)
      throw new Error('Failed to register certificate data hash: ' + e.message)
    }

    // ============================================================
    // PART 4: CREATE VERIFICATION URL & QR CODE
    // ============================================================
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify?cert=${certificateData.certificate_id}&hash=${certDataHash}&tx=${tx_hash_data}`
    const qrScanUrl = `${baseUrl}/verify?cert=${certificateData.certificate_id}`
    certificateData.verification_url = verificationUrl
    certificateData.blockchain_hash = certDataHash
    console.log('[Certificate] Verification URL created')

    // Generate QR Code
    const qrBuffer = await QRCode.toBuffer(qrScanUrl, {
      errorCorrectionLevel: 'L',
      type: 'png',
      width: 300,
      margin: 2
    })

    // ============================================================
    // PART 5: GENERATE CERTIFICATE PDF WITH QR CODE
    // A4 Portrait — White Background — Black Bold Text (OCR-Optimised)
    // ============================================================
    const certPdfDoc = await PDFDocument.create()
    // A4 portrait: 595.28 × 841.89 pt
    const certPage = certPdfDoc.addPage([595.28, 841.89])
    const cw = 595.28  // canvas width
    const ch = 841.89  // canvas height

    const fontBold = await certPdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontReg  = await certPdfDoc.embedFont(StandardFonts.Helvetica)
    const qrImage  = await certPdfDoc.embedPng(qrBuffer)

    const BLACK   = rgb(0,    0,    0)
    const DARK    = rgb(0.13, 0.13, 0.13)
    const LGREY   = rgb(0.35, 0.35, 0.35)
    const BLUE    = rgb(0.11, 0.30, 0.87)
    const WHITE   = rgb(1,    1,    1)
    const GREEN   = rgb(0.05, 0.50, 0.15)
    const RED     = rgb(0.70, 0.05, 0.05)

    // ── White background ──
    certPage.drawRectangle({ x: 0, y: 0, width: cw, height: ch, color: WHITE })

    // ── Top accent bar (blue) ──
    certPage.drawRectangle({ x: 0, y: ch - 10, width: cw, height: 10, color: BLUE })

    // ── Header section ──────────────────────────────────────────
    const headerY = ch - 55
    certPage.drawText('AUTHBLOCK', {
      x: 40, y: headerY + 12,
      size: 28, font: fontBold, color: BLUE
    })
    certPage.drawText('Blockchain Certification Authority · Fr. Conceicao Rodrigues College of Engineering', {
      x: 40, y: headerY - 6,
      size: 9, font: fontReg, color: LGREY
    })


    // ── Divider ──────────────────────────────────────────────────
    certPage.drawRectangle({ x: 40, y: ch - 80, width: cw - 80, height: 1.5, color: BLUE })

    // ── Certificate title ─────────────────────────────────────
    certPage.drawText('BLOCKCHAIN VERIFICATION CERTIFICATE', {
      x: 40, y: ch - 102,
      size: 15, font: fontBold, color: BLACK
    })
    certPage.drawText('Academic Performance Record — Cryptographically Secured on Ethereum', {
      x: 40, y: ch - 120,
      size: 9, font: fontReg, color: LGREY
    })

    // ── Certificate ID band ───────────────────────────────────
    certPage.drawRectangle({ x: 40, y: ch - 152, width: cw - 80, height: 22, color: rgb(0.95, 0.97, 1) })
    certPage.drawRectangle({ x: 40, y: ch - 152, width: cw - 80, height: 22,
      borderColor: rgb(0.80, 0.88, 1), borderWidth: 0.8
    })
    certPage.drawText('Certificate ID:', {
      x: 48, y: ch - 145,
      size: 9, font: fontBold, color: BLUE
    })
    certPage.drawText(certificateData.certificate_id, {
      x: 118, y: ch - 145,
      size: 9, font: fontBold, color: BLACK
    })

    // ── SECTION: Student Information ──────────────────────────
    let yPos = ch - 183
    certPage.drawText('STUDENT INFORMATION', {
      x: 40, y: yPos,
      size: 11, font: fontBold, color: BLUE
    })
    certPage.drawRectangle({ x: 40, y: yPos - 4, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    yPos -= 22

    // Row 1: Name + Serial side-by-side
    certPage.drawText('Full Name', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    certPage.drawText('Serial No.', { x: 310, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(certificateData.name, { x: 40, y: yPos, size: 13, font: fontBold, color: BLACK })
    certPage.drawText(certificateData.serial_no || '—', { x: 310, y: yPos, size: 13, font: fontBold, color: BLACK })
    yPos -= 22

    // Row 2: PRN + Branch
    certPage.drawText('PRN Number', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    certPage.drawText('Branch / Programme', { x: 310, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(certificateData.prn_no, { x: 40, y: yPos, size: 13, font: fontBold, color: BLACK })
    certPage.drawText(certificateData.branch, { x: 310, y: yPos, size: 13, font: fontBold, color: BLACK })
    yPos -= 28

    // ── SECTION: Academic Details ─────────────────────────────
    certPage.drawText('ACADEMIC DETAILS', {
      x: 40, y: yPos,
      size: 11, font: fontBold, color: BLUE
    })
    certPage.drawRectangle({ x: 40, y: yPos - 4, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    yPos -= 22

    // Row 1: Examination + Session
    certPage.drawText('Examination', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    certPage.drawText('Session', { x: 310, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(certificateData.examination, { x: 40, y: yPos, size: 12, font: fontBold, color: BLACK })
    certPage.drawText(certificateData.session, { x: 310, y: yPos, size: 12, font: fontBold, color: BLACK })
    yPos -= 28

    // Row 2: SGPI | CGPI | Result — large, prominent
    certPage.drawText('SGPI', { x: 40,  y: yPos, size: 9, font: fontBold, color: LGREY })
    certPage.drawText('CGPI', { x: 160, y: yPos, size: 9, font: fontBold, color: LGREY })
    certPage.drawText('Remark', { x: 310, y: yPos, size: 9, font: fontBold, color: LGREY })
    yPos -= 18
    certPage.drawText(certificateData.sgpi || '—', { x: 40,  y: yPos, size: 22, font: fontBold, color: BLUE })
    certPage.drawText(certificateData.cgpi || '—', { x: 160, y: yPos, size: 22, font: fontBold, color: BLUE })
    const isPass = certificateData.remarks.toUpperCase().includes('PASS') || certificateData.remarks.toUpperCase().includes('SUCCESS')
    certPage.drawText(certificateData.remarks, { x: 310, y: yPos, size: 16, font: fontBold, color: isPass ? GREEN : RED })
    yPos -= 30

    // Row 3: Totals (compact)
    certPage.drawText(`Total Credits: ${totalCredits}   Total GP: ${totalGp}   Total CP: ${totalCp}   Total CPGP: ${totalCpGp}`, {
      x: 40, y: yPos, size: 10, font: fontReg, color: DARK
    })
    yPos -= 30

    // ── SECTION: Blockchain Verification ─────────────────────
    certPage.drawText('BLOCKCHAIN VERIFICATION', {
      x: 40, y: yPos,
      size: 11, font: fontBold, color: BLUE
    })
    certPage.drawRectangle({ x: 40, y: yPos - 4, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    yPos -= 22

    certPage.drawText('Issue Date', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(new Date(certificateData.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), {
      x: 40, y: yPos, size: 12, font: fontBold, color: BLACK
    })
    yPos -= 22

    certPage.drawText('Data Hash (SHA-256)', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(certDataHash, { x: 40, y: yPos, size: 8, font: fontReg, color: DARK })
    yPos -= 18

    certPage.drawText('Transaction Hash', { x: 40, y: yPos, size: 8, font: fontReg, color: LGREY })
    yPos -= 13
    certPage.drawText(tx_hash_data, { x: 40, y: yPos, size: 8, font: fontReg, color: DARK })
    yPos -= 20

    certPage.drawText('[OK] Secured on Ethereum Blockchain (Sepolia)', {
      x: 40, y: yPos, size: 10, font: fontBold, color: GREEN
    })

    // ── QR Code — bottom centre ───────────────────────────────
    // QR sits in the gap between blockchain content (~y=298) and footer (y=46)
    // Centre horizontally; draw label above and URL below
    const qrSize = 110
    const qrX = (cw - qrSize) / 2
    const qrY = 58  // bottom of QR (pdf-lib y = bottom-left corner)
    certPage.drawRectangle({ x: 40, y: yPos - 8, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    certPage.drawText('SCAN TO VERIFY AUTHENTICITY', {
      x: (cw - 140) / 2, y: qrY + qrSize + 10,
      size: 9, font: fontBold, color: BLUE
    })
    certPage.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })
    certPage.drawText('Scan QR code to verify this certificate on the blockchain', {
      x: (cw - 230) / 2, y: qrY - 12,
      size: 8, font: fontReg, color: LGREY
    })

    // ── Footer ────────────────────────────────────────────────
    certPage.drawRectangle({ x: 40, y: 30, width: cw - 80, height: 0.8, color: rgb(0.85, 0.90, 1) })
    certPage.drawText('This is a digitally signed blockchain certificate issued by Authblock.', {
      x: 40, y: 18, size: 7, font: fontReg, color: LGREY
    })
    certPage.drawText(`Verify at: ${baseUrl}/verify`, {
      x: (cw - 100) / 2, y: 8, size: 7, font: fontReg, color: BLUE
    })

    // ── Bottom accent bar ─────────────────────────────────────
    certPage.drawRectangle({ x: 0, y: 0, width: cw, height: 6, color: BLUE })

    const certPdfBytes = await certPdfDoc.save()
    console.log('[Certificate] PDF generated, size:', certPdfBytes.length, 'bytes')

    // ============================================================
    // PART 6: UPLOAD CERTIFICATE TO SUPABASE
    // ============================================================
    const certFileName = `${certificateData.certificate_id}.pdf`
    console.log('[Supabase] Uploading certificate to Auth_Certificates bucket...')

    const { error: certUploadError } = await supabase.storage
      .from('Auth_Certificates')
      .upload(certFileName, certPdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (certUploadError) {
      console.error('[Supabase] Certificate upload error:', certUploadError)
      throw new Error(`Certificate storage upload failed: ${certUploadError.message}`)
    }

    const { data: certUrlData } = supabase.storage
      .from('Auth_Certificates')
      .getPublicUrl(certFileName)

    const certPdfUrl = certUrlData.publicUrl
    console.log('[Supabase] ✓ Certificate uploaded:', certPdfUrl)

    // ============================================================
    // PART 7: REGISTER CERTIFICATE PDF HASH (as pdf_hash)
    // ============================================================
    const pdfHash = '0x' + crypto.createHash('sha256').update(certPdfBytes).digest('hex')
    console.log('[Certificate] PDF Hash:', pdfHash.substring(0, 20) + '...')

    let tx_hash_pdf = null
    try {
      const { contract } = await getBlockchainContract()
      console.log('[Blockchain] Registering certificate PDF hash...')
      const txCert = await contract.registerHash(pdfHash)
      const recCert = await txCert.wait()
      tx_hash_pdf = recCert.hash
      console.log('[Blockchain] ✓ Certificate PDF hash stored! TX:', tx_hash_pdf)
    } catch (e: any) {
      console.error('[Blockchain] Failed to store certificate PDF hash:', e)
      throw new Error('Failed to register certificate PDF hash: ' + e.message)
    }

    // ============================================================
    // PART 8: UPLOAD MARKSHEET TO SUPABASE
    // ============================================================
    console.log('\n[Supabase] Uploading marksheet to FRCRCE_Marksheets bucket...')

    const { error: uploadError } = await supabase.storage
      .from('FRCRCE_Marksheets')
      .upload(marksheetFileName, marksheetPdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('[Supabase] Marksheet upload error:', uploadError)
      throw new Error(`Marksheet storage upload failed: ${uploadError.message}`)
    }

    const { data: marksheetUrlData } = supabase.storage
      .from('FRCRCE_Marksheets')
      .getPublicUrl(marksheetFileName)

    const marksheetPdfUrl = marksheetUrlData.publicUrl
    console.log('[Supabase] ✓ Marksheet uploaded:', marksheetPdfUrl)

    // ============================================================
    // PART 9: SAVE TO DATABASE (Single marksheets table)
    // ============================================================
    const subjectsJson = JSON.stringify(subjects || [])
    const certificateJson = JSON.stringify(certificateData)

    // @ts-ignore
    const db = sql()
    
    // Auto-register student if they don't exist yet
    console.log('\n[Database] Auto-registering student in users table...')
    await db`
      INSERT INTO users (prn_no, full_name)
      VALUES (${prn_no}, ${student_name})
      ON CONFLICT (prn_no) DO NOTHING
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
        ${pdfHash}, ${certDataHash}, ${tx_hash_pdf}, ${tx_hash_data},
        ${certificateData.certificate_id}, ${certPdfUrl}, ${verificationUrl}, ${certificateJson}
      )
      RETURNING id
    `

    // @ts-ignore
    const newId = result && result[0] ? result[0].id : null
    console.log('\n[Database] ✓ Saved to marksheets table with ID:', newId)
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
        pdf_hash: pdfHash,
        data_hash: certDataHash,
        tx_pdf: tx_hash_pdf,
        tx_data: tx_hash_data,
        verification_url: verificationUrl
      }
    })

  } catch (err: any) {
    console.error('[issue] ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
