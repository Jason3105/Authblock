import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { supabase } from '@/lib/supabase'
import { sql } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      serial_no, student_name, prn_no, examination, branch, session_name, sgpi, cgpi, date, remarks, subjects, issued_by
    } = body

    if (!student_name || !prn_no || !serial_no) {
      return NextResponse.json({ error: 'Missing required student data' }, { status: 400 })
    }

    // 1. Generate PDF
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
    // Note: PDF coordinates start from bottom-left (y=0 is the bottom)
    const drawPoint = (text: string, x: number, y: number, isBold = true, size = 10) => {
      page.drawText(text || '', { x, y, size, font: isBold ? font : fontRegular, color: rgb(0,0,0) })
    }

    // Y values are measured from the bottom of the page (y=0 is bottom)
    drawPoint(serial_no, 440, 685, true, 11)      // Serial No.
    drawPoint(student_name, 150, 647, true, 11)   // Name
    drawPoint(examination, 150, 630, true, 11)    // Examination
    drawPoint(branch, 150, 612, true, 11)         // Branch
    drawPoint(session_name, 150, 595, true, 11)   // Session
    drawPoint(prn_no, 150, 580, true, 11)         // PRN

    // Subjects block starts around y=485 and goes down
    let currentY = 485
    for (const sub of subjects || []) {
      drawPoint(sub.code, 90, currentY, false, 9)
      drawPoint(sub.title, 145, currentY, true, 9)
      
      // 5 Columns on the right:
      drawPoint(sub.credits, 368, currentY, true, 9) // Credits
      drawPoint(sub.grade, 398, currentY, true, 9)   // Grade
      drawPoint(sub.gp, 430, currentY, true, 9)      // Grade Points (GP)
      
      // Credit Points (CP) -> usually same as credits unless failed.
      const cp = sub.grade === 'F' ? '0' : sub.credits
      drawPoint(cp === '--' ? '--' : cp, 470, currentY, true, 9) 
      
      drawPoint(sub.cpgp, 510, currentY, true, 9)    // CP x GP
      
      currentY -= 20
    }

    // Totals logic 
    const totalCredits = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.credits === '--' ? '0' : (s.credits || '0')), 0)
    const totalGp = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.gp === '--' ? '0' : (s.gp || '0')), 0)
    const totalCp = (subjects || []).reduce((acc: number, s: any) => acc + (s.grade === 'F' || s.credits === '--' ? 0 : parseInt(s.credits || '0')), 0)
    const totalCpGp = (subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.cpgp === '--' ? '0' : (s.cpgp || '0')), 0)
    
    drawPoint(totalCredits.toString(), 365, 140, true, 10)
    drawPoint(totalGp.toString(), 395, 140, true, 10)
    drawPoint(totalCp.toString(), 470, 140, true, 10)
    drawPoint(totalCpGp.toString(), 507, 140, true, 10)

    drawPoint(remarks || 'SUCCESSFUL', 130, 118, true, 10) // Remarks
    drawPoint(sgpi, 277, 118, true, 10)   // SGPI
    drawPoint(cgpi, 335, 118, true, 10)   // CGPI
    drawPoint(date, 130, 100, true, 10)   // Date

    const pdfBytes = await pdfDoc.save()
    const fileName = `${prn_no}_${Date.now()}.pdf`

    // 2. Upload to Supabase Storage
    // The bucket must be named "marksheets" and be configured to be PUBLIC and allow inserts
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('FRCRCE_Marksheets')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      // If bucket doesn't exist, we might get a 404 or 403
      throw new Error(`Storage upload failed: ${uploadError.message}. Make sure the Supabase "FRCRCE_Marksheets" bucket exists and allows public uploads.`)
    }

    // 2.3 Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('FRCRCE_Marksheets')
      .getPublicUrl(fileName)
      
    const pdfUrl = publicUrlData.publicUrl

    // 3. Save to NeonDB Postgres
    const subjectsJson = JSON.stringify(subjects || [])
    
    // @ts-ignore
    const db = sql()
    const result = await db`
      INSERT INTO marksheets (
        serial_no, student_name, prn_no, examination, branch, session_name, sgpi, cgpi, remarks, subjects, supabase_pdf_url, issued_by
      ) VALUES (
        ${serial_no}, ${student_name}, ${prn_no}, ${examination}, ${branch}, ${session_name}, ${sgpi}, ${cgpi}, ${remarks}, ${subjectsJson}, ${pdfUrl}, ${issued_by}
      )
      RETURNING id
    `
    
    // @ts-ignore
    const newId = result && result[0] ? result[0].id : null

    return NextResponse.json({ success: true, url: pdfUrl, id: newId })
  } catch (err: any) {
    console.error('[issue-marksheet]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
