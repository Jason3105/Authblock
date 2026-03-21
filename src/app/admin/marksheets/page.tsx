'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// @ts-ignore
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { 
  FileText, UploadCloud, FileSignature, AlertCircle, Loader2, CheckCircle, Search, Plus, Trash2, History, Download 
} from 'lucide-react'
import AdminShell, { type AdminRecord } from '@/components/admin/AdminShell'
import ProcessingTerminal, { type TerminalLog } from '@/components/admin/ProcessingTerminal'

interface SubjectTarget {
  code: string
  title: string
  credits: string
  grade: string
  gp: string
  cpgp: string
}

function MarksheetsContent({ currentUser }: { currentUser: AdminRecord }) {
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk' | 'history'>('manual')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successLink, setSuccessLink] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Terminal processing state
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([])
  const [terminalActive, setTerminalActive] = useState(false)
  const [terminalComplete, setTerminalComplete] = useState(false)
  const [terminalCurrentIndex, setTerminalCurrentIndex] = useState(0)
  const [terminalTotalCount, setTerminalTotalCount] = useState(0)
  const [terminalSuccessCount, setTerminalSuccessCount] = useState(0)
  const [terminalErrorCount, setTerminalErrorCount] = useState(0)

  const addLog = useCallback((message: string, status: TerminalLog['status']) => {
    setTerminalLogs(prev => [...prev, { id: Date.now() + Math.random(), message, status, timestamp: new Date() }])
  }, [])

  const resetTerminal = useCallback(() => {
    setTerminalActive(false)
    setTerminalComplete(false)
    setTerminalLogs([])
    setTerminalCurrentIndex(0)
    setTerminalTotalCount(0)
    setTerminalSuccessCount(0)
    setTerminalErrorCount(0)
  }, [])

  // Manual Form State
  const [formData, setFormData] = useState({
    serial_no: '', student_name: '', prn_no: '', examination: '', branch: '', session_name: '',
    sgpi: '', cgpi: '', remarks: '', date: '',
    subjects: [{ code: '', title: '', credits: '', grade: '', gp: '', cpgp: '' }]
  })
  
  const addSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, { code: '', title: '', credits: '', grade: '', gp: '', cpgp: '' }]
    }))
  }
  const removeSubject = (i: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, idx) => idx !== i)
    }))
  }

  // --- Submit handler for manual issue ---
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccessLink('')

    try {
      // Auto compute manual entry CP x GP:
      const processedSubjects = formData.subjects.map(s => {
         let calc_cpgp = ''
         if (s.grade === '--' || s.credits === '--') calc_cpgp = '--'
         else if (s.credits && s.gp && !isNaN(parseInt(s.credits)) && !isNaN(parseInt(s.gp))) {
           calc_cpgp = (parseInt(s.credits) * parseInt(s.gp)).toString()
         }
         return { ...s, cpgp: calc_cpgp }
      })

      const payload = {
        ...formData,
        subjects: processedSubjects,
        issued_by: currentUser.id
      }

      const res = await fetch('/api/admin/marksheets/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to issue marksheet')

      setSuccessLink(data.marksheet?.url || data.certificate?.url || '')
      // Reset form on success
      setFormData({
        serial_no: '',
        student_name: '',
        examination: '',
        branch: '',
        session_name: '',
        prn_no: '',
        sgpi: '',
        cgpi: '',
        remarks: '',
        date: '',
        subjects: [{ code: '', title: '', credits: '', grade: '', gp: '', cpgp: '' }]
      })
      fetchHistory() // Refresh history

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Bulk CSV/XLSX ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsSubmitting(true)
    setError('')
    setSuccessLink('')

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    
    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => processBulkRows(results.data),
        error: (err: any) => {
          setError('Failed to parse CSV file: ' + err.message)
          setIsSubmitting(false)
        }
      })
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = XLSX.read(bstr, { type: 'binary' })
          const wsname = wb.SheetNames[0]
          const ws = wb.Sheets[wsname]
          const data = XLSX.utils.sheet_to_json(ws)
          await processBulkRows(data)
        } catch (err: any) {
          setError('Failed to parse Excel file: ' + err.message)
          setIsSubmitting(false)
        }
      }
      reader.readAsBinaryString(file)
    } else {
      setError('Please upload a .csv or .xlsx file')
      setIsSubmitting(false)
    }
  }

  async function processBulkRows(rows: any[]) {
    try {
      if (rows.length === 0) throw new Error('File is empty')

      // Filter out fully empty rows first to get an accurate count
      const validRows = rows.filter(row => {
        const sName = row.student_name?.toString().trim()
        const sPrn = row.prn_no?.toString().trim()
        return sName || sPrn
      })

      if (validRows.length === 0) throw new Error('No valid student rows found in the file.')

      // Initialize terminal state
      setTerminalActive(true)
      setTerminalComplete(false)
      setTerminalLogs([])
      setTerminalCurrentIndex(0)
      setTerminalTotalCount(validRows.length)
      setTerminalSuccessCount(0)
      setTerminalErrorCount(0)

      // Small delay so the terminal renders before we start processing
      await new Promise(r => setTimeout(r, 300))

      addLog(`Starting bulk processing of ${validRows.length} student record${validRows.length !== 1 ? 's' : ''}…`, 'info')
      addLog('Connecting to AuthBlock API…', 'info')
      await new Promise(r => setTimeout(r, 400))
      addLog('Connection established. Beginning certificate generation.', 'info')

      let successCount = 0
      let errorCount = 0

      for (let idx = 0; idx < validRows.length; idx++) {
        const row = validRows[idx]
        const sName = row.student_name?.toString().trim()
        const sPrn = row.prn_no?.toString().trim()
        const rowLabel = `[${idx + 1}/${validRows.length}]`

        setTerminalCurrentIndex(idx + 1)
        addLog(`${rowLabel} Generating certificate for ${sName || 'Unknown'} (PRN: ${sPrn || 'N/A'})…`, 'processing')
          
        try {
          const subjects = []
          for (let i = 1; i <= 20; i++) {
            if (row[`sub_${i}_code`] || row[`sub_${i}_title`]) {
              const credits = row[`sub_${i}_credits`]?.toString() || ''
              const gp = row[`sub_${i}_gp`]?.toString() || ''
              const grade = row[`sub_${i}_grade`] || ''
              
              let cpgpObj = ''
              if (grade === '--' || credits === '--') cpgpObj = '--'
              else if (!isNaN(parseInt(credits)) && !isNaN(parseInt(gp))) {
                cpgpObj = (parseInt(credits) * parseInt(gp)).toString()
              }

              subjects.push({
                code: row[`sub_${i}_code`] || '',
                title: row[`sub_${i}_title`] || '',
                credits,
                grade,
                gp,
                cpgp: cpgpObj
              })
            }
          }

          const payload = {
            serial_no: row.serial_no || '',
            student_name: sName,
            prn_no: sPrn,
            examination: row.examination || 'Bachelor of Engineering Sem-IV',
            branch: row.branch || 'Computer Engineering',
            session_name: row.session_name || 'June-2025',
            sgpi: row.sgpi || '',
            cgpi: row.cgpi || '',
            remarks: row.remarks || 'SUCCESSFUL',
            date: row.date || '30-06-2025',
            subjects: subjects,
            issued_by: currentUser.id
          }

          const res = await fetch('/api/admin/marksheets/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (res.ok) {
            successCount++
            setTerminalSuccessCount(successCount)
            addLog(`${rowLabel} ✓ Certificate issued for ${sName}`, 'success')
          } else {
            errorCount++
            setTerminalErrorCount(errorCount)
            const errData = await res.json().catch(() => ({}))
            addLog(`${rowLabel} ✗ Failed for ${sName} — ${errData.error || 'Server error'}`, 'error')
          }
        } catch (rowErr: any) {
          errorCount++
          setTerminalErrorCount(errorCount)
          addLog(`${rowLabel} ✗ Error for ${sName || 'unknown'} — ${rowErr.message || 'Unknown error'}`, 'error')
        }
      }

      // Mark complete
      setTerminalCurrentIndex(validRows.length)
      setTerminalComplete(true)

      if (successCount > 0) {
        addLog(`\nBulk processing complete: ${successCount} succeeded, ${errorCount} failed.`, 'info')
        setSuccessLink(`Successfully issued ${successCount} certificates! View them all in the History tab.`)
        fetchHistory() // Refresh history
      } else {
        addLog('No valid certificates were issued.', 'error')
        throw new Error('No valid certificates were issued.')
      }
    } catch (err: any) {
      setError(err.message)
      if (!terminalActive) {
        // Error happened before terminal was set up (e.g. empty file)
      } else {
        setTerminalComplete(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function downloadTemplate() {
    const headers = ['serial_no', 'student_name', 'prn_no', 'examination', 'branch', 'session_name', 'sgpi', 'cgpi', 'remarks', 'date']
    // Add columns for 12 subjects
    for (let i = 1; i <= 12; i++) {
      headers.push(`sub_${i}_code`, `sub_${i}_title`, `sub_${i}_credits`, `sub_${i}_grade`, `sub_${i}_gp`)
    }
    const row = ['SN-1234', 'JOHN DOE', '20230164000000', 'BE Sem-IV', 'Computer Engineering', 'June-2025', '9.5', '9.3', 'SUCCESSFUL', '30-06-2025']
    for (let i = 1; i <= 12; i++) {
       row.push(`CSC${400+i}`, `SUBJECT ${i}`, '4', 'O', '10')
    }
    const ws_data = [headers, row]
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'Certificate_Upload_Template.xlsx')
  }

  // --- History ---
  useEffect(() => {
    if (activeTab === 'history') fetchHistory()
  }, [activeTab])

  async function fetchHistory() {
    try {
      setLoadingHistory(true)
      const res = await fetch(`/api/admin/marksheets?t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.marksheets) {
        setHistory(data.marksheets)
      } else {
        setError(data.error || 'Failed to load history')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load history')
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full">

      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Issue Certificates
          </h1>
          <p className="text-base text-slate-500 mt-2">
            Generate blockchain-verified certificates and store them securely.
          </p>
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-6 py-4 font-bold transition-all text-sm uppercase tracking-wide border-b-2 ${
            activeTab === 'manual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileSignature className="w-4 h-4" /> Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-6 py-4 font-bold transition-all text-sm uppercase tracking-wide border-b-2 ${
            activeTab === 'bulk' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <UploadCloud className="w-4 h-4" /> Bulk CSV Upload
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-4 font-bold transition-all text-sm uppercase tracking-wide border-b-2 ${
            activeTab === 'history' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          {successLink && (
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <div>
                  <h4 className="font-bold">Success!</h4>
                  <p className="text-sm opacity-80">{successLink.includes('http') ? 'Saved to Supabase storage and recorded in database.' : successLink}</p>
                </div>
              </div>
              {successLink.includes('http') && (
                <a href={successLink} target="_blank" rel="noreferrer" className="btn-primary flex-shrink-0 !bg-emerald-600 hover:!bg-emerald-700 border-none shadow-emerald-500/30">
                  View PDF Marksheet
                </a>
              )}
            </motion.div>
          )}

          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="glass-card p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Left Col: Basics */}
                <div className="space-y-5">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Student Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Marksheet No.</label>
                      <input type="text" required className="input font-medium font-mono text-purple-600" 
                        value={formData.serial_no} onChange={e => setFormData({...formData, serial_no: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">PRN No.</label>
                      <input type="text" required className="input font-medium font-mono"
                        value={formData.prn_no} onChange={e => setFormData({...formData, prn_no: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Student Full Name</label>
                    <input type="text" required className="input font-medium" 
                      value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">SGPI</label>
                      <input type="text" required className="input font-medium"
                        value={formData.sgpi} onChange={e => setFormData({...formData, sgpi: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">CGPI</label>
                      <input type="text" required className="input font-medium"
                        value={formData.cgpi} onChange={e => setFormData({...formData, cgpi: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Right Col: Metadata */}
                <div className="space-y-5">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Course Information</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Examination</label>
                    <input type="text" required className="input font-medium bg-slate-50"
                      value={formData.examination} onChange={e => setFormData({...formData, examination: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Branch</label>
                    <input type="text" required className="input font-medium bg-slate-50"
                      value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Session</label>
                    <input type="text" required className="input font-medium bg-slate-50"
                      value={formData.session_name} onChange={e => setFormData({...formData, session_name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Remarks</label>
                      <input type="text" required className="input font-medium bg-slate-50"
                        value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
                      <input type="text" required className="input font-medium bg-slate-50"
                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table section */}
              <div className="mb-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Subjects Matrix</h3>
                  <button type="button" onClick={addSubject} className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.subjects.map((sub, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <div className="grid grid-cols-10 w-full gap-3">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Code</label>
                          <input type="text" placeholder="Code" className="input font-medium text-xs w-full" value={sub.code} onChange={e => {
                            const newSubjects = [...formData.subjects]
                            newSubjects[idx] = { ...newSubjects[idx], code: e.target.value }
                            setFormData({...formData, subjects: newSubjects})
                          }} required />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Title</label>
                          <input type="text" placeholder="Title" className="input font-medium text-xs w-full" value={sub.title} onChange={e => {
                            const newSubjects = [...formData.subjects]
                            newSubjects[idx] = { ...newSubjects[idx], title: e.target.value }
                            setFormData({...formData, subjects: newSubjects})
                          }} required />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cr.</label>
                          <input type="text" placeholder="Cr." className="input font-medium text-xs w-full" value={sub.credits} onChange={e => {
                            const newSubjects = [...formData.subjects]
                            newSubjects[idx] = { ...newSubjects[idx], credits: e.target.value }
                            setFormData({...formData, subjects: newSubjects})
                          }} required />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gr.</label>
                          <input type="text" placeholder="Gr." className="input font-medium text-xs w-full" value={sub.grade} onChange={e => {
                            const newSubjects = [...formData.subjects]
                            newSubjects[idx] = { ...newSubjects[idx], grade: e.target.value }
                            setFormData({...formData, subjects: newSubjects})
                          }} required />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GP</label>
                          <input type="text" placeholder="GP" className="input font-medium text-xs w-full" value={sub.gp} onChange={e => {
                            const newSubjects = [...formData.subjects]
                            newSubjects[idx] = { ...newSubjects[idx], gp: e.target.value }
                            setFormData({...formData, subjects: newSubjects})
                          }} required />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeSubject(idx)} disabled={formData.subjects.length === 1} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <button type="submit" disabled={isSubmitting} className="btn-primary min-w-[200px] flex items-center justify-center gap-2 py-3.5 shadow-blue-500/30">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSignature className="w-5 h-5" />}
                  {isSubmitting ? 'Generating PDF...' : 'Issue Marksheet'}
                </button>
              </div>
            </form>
          ) : activeTab === 'bulk' ? (
            terminalActive ? (
              <ProcessingTerminal
                logs={terminalLogs}
                currentIndex={terminalCurrentIndex}
                totalCount={terminalTotalCount}
                isComplete={terminalComplete}
                successCount={terminalSuccessCount}
                errorCount={terminalErrorCount}
                onReset={resetTerminal}
              />
            ) : (
            <div className="glass-card p-12 text-center rounded-3xl border-dashed">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Bulk Data</h2>
              <p className="text-slate-500 max-w-md mx-auto mb-8">
                Upload a verified .CSV or .XLSX containing student data to issue multiple marksheets concurrently.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <label className="bg-[#8253FF] hover:bg-[#7042EF] text-white shadow-[0_4px_20px_-4px_rgba(130,83,255,0.4)] transition-all font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2 py-3.5 px-8 min-w-[200px]">
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <><UploadCloud className="w-5 h-5" /> Select File
                    <input type="file" accept=".csv,.xlsx,.xls" disabled={isSubmitting} onChange={(e) => { handleFileUpload(e); e.target.value = ''; }} className="hidden" /></>
                  )}
                </label>
                <button type="button" onClick={downloadTemplate} className="bg-[#1366E3] hover:bg-[#1056C2] text-white shadow-[0_4px_20px_-4px_rgba(19,102,227,0.4)] transition-all font-semibold rounded-xl flex items-center justify-center gap-2 py-3.5 px-6 min-w-[200px]">
                  <Download className="w-5 h-5" /> Download Template
                </button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100 text-sm font-medium text-slate-400">
                Expected headers: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">serial_no, student_name, prn_no, examination, ...</code> and <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">sub_1_code, sub_1_title, sub_1_credits</code>
              </div>
            </div>
            )
          ) : activeTab === 'history' ? (
            <div className="glass-card overflow-hidden">
               <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <h2 className="font-bold text-slate-800">Issued Marksheets</h2>
                 <div className="flex gap-2">
                   <div className="relative">
                     <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                     <input
                       type="text"
                       placeholder="Search PRN, Name or Serial..."
                       value={searchQuery}
                       onChange={(e) => {
                         setSearchQuery(e.target.value)
                         if (e.target.value) fetchHistory()
                       }}
                       className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full sm:w-[280px]"
                     />
                   </div>
                   <button
                     onClick={fetchHistory}
                     disabled={loadingHistory}
                     className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50"
                   >
                     {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                   </button>
                 </div>
               </div>

               <div className="overflow-x-auto min-h-[400px]">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-white border-b border-slate-200">
                     <tr>
                       <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Serial No.</th>
                       <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Student & PRN</th>
                       <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Performance</th>
                       <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Date Issued</th>
                       <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 bg-white">
                     {loadingHistory ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" /> Loading marksheets...</td></tr>
                     ) : history.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500 border border-dashed rounded-xl m-4">No marksheets have been issued yet.</td></tr>
                     ) : (
                       history.filter(m =>
                         m.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.prn_no?.includes(searchQuery) ||
                         m.serial_no?.toLowerCase().includes(searchQuery.toLowerCase())
                       ).map(m => (
                         <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                             <div className="font-mono text-xs text-blue-600 font-bold">{m.serial_no || 'N/A'}</div>
                             <div className="text-[10px] text-slate-400 mt-0.5">
                               {m.branch || 'N/A'}
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="font-bold text-slate-900">{m.student_name}</div>
                             <div className="font-mono text-xs text-slate-500 mt-0.5">{m.prn_no}</div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="flex gap-2 text-xs">
                               <span className="font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">SGPI: {m.sgpi || '-'}</span>
                               <span className="font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">CGPI: {m.cgpi || '-'}</span>
                             </div>
                             <div className="text-[10px] text-slate-500 mt-1">{m.remarks || m.examination || ''}</div>
                           </td>
                           <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                             {m.issued_at ? new Date(m.issued_at).toLocaleDateString('en-IN', {
                               day: 'numeric',
                               month: 'short',
                               year: 'numeric'
                             }) : 'N/A'}
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex items-center gap-2 justify-end flex-wrap">
                               {m.supabase_pdf_url && (
                                 <a
                                   href={m.supabase_pdf_url}
                                   target="_blank"
                                   rel="noreferrer"
                                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors border border-blue-100 hover:border-blue-600"
                                 >
                                   <FileText className="w-3.5 h-3.5" /> Marksheet
                                 </a>
                               )}
                               {m.certificate_url && (
                                 <a
                                   href={m.certificate_url}
                                   target="_blank"
                                   rel="noreferrer"
                                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-colors border border-purple-100 hover:border-purple-600"
                                 >
                                   <Download className="w-3.5 h-3.5" /> Certificate
                                 </a>
                               )}
                               {!m.supabase_pdf_url && !m.certificate_url && (
                                 <span className="text-xs text-slate-400">No PDFs</span>
                               )}
                             </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}


export default function MarksheetsPage() {
  return (
    <AdminShell>
      {(admin) => <MarksheetsContent currentUser={admin} />}
    </AdminShell>
  )
}
