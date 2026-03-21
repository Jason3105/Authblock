import fs from 'fs'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

async function run() {
  console.log('Generating test PDF...')

  const student = {
    serial_no: 'SN-001',
    student_name: 'ALEXANDER WRIGHT',
    examination: 'Bachelor of Engineering Sem-IV',
    branch: 'Computer Engineering',
    session_name: 'June-2025',
    prn_no: '2023016400968410',
    remarks: 'SUCCESSFUL',
    sgpi: '8.90',
    cgpi: '8.45',
    date: '30-06-2025',
    subjects: [
      { code: 'CSC401', title: 'APPLIED MATHEMATICS-IV', credits: '4', grade: 'O', gp: '10', cpgp: '40' },
      { code: 'CSC402', title: 'ANALYSIS OF ALGORITHMS', credits: '4', grade: 'A', gp: '9', cpgp: '36' },
      { code: 'CSC403', title: 'DATABASE MANAGEMENT', credits: '4', grade: 'A', gp: '9', cpgp: '36' },
      { code: 'CSC404', title: 'OPERATING SYSTEMS', credits: '4', grade: 'O', gp: '10', cpgp: '40' },
      { code: 'CSC405', title: 'MICROPROCESSORS', credits: '4', grade: 'B', gp: '8', cpgp: '32' },
      { code: 'CSL401', title: 'ALGORITHMS LAB', credits: '1', grade: 'O', gp: '10', cpgp: '10' },
      { code: 'CSL402', title: 'DATABASE LAB', credits: '1', grade: 'O', gp: '10', cpgp: '10' },
      { code: 'CSL403', title: 'OS LAB', credits: '1', grade: 'A', gp: '9', cpgp: '9' },
      { code: 'CSL404', title: 'MICROPROCESSOR LAB', credits: '1', grade: 'B', gp: '8', cpgp: '8' },
      { code: 'CSL405', title: 'SKILL BASED LAB', credits: '2', grade: 'A', gp: '9', cpgp: '18' },
      { code: 'CSM401', title: 'MINI PROJECT 1B', credits: '2', grade: 'A', gp: '9', cpgp: '18' },
      { code: 'MC401', title: 'CONSTITUTION OF INDIA', credits: '0', grade: '--', gp: '--', cpgp: '--' },
    ]
  }

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const width = 595.28
  const height = 841.89
  const page = pdfDoc.addPage([width, height])

  const templatePath = path.join(process.cwd(), 'public/FRCRCE_Marksheet_Template.png')
  const imgBytes = fs.readFileSync(templatePath)
  const img = await pdfDoc.embedPng(imgBytes)

  page.drawImage(img, { x: 0, y: 0, width, height })

  const drawPoint = (text: string, x: number, y: number, isBold = true, size = 10) => {
    page.drawText(text || '', { x, y, size, font: isBold ? font : fontRegular, color: rgb(0, 0, 0) })
  }

  // Y values are measured from the bottom of the page (y=0 is bottom)
  drawPoint(student.serial_no, 440, 685, true, 11)      // Serial No.
  drawPoint(student.student_name, 150, 647, true, 11)   // Name
  drawPoint(student.examination, 150, 630, true, 11)    // Examination
  drawPoint(student.branch, 150, 612, true, 11)         // Branch
  drawPoint(student.session_name, 150, 595, true, 11)   // Session
  drawPoint(student.prn_no, 150, 580, true, 11)         // PRN

  let currentY = 485
  for (const sub of student.subjects || []) {
    drawPoint(sub.code, 90, currentY, false, 9)
    drawPoint(sub.title, 145, currentY, true, 9)

    // Columns:
    drawPoint(sub.credits, 368, currentY, true, 9)
    drawPoint(sub.grade, 398, currentY, true, 9)
    drawPoint(sub.gp, 430, currentY, true, 9)

    const cp = sub.grade === '--' ? '0' : sub.credits
    drawPoint(cp === '--' ? '--' : cp, 470, currentY, true, 9)

    drawPoint(sub.cpgp, 510, currentY, true, 9)

    currentY -= 20
  }

  const totalCredits = (student.subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.credits === '--' ? '0' : (s.credits || '0')), 0)
  const totalGp = (student.subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.gp === '--' ? '0' : (s.gp || '0')), 0)
  const totalCp = (student.subjects || []).reduce((acc: number, s: any) => acc + (s.grade === '--' || s.credits === '--' ? 0 : parseInt(s.credits || '0')), 0)
  const totalCpGp = (student.subjects || []).reduce((acc: number, s: any) => acc + parseInt(s.cpgp === '--' ? '0' : (s.cpgp || '0')), 0)

  drawPoint(totalCredits.toString(), 365, 140, true, 10) // Credits
  drawPoint(totalGp.toString(), 395, 140, true, 10)      // GP
  drawPoint(totalCp.toString(), 470, 140, true, 10)      // CP
  drawPoint(totalCpGp.toString(), 507, 140, true, 10)    // CP x GP

  drawPoint(student.remarks, 130, 118, true, 10) // Remarks
  drawPoint(student.sgpi, 277, 118, true, 10)   // SGPI
  drawPoint(student.cgpi, 335, 118, true, 10)   // CGPI
  drawPoint(student.date, 130, 100, true, 10)   // Date

  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(path.join(process.cwd(), 'public/test_output.pdf'), pdfBytes)
  console.log('✅ saved to public/test_output.pdf')
}

run()
