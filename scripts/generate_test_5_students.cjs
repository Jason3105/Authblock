const XLSX = require('xlsx')
const path = require('path')

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
  headers.push(`sub_${i}_code`, `sub_${i}_title`, `sub_${i}_credits`, `sub_${i}_grade`, `sub_${i}_gp`)
}

const data = [headers]

const students = [
  { serial_no: 'SN-101', name: 'AARAV SHARMA',   prn: '2023016400970001', remarks: 'SUCCESSFUL', sgpi: '9.10', cgpi: '8.80' },
  { serial_no: 'SN-102', name: 'PRIYA PATEL',    prn: '2023016400970002', remarks: 'SUCCESSFUL', sgpi: '8.60', cgpi: '8.40' },
  { serial_no: 'SN-103', name: 'ROHAN DESHMUKH', prn: '2023016400970003', remarks: 'SUCCESSFUL', sgpi: '7.90', cgpi: '8.10' },
  { serial_no: 'SN-104', name: 'NEHA KULKARNI',  prn: '2023016400970004', remarks: 'SUCCESSFUL', sgpi: '9.40', cgpi: '9.20' },
  { serial_no: 'SN-105', name: 'VIKRAM JOSHI',   prn: '2023016400970005', remarks: 'SUCCESSFUL', sgpi: '8.30', cgpi: '8.15' },
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
    row.push(sub.code, sub.title, sub.credits, credits === 0 ? '--' : rGrade.grade, credits === 0 ? '--' : rGrade.gp)
  }
  data.push(row)
}

const ws = XLSX.utils.aoa_to_sheet(data)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Marksheets')
XLSX.writeFile(wb, path.join(__dirname, '../public/test_5_students.xlsx'))

console.log('✅ test_5_students.xlsx created with 5 student records')
