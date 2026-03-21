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
    certificateData.verification_url = verificationUrl
    certificateData.blockchain_hash = certDataHash
    console.log('[Certificate] Verification URL created')

    // Generate QR Code
    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 2
    })

    // ============================================================
    // PART 5: GENERATE CERTIFICATE PDF WITH QR CODE
    // ============================================================
    const certPdfDoc = await PDFDocument.create()
    const certPage = certPdfDoc.addPage([842, 595]) // A4 landscape

    const fontBold = await certPdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontReg = await certPdfDoc.embedFont(StandardFonts.Helvetica)
    const qrImage = await certPdfDoc.embedPng(qrBuffer)

    // Background
    certPage.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(0.06, 0.09, 0.18) })

    // Header bar
    certPage.drawRectangle({ x: 0, y: 545, width: 842, height: 50, color: rgb(0.25, 0.53, 0.96) })

    // Title
    certPage.drawText('AUTHBLOCK', { x: 320, y: 560, size: 28, font: fontBold, color: rgb(1, 1, 1) })
    certPage.drawText('BLOCKCHAIN VERIFICATION CERTIFICATE', { x: 240, y: 520, size: 14, font: fontBold, color: rgb(0.8, 0.85, 0.9) })
    certPage.drawText('Government of Jharkhand', { x: 330, y: 500, size: 10, font: fontReg, color: rgb(0.6, 0.7, 0.8) })
    certPage.drawText(`Certificate ID: ${certificateData.certificate_id}`, { x: 300, y: 475, size: 9, font: fontReg, color: rgb(0.4, 0.6, 0.9) })

    // Student Information
    let yPos = 440
    certPage.drawText('STUDENT INFORMATION', { x: 60, y: yPos, size: 12, font: fontBold, color: rgb(0.4, 0.6, 0.9) })
    yPos -= 25
    certPage.drawText(`Name: ${certificateData.name}`, { x: 60, y: yPos, size: 11, font: fontReg, color: rgb(0.9, 0.9, 0.9) })
    yPos -= 20
    certPage.drawText(`PRN: ${certificateData.prn_no}`, { x: 60, y: yPos, size: 10, font: fontReg, color: rgb(0.8, 0.8, 0.8) })
    if (certificateData.serial_no) {
      certPage.drawText(`Serial: ${certificateData.serial_no}`, { x: 350, y: yPos, size: 10, font: fontReg, color: rgb(0.8, 0.8, 0.8) })
    }
    yPos -= 20
    certPage.drawText(`Branch: ${certificateData.branch}`, { x: 60, y: yPos, size: 10, font: fontReg, color: rgb(0.8, 0.8, 0.8) })

    // Academic Details
    yPos -= 35
    certPage.drawText('ACADEMIC DETAILS', { x: 60, y: yPos, size: 12, font: fontBold, color: rgb(0.4, 0.6, 0.9) })
    yPos -= 25
    certPage.drawText(`Examination: ${certificateData.examination}`, { x: 60, y: yPos, size: 10, font: fontReg, color: rgb(0.8, 0.8, 0.8) })
    yPos -= 20
    certPage.drawText(`Session: ${certificateData.session}`, { x: 60, y: yPos, size: 10, font: fontReg, color: rgb(0.8, 0.8, 0.8) })
    yPos -= 25
    certPage.drawText(`SGPI: ${certificateData.sgpi}`, { x: 60, y: yPos, size: 14, font: fontBold, color: rgb(0.4, 0.9, 0.6) })
    certPage.drawText(`CGPI: ${certificateData.cgpi}`, { x: 180, y: yPos, size: 14, font: fontBold, color: rgb(0.4, 0.9, 0.6) })
    const remarkColor = certificateData.remarks.toUpperCase().includes('PASS') || certificateData.remarks.toUpperCase().includes('SUCCESS') ? rgb(0.4, 0.9, 0.6) : rgb(0.9, 0.4, 0.4)
    certPage.drawText(`Result: ${certificateData.remarks}`, { x: 300, y: yPos, size: 12, font: fontBold, color: remarkColor })

    // QR Code
    certPage.drawImage(qrImage, { x: 630, y: 280, width: 150, height: 150 })
    certPage.drawText('Scan to Verify', { x: 665, y: 265, size: 9, font: fontReg, color: rgb(0.6, 0.7, 0.8) })

    // Blockchain Info
    yPos = 150
    certPage.drawText('BLOCKCHAIN VERIFICATION', { x: 60, y: yPos, size: 12, font: fontBold, color: rgb(0.4, 0.6, 0.9) })
    yPos -= 25
    certPage.drawText(`Issue Date: ${new Date(certificateData.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { x: 60, y: yPos, size: 9, font: fontReg, color: rgb(0.8, 0.8, 0.8) })
    yPos -= 20
    certPage.drawText(`Data Hash: ${certDataHash.substring(0, 40)}...`, { x: 60, y: yPos, size: 8, font: fontReg, color: rgb(0.4, 0.6, 0.9) })
    yPos -= 15
    certPage.drawText(`TX: ${tx_hash_data.substring(0, 40)}...`, { x: 60, y: yPos, size: 8, font: fontReg, color: rgb(0.6, 0.7, 0.8) })
    yPos -= 20
    certPage.drawText('* Secured on Ethereum Blockchain', { x: 60, y: yPos, size: 9, font: fontBold, color: rgb(0.4, 0.9, 0.6) })

    // Footer
    certPage.drawText(`Verify at: ${baseUrl}/verify`, { x: 320, y: 30, size: 8, font: fontReg, color: rgb(0.5, 0.6, 0.7) })
    certPage.drawRectangle({ x: 0, y: 0, width: 842, height: 8, color: rgb(0.25, 0.53, 0.96) })

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
