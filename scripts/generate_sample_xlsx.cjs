const XLSX = require('xlsx')

// 12 Base Subjects
const subjectTemplates = [
  { code: 'CSC401', title: 'APPLIED MATHEMATICS-IV', credits: '4' },
  { code: 'CSC402', title: 'ANALYSIS OF ALGORITHMS', credits: '4' },
  { code: 'CSC403', title: 'DATABASE MANAGEMENT', credits: '4' },
  { code: 'CSC404', title: 'OPERATING SYSTEMS', credits: '4' },
  { code: 'CSC405', title: 'MICROPROCESSORS', credits: '4' },
  { code: 'CSL401', title: 'ALGORITHMS LAB', credits: '1' },
  { code: 'CSL402', title: 'DATABASE LAB', credits: '1' },
  { code: 'CSL403', title: 'OS LAB', credits: '1' },
  { code: 'CSL404', title: 'MICROPROCESSOR LAB', credits: '1' },
  { code: 'CSL405', title: 'SKILL BASED LAB', credits: '2' },
  { code: 'CSM401', title: 'MINI PROJECT 1B', credits: '2' },
  { code: 'MC401',  title: 'CONSTITUTION OF INDIA', credits: '0' }
]

// Generate Headers
const headers = ['serial_no', 'student_name', 'prn_no', 'examination', 'branch', 'session_name', 'sgpi', 'cgpi', 'remarks', 'date']
for (let i = 1; i <= 12; i++) {
  headers.push(`sub_${i}_code`, `sub_${i}_title`, `sub_${i}_credits`, `sub_${i}_grade`, `sub_${i}_gp`, `sub_${i}_cpgp`)
}

const data = [headers]

const students = [
  { serial_no: 'SN-001', name: 'ALEXANDER WRIGHT', prn: '2023016400968410', remarks: 'SUCCESSFUL', sgpi: '8.90', cgpi: '8.45' },
  { serial_no: 'SN-002', name: 'SAMANTHA LEO', prn: '2023016400968411', remarks: 'SUCCESSFUL', sgpi: '9.20', cgpi: '9.10' },
  { serial_no: 'SN-003', name: 'MARCUS CHEN', prn: '2023016400968412', remarks: 'SUCCESSFUL', sgpi: '7.80', cgpi: '8.00' },
  { serial_no: 'SN-004', name: 'SARAH JENKINS', prn: '2023016400968413', remarks: 'SUCCESSFUL', sgpi: '8.50', cgpi: '8.20' },
  { serial_no: 'SN-005', name: 'MICHAEL BOYD', prn: '2023016400968414', remarks: 'SUCCESSFUL', sgpi: '9.50', cgpi: '9.30' },
  { serial_no: 'SN-006', name: 'EMILY STONE', prn: '2023016400968415', remarks: 'SUCCESSFUL', sgpi: '8.10', cgpi: '8.05' },
  { serial_no: 'SN-007', name: 'JOSHUA KIM', prn: '2023016400968416', remarks: 'SUCCESSFUL', sgpi: '9.80', cgpi: '9.60' },
  { serial_no: 'SN-008', name: 'OLIVIA MARTINEZ', prn: '2023016400968417', remarks: 'SUCCESSFUL', sgpi: '7.50', cgpi: '7.90' },
  { serial_no: 'SN-009', name: 'DANIEL ROE', prn: '2023016400968418', remarks: 'SUCCESSFUL', sgpi: '8.75', cgpi: '8.50' },
  { serial_no: 'SN-010', name: 'JESSICA WANG', prn: '2023016400968419', remarks: 'SUCCESSFUL', sgpi: '9.05', cgpi: '8.85' }
]

const grades = [
  { grade: 'O', gp: '10' },
  { grade: 'A', gp: '9' },
  { grade: 'B', gp: '8' },
  { grade: 'C', gp: '7' }
]

for (const student of students) {
  const row = [student.serial_no, student.name, student.prn, 'Bachelor of Engineering Sem-IV', 'Computer Engineering', 'June-2025', student.sgpi, student.cgpi, student.remarks, '30-06-2025']
  for (const sub of subjectTemplates) {
    const rGrade = grades[Math.floor(Math.random() * grades.length)]
    const credits = parseInt(sub.credits)
    const cpgp = credits * parseInt(rGrade.gp)
    
    row.push(sub.code, sub.title, sub.credits, credits === 0 ? '--' : rGrade.grade, credits === 0 ? '--' : rGrade.gp, credits === 0 ? '--' : cpgp.toString())
  }
  data.push(row)
}

const ws = XLSX.utils.aoa_to_sheet(data)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Marksheets')
const path = require('path')
XLSX.writeFile(wb, path.join(__dirname, '../public/sample_students.xlsx'))

console.log('✅ sample_students.xlsx created with remarks and serial no')
