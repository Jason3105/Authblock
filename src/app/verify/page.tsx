'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, XCircle, Loader2, ArrowRight, ShieldCheck, Edit3, Scan, FileSearch, Sparkles, RefreshCcw, Search } from 'lucide-react'
import { Navbar, Footer } from '@/components/landing'
import CertificateVerification from '@/components/CertificateVerification'
import Script from 'next/script'

// Separate component to handle search params
function VerifyContent() {
  const searchParams = useSearchParams()

  // Check if this is a certificate verification from QR code
  const certId = searchParams.get('cert')
  const hash = searchParams.get('hash')
  const tx = searchParams.get('tx')

  // If certificate parameters are present, show certificate verification
  if (certId) {
    return <CertificateVerification certId={certId} hash={hash || undefined} tx={tx || undefined} />
  }

  // Otherwise show the original document verification interface
  return <DocumentVerification />
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Verification</h2>
        <p className="text-slate-600">Please wait...</p>
      </div>
    </div>
  )
}

// Original document verification component
function DocumentVerification() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processStep, setProcessStep] = useState('')
  const [result, setResult] = useState<any>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [dragActive, setDragActive] = useState(false)
  // Stores cert_id when an Authblock certificate has been successfully verified
  const [verifiedCertId, setVerifiedCertId] = useState<string | null>(null)

  async function sha256(buffer: ArrayBuffer | Uint8Array) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as BufferSource)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Builds the marksheet coordinate hash EXACTLY as done during issuance:
   *   - Fields: "Full Name", "PRN Number", "Serial No.", "Examination",
   *             "Branch", "Session", "Remarks", "SGPI", "CGPI"
   *   - JSON: array of {field, value} sorted ascending by field name
   *   - Hash: SHA-256 of that JSON string, prefixed with "0x"
   */
  async function buildMarksheetCoordinateHash(fields: {
    name: string; prn_no: string; serial_no: string; examination: string;
    branch: string; session: string; sgpi: string; cgpi: string; remarks: string
  }): Promise<string> {
    const mapping = [
      { field: 'Branch', value: fields.branch || '' },
      { field: 'CGPI', value: fields.cgpi || '' },
      { field: 'Examination', value: fields.examination || '' },
      { field: 'Full Name', value: fields.name || '' },
      { field: 'PRN Number', value: fields.prn_no || '' },
      { field: 'Remarks', value: fields.remarks || '' },
      { field: 'SGPI', value: fields.sgpi || '' },
      { field: 'Serial No.', value: fields.serial_no || '' },
      { field: 'Session', value: fields.session || '' },
    ].sort((a, b) => a.field.localeCompare(b.field))

    const json = JSON.stringify(mapping)
    console.log('[Verify] Marksheet coordinate hash input:', json)
    const hash = await sha256(new TextEncoder().encode(json))
    return '0x' + hash
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      resetState()
      setFile(e.dataTransfer.files[0])
    }
  }

  const resetState = () => {
    setExtractedData(null)
    setResult(null)
    setProcessStep('')
    setFile(null)
    setVerifiedCertId(null)
  }

  // Standard A4 marksheet aspect ratio (width:height)
  const MARKSHEET_ASPECT_RATIO = 595 / 841 // ~0.707

  // Detect and crop document from scanned image
  const cropToDocument = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = sourceCanvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const data = imageData.data
    const width = sourceCanvas.width
    const height = sourceCanvas.height

    // Convert to grayscale and find document edges
    const gray: number[] = []
    for (let i = 0; i < data.length; i += 4) {
      gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    }

    // Calculate threshold using Otsu's method (simplified)
    let sum = 0, sumB = 0, wB = 0, wF = 0, maxVar = 0, threshold = 128
    const histogram = new Array(256).fill(0)

    for (const g of gray) histogram[Math.floor(g)]++
    for (let i = 0; i < 256; i++) sum += i * histogram[i]

    for (let i = 0; i < 256; i++) {
      wB += histogram[i]
      if (wB === 0) continue
      wF = gray.length - wB
      if (wF === 0) break
      sumB += i * histogram[i]
      const mB = sumB / wB
      const mF = (sum - sumB) / wF
      const variance = wB * wF * (mB - mF) * (mB - mF)
      if (variance > maxVar) {
        maxVar = variance
        threshold = i
      }
    }

    // Find bounding box of document (white/light region)
    // Use a tighter threshold: require pixels to be clearly brighter than the Otsu threshold
    let minX = width, maxX = 0, minY = height, maxY = 0
    const margin = Math.floor(Math.min(width, height) * 0.02) // 2% margin
    const edgeThreshold = Math.min(threshold + 20, 220) // Tighter: only clearly bright doc pixels

    // Analyze rows to find document bounds more robustly than single pixels
    for (let y = margin; y < height - margin; y++) {
      let brightCount = 0
      for (let x = margin; x < width - margin; x++) {
        if (gray[y * width + x] > edgeThreshold) brightCount++
      }
      // If at least 25% of the row is bright document pixels
      if (brightCount > (width * 0.25)) {
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }

    // Analyze columns
    for (let x = margin; x < width - margin; x++) {
      let brightCount = 0
      for (let y = margin; y < height - margin; y++) {
        if (gray[y * width + x] > edgeThreshold) brightCount++
      }
      // If at least 25% of the column is bright document pixels
      if (brightCount > (height * 0.25)) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }

    if (minX >= maxX || minY >= maxY) {
      // Fallback if no robust edges found
      minX = margin; maxX = width - margin;
      minY = margin; maxY = height - margin;
    }

    // Fallback: if detected region covers >92% of the image, detection failed
    // (happens when doc is white-on-white or fills the entire camera frame)
    // Use full image with a small inset instead
    const coverageX = maxX - minX
    const coverageY = maxY - minY
    if (coverageX > width * 0.92 && coverageY > height * 0.92) {
      const inset = Math.floor(Math.min(width, height) * 0.015)
      minX = inset; minY = inset
      maxX = width - inset; maxY = height - inset
    }

    // Add small padding
    const padding = Math.floor(Math.min(width, height) * 0.01)
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(width, maxX + padding)
    maxY = Math.min(height, maxY + padding)

    // Calculate detected dimensions
    let cropWidth = maxX - minX
    let cropHeight = maxY - minY

    // Ensure we don't have invalid dimensions
    if (cropWidth <= 0 || cropHeight <= 0) {
      minX = 0; minY = 0; cropWidth = width; cropHeight = height;
    }

    // Create cropped canvas at high resolution for OCR, preserving aspect ratio!
    // Stretching the image ruins OCR accuracy for rotated/skewed photos.
    const TARGET_WIDTH = 1785 // ~300 DPI width
    const scale = TARGET_WIDTH / cropWidth
    const TARGET_HEIGHT = Math.round(cropHeight * scale)

    const croppedCanvas = document.createElement('canvas')
    croppedCanvas.width = TARGET_WIDTH
    croppedCanvas.height = TARGET_HEIGHT
    const croppedCtx = croppedCanvas.getContext('2d')!

    // Draw cropped and scaled image proportionally
    croppedCtx.fillStyle = '#FFFFFF'
    croppedCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
    croppedCtx.drawImage(
      sourceCanvas,
      minX, minY, cropWidth, cropHeight,
      0, 0, TARGET_WIDTH, TARGET_HEIGHT
    )

    // No need to apply contrast here, the backend uses Jimp to enhance the image properly.
    // Double contrast enhancement degrades text quality (e.g. turning 'e' into 'o').

    return croppedCanvas
  }

  // Coordinate-based extraction for digital PDFs using PDF.js text layer
  const performPdfTextExtraction = async (page: any): Promise<boolean> => {
    setProcessStep('Extracting text layer from PDF...')

    const content = await page.getTextContent()
    const items = content.items as any[]

    // Check if PDF has embedded text (digital PDF vs scanned)
    if (items.length < 10) {
      return false // Likely a scanned PDF, fall back to OCR
    }

    // Helper to extract text at specific coordinates with tolerance
    const extractAtCoord = (targetX: number, targetY: number, tolerance = 5, maxWidth = 200): string => {
      const matches: { str: string; x: number }[] = []

      for (const item of items) {
        if (!item.str || !item.str.trim()) continue

        const x = item.transform[4]
        const y = item.transform[5]

        // Check if item is within Y tolerance and starts near target X
        if (Math.abs(y - targetY) <= tolerance && x >= targetX - 10 && x <= targetX + maxWidth) {
          matches.push({ str: item.str, x })
        }
      }

      // Sort by X position and join
      matches.sort((a, b) => a.x - b.x)
      return matches.map(m => m.str.trim()).join(' ').trim() || ''
    }

    // Helper to extract a line starting from X coordinate
    const extractLineFrom = (startX: number, targetY: number, tolerance = 5): string => {
      const matches: { str: string; x: number }[] = []

      for (const item of items) {
        if (!item.str || !item.str.trim()) continue

        const x = item.transform[4]
        const y = item.transform[5]

        if (Math.abs(y - targetY) <= tolerance && x >= startX - 5) {
          matches.push({ str: item.str, x })
        }
      }

      matches.sort((a, b) => a.x - b.x)
      return matches.map(m => m.str.trim()).join(' ').trim() || ''
    }

    setProcessStep('Detecting document type...')

    // ── Detect if this is the new Authblock Certificate or the legacy Marksheet ──
    // The Authblock certificate has 'AUTHBLOCK' text near the top of the page
    // Marksheet has the template image with text overlaid at different coords
    const isAuthblockCert = items.some((item: any) =>
      item.str && item.str.includes('AUTHBLOCK')
    )

    let name = '', prn_no = '', serial_no = '', examination = '', branch = ''
    let session = '', sgpi = '', cgpi = '', remarks = '', certificate_id = ''

    if (isAuthblockCert) {
      setProcessStep('Extracting from Authblock Certificate format...')

      // ── New A4 Portrait Certificate layout ────────────────────
      // Coordinates based on pdf-lib drawing (origin = bottom-left):
      //   A4 height = 841.89 pt
      //   Student section starts at ch-183 = 658.89
      //   yPos trace:
      //     ch-183-22    = 636.89  ← Name/Serial labels
      //     ch-183-22-13 = 623.89  ← Name (x=40) / Serial (x=310)
      //     ch-183-22-13-22 = 601.89  ← PRN/Branch labels
      //     ch-183-22-13-22-13 = 588.89  ← PRN (x=40) / Branch (x=310)
      //     -28 = 560.89  ← ACADEMIC section header
      //     -22 = 538.89  ← Exam/Session labels
      //     -13 = 525.89  ← Exam (x=40) / Session (x=310)
      //     -28 = 497.89  ← SGPI/CGPI/Remark labels
      //     -18 = 479.89  ← SGPI (x=40) / CGPI (x=160) / Remarks (x=310)
      //   Certificate ID at y = ch-145 = 696.89, x starts at 118

      name = extractAtCoord(40, 623, 6, 260)
      serial_no = extractAtCoord(310, 623, 6, 200)
      prn_no = extractAtCoord(40, 588, 6, 200)
      branch = extractAtCoord(310, 588, 6, 200)
      examination = extractAtCoord(40, 525, 6, 260)
      session = extractAtCoord(310, 525, 6, 200)
      sgpi = extractAtCoord(40, 479, 6, 100)
      cgpi = extractAtCoord(160, 479, 6, 100)
      remarks = extractAtCoord(310, 479, 6, 200)
      certificate_id = extractAtCoord(118, 696, 6, 300)

      // Strip the '—' placeholder that was written when field was empty
      serial_no = serial_no === '—' ? '' : serial_no

      console.log('[Verify] Authblock cert fields:', { name, prn_no, serial_no, examination, branch, session, sgpi, cgpi, remarks, certificate_id })

    } else {
      setProcessStep('Extracting from Marksheet template format...')

      // ── Legacy Marksheet layout (template overlay coords) ─────
      serial_no = extractAtCoord(440, 685, 5, 120)
      name = extractLineFrom(150, 647, 3)
      examination = extractLineFrom(150, 630, 3)
      branch = extractLineFrom(150, 612, 3)
      session = extractLineFrom(150, 595, 3)
      prn_no = extractAtCoord(150, 580, 3, 150)
      remarks = extractAtCoord(130, 118, 5, 100)
      sgpi = extractAtCoord(277, 118, 5, 50)
      cgpi = extractAtCoord(335, 118, 5, 50)

      console.log('[Verify] Marksheet fields:', { name, prn_no, serial_no, examination, branch, session, sgpi, cgpi, remarks })
    }

    setProcessStep('Extracting performance metrics...')

    // Check if we got meaningful data
    const hasData = name || prn_no || serial_no
    if (!hasData) {
      return false // Fall back to OCR
    }

    setProcessStep('Text layer extraction complete. Generating hash...')

    // Build hash using the SAME format as issuance: {field, value}[] sorted by field name
    const dataHashHex = await buildMarksheetCoordinateHash(
      { name, prn_no, serial_no, examination, branch, session, sgpi, cgpi, remarks }
    )

    console.log('[Verify] Generated marksheet coordinate hash from PDF text layer:', dataHashHex)
    console.log('[Verify] Fields used:', { name, prn_no, serial_no, examination, branch, session, sgpi, cgpi, remarks })

    await performVerification(dataHashHex, certificate_id || undefined)
    return true
  }

  // OCR-based extraction using server-side API (OCR.space or Google Vision)
  const performOcrExtraction = async (sourceElement: HTMLImageElement | HTMLCanvasElement) => {
    setProcessStep('Preparing document for OCR analysis...')

    // First, create a canvas from the source
    let sourceCanvas: HTMLCanvasElement

    if (sourceElement instanceof HTMLCanvasElement) {
      sourceCanvas = sourceElement
    } else {
      sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = sourceElement.naturalWidth
      sourceCanvas.height = sourceElement.naturalHeight
      const ctx = sourceCanvas.getContext('2d')!
      ctx.drawImage(sourceElement, 0, 0)
    }

    // Detect and crop to document boundaries with A4 aspect ratio
    setProcessStep('Detecting document boundaries...')
    const croppedCanvas = cropToDocument(sourceCanvas)

    // Convert canvas to blob for API upload
    setProcessStep('Sending to OCR API...')
    const blob = await new Promise<Blob>((resolve) => {
      croppedCanvas.toBlob((b) => resolve(b!), 'image/png', 1.0)
    })

    const formData = new FormData()
    formData.append('file', blob, 'document.png')

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      console.log('[Verify] OCR API response:', data)

      if (data.error) {
        console.error('[Verify] OCR API error:', data.error)
        throw new Error(data.error)
      }

      setProcessStep(`OCR complete (${data.provider}). Generating hash...`)

      const ef = data.extractedData

      // Build hash using the SAME format as issuance: {field, value}[] sorted by field name
      const dataHashHex = await buildMarksheetCoordinateHash({
        name: ef.name || '',
        prn_no: ef.prn_no || '',
        serial_no: ef.serial_no || '',
        examination: ef.examination || '',
        branch: ef.branch || '',
        session: ef.session || '',
        sgpi: ef.sgpi || '',
        cgpi: ef.cgpi || '',
        remarks: ef.remarks || ''
      })

      console.log('[Verify] Generated marksheet coordinate hash from OCR:', dataHashHex)
      console.log('[Verify] OCR fields:', {
        name: ef.name, prn_no: ef.prn_no, serial_no: ef.serial_no,
        examination: ef.examination, branch: ef.branch, session: ef.session,
        sgpi: ef.sgpi, cgpi: ef.cgpi, remarks: ef.remarks
      })

      await performVerification(dataHashHex, ef.certificate_id || undefined)
    } catch (error: any) {
      console.error('[Verify] OCR failed, falling back to local:', error.message)
      // Fallback to client-side Tesseract if API fails
      setProcessStep(`API error: ${error.message}. Using local OCR...`)
      await performLocalOcrExtraction(croppedCanvas)
    }
  }

  // Fallback: Local Tesseract OCR (less accurate but works offline)
  const performLocalOcrExtraction = async (canvas: HTMLCanvasElement) => {
    setProcessStep('Initializing local Tesseract OCR...')

    // Dynamic import Tesseract only when needed
    const Tesseract = (await import('tesseract.js')).default
    const worker = await Tesseract.createWorker('eng', 1)

    setProcessStep('Running local OCR extraction...')
    const { data } = await worker.recognize(canvas)
    const text = data.text

    // Extract fields using regex patterns
    const extract = (regex: RegExp, fallback = '') => {
      const match = text.match(regex)
      return match ? match[1].trim().replace(/[\n\r]/g, '') : fallback
    }

    setProcessStep('Parsing extracted text...')

    // Improved regexes to handle OCR inaccuracies and common noise
    const serial_no = extract(/(?:SN|No|N0)[-.\s]*([A-Z0-9-]{5,})/i, '') || extract(/([S5][Nn][-.\s]*\d{3,})/i, '')
    const name = extract(/Name\s*[:;.,\s]*([A-Za-z\s]+?)(?:\s{2,}|PRN|Branch|Examination|$)/i, '')
    const examination = extract(/Examination\s*[:;.,\s]*([A-Za-z0-9\s]+?)(?:\s{2,}|Branch|Session|$)/i, '')
    const branch = extract(/Branch\s*[:;.,\s]*([A-Za-z0-9\s]+?)(?:\s{2,}|Session|PRN|$)/i, '')
    const session = extract(/Session\s*[:;.,\s]*([A-Za-z0-9\s]+?)(?:\s{2,}|PRN|Date|$)/i, '')
    const prn_no = extract(/PRN[.\s]*(?:No\.?)?[:;.,\s]*(\d{10,16})/i, '')
    const sgpi = extract(/SGP[I1l]\s*[:;.,\s]*([\d.]+)/i, '')
    const cgpi = extract(/CGP[I1l]\s*[:;.,\s]*([\d.]+)/i, '')
    const remarks = extract(/Remarks?\s*[:;.,\s]*([A-Za-z\s]+?)(?:\s{2,}|SGP[I1l]|Date|$)/i, '')

    // Extract totals
    const credits = extract(/Total\s+Credits?\s*[:\s]*(\d+)/i, '')
    const gp = extract(/Total\s+GP\s*[:\s]*(\d+)/i, '')
    const cp = extract(/Total\s+CP\s*[:\s]*(\d+)/i, '')
    const cpgp = extract(/Total\s+CPGP\s*[:\s]*(\d+)/i, '')

    await worker.terminate()

    setProcessStep('Local OCR complete. Generating hash...')

    // Build hash using the SAME format as issuance: {field, value}[] sorted by field name
    const dataHashHex = await buildMarksheetCoordinateHash(
      { name, prn_no, serial_no, examination, branch, session, sgpi, cgpi, remarks }
    )

    console.log('[Verify] Generated marksheet coordinate hash from local OCR:', dataHashHex)
    console.log('[Verify] Fields used:', { name, prn_no, serial_no, examination, branch, session, sgpi, cgpi, remarks })

    await performVerification(dataHashHex, undefined)
  }

  const handleProcess = async () => {
    if (!file) return
    setIsProcessing(true)

    // Clear previous results but keep the file
    setExtractedData(null)
    setResult(null)

    try {
      if (file.type === 'application/pdf') {
        setProcessStep('Computing SHA-256 hash of PDF bytes...')
        const buffer = await file.arrayBuffer()
        const pdfHash = await sha256(buffer)

        let pdfRes: any = null
        try {
          const res = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash: pdfHash }) })
          pdfRes = await res.json()
        } catch (e) { }

        if (pdfRes && pdfRes.verified) {
          setResult(pdfRes)
          setIsProcessing(false)
          return
        }

        setProcessStep('PDF hash not found. Loading PDF document...')
        const pdfjsLib = (window as any)['pdfjs-dist/build/pdf']
        if (!pdfjsLib) throw new Error('PDF.js renderer is not loaded yet. Please try again.')

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)

        // Try coordinate-based text extraction first (for digital PDFs)
        setProcessStep('Attempting text layer extraction...')
        const textExtracted = await performPdfTextExtraction(page)

        if (!textExtracted) {
          // Fall back to OCR for scanned PDFs
          setProcessStep('No text layer found. Falling back to visual OCR...')
          const viewport = page.getViewport({ scale: 2.5 })
          const renderCanvas = document.createElement('canvas')
          renderCanvas.width = viewport.width
          renderCanvas.height = viewport.height
          const renderCtx = renderCanvas.getContext('2d')!

          await page.render({ canvasContext: renderCtx, viewport }).promise

          await performOcrExtraction(renderCanvas)
        }

      } else if (file.type.startsWith('image/')) {
        setProcessStep('Loading image for analysis...')
        const img = new Image()
        img.src = URL.createObjectURL(file)
        await new Promise(r => { img.onload = r })

        await performOcrExtraction(img)
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or an Image.')
      }
    } catch (e: any) {
      setResult({ verified: false, message: e.message || 'An error occurred during verification.' })
      setIsProcessing(false)
      setProcessStep('')
    }
  }

  const handleHashExtractedData = async () => {
    setIsProcessing(true)
    setProcessStep('Generating data hash from extracted data...')

    try {
      // Build hash using the SAME format as issuance
      const dataHashHex = await buildMarksheetCoordinateHash({
        name: extractedData.name || '',
        prn_no: extractedData.prn_no || '',
        serial_no: extractedData.serial_no || '',
        examination: extractedData.examination || '',
        branch: extractedData.branch || '',
        session: extractedData.session || '',
        sgpi: extractedData.sgpi || '',
        cgpi: extractedData.cgpi || '',
        remarks: extractedData.remarks || ''
      })

      console.log('[Verify] Generated marksheet coordinate hash from manual edit:', dataHashHex)
      await performVerification(dataHashHex, extractedData.certificate_id || undefined)
    } catch (e: any) {
      setResult({
        verified: false,
        message: 'Error generating data hash: ' + e.message
      })
      setIsProcessing(false)
    }
  }

  const performVerification = async (hashToVerify: string, certId?: string) => {
    setProcessStep('Querying blockchain for hash authenticity...')
    try {
      const formattedHash = hashToVerify.startsWith('0x') ? hashToVerify : '0x' + hashToVerify

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: formattedHash })
      })
      const data = await res.json()
      setResult(data)

      // If this is a verified Authblock certificate, resolve cert_id for full details display
      if (data.verified) {
        const resolvedCertId = certId || data?.record?.certificate_id || null
        setVerifiedCertId(resolvedCertId)
      }
    } catch (e: any) {
      setResult({
        verified: false,
        message: 'Server error during verification: ' + e.message
      })
    } finally {
      setIsProcessing(false)
      setProcessStep('')
      setExtractedData(null)
    }
  }

  const handleFieldChange = (key: string, value: string) => {
    setExtractedData((prev: any) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden relative">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" onLoad={() => {
        const _pdfjs = (window as any)['pdfjs-dist/build/pdf']
        if (_pdfjs) _pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      }} />

      <Navbar />

      {/* Abstract Animated Background inspired by the landing page blue/white theme */}
      <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-multiply" />
      <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply" />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none -z-10" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 py-16 sm:py-24 relative z-10 w-full">
        <div className="max-w-5xl w-full mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium text-sm mb-6">
              <ShieldCheck className="w-4 h-4" />
              Authblock Verification Engine
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
              Verify Document
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 pb-2">
                Authenticity
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Drop a digital PDF or a scanned image. We extract, normalize, and match cryptographic hashes directly against the <span className="font-semibold text-slate-800">Sepolia Ethereum</span> network.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Entry / Dropzone / Processing State */}
            {!extractedData && !result && (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div
                  className={`relative overflow-hidden border-2 border-dashed rounded-[2rem] p-10 sm:p-14 text-center transition-all duration-300 ${dragActive
                      ? 'border-blue-500 bg-blue-50/50 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                      : file
                        ? 'border-blue-200 bg-white/80 shadow-xl shadow-slate-200/50'
                        : 'border-slate-300 bg-white/60 hover:border-blue-400 hover:bg-white hover:shadow-xl shadow-slate-200/50 hover:shadow-blue-500/10'
                    } backdrop-blur-xl group`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >

                  {!file ? (
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white group-hover:scale-110 transition-transform duration-500 delay-75">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Upload Document</h3>
                      <p className="text-slate-500 font-medium mb-8 max-w-xs leading-relaxed">Drag & drop your physical scan or digital PDF here</p>

                      <label className="relative overflow-hidden bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold cursor-pointer shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 group/btn">
                        <span className="relative z-10 flex items-center gap-2">Browse Files <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" /></span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        <input type="file" className="hidden" accept=".pdf,image/png,image/jpeg" onChange={e => e.target.files && (resetState(), setFile(e.target.files[0]))} />
                      </label>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center relative z-10">
                      <div className="relative">
                        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white ${isProcessing ? 'bg-indigo-50 animate-pulse' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
                          {isProcessing ? (
                            <Scan className="w-10 h-10 text-indigo-500 animate-[spin_3s_linear_infinite]" />
                          ) : (
                            <FileText className="w-10 h-10 text-blue-600" />
                          )}
                        </div>
                        {isProcessing && (
                          <div className="absolute inset-0 bg-blue-400 rounded-2xl animate-ping opacity-20" />
                        )}
                      </div>

                      <h3 className="text-2xl font-bold text-slate-800 mb-2 truncate max-w-full px-4">{file.name}</h3>
                      <p className="text-slate-500 font-medium mb-10">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.replace('application/', '').replace('image/', '').toUpperCase()}</p>

                      {!isProcessing ? (
                        <div className="flex items-center gap-4">
                          <button onClick={() => setFile(null)} className="px-6 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm">
                            Clear
                          </button>
                          <button onClick={handleProcess} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 hover:shadow-xl active:scale-95 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" /> Start Verification
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center w-full max-w-sm">
                          <div className="w-full bg-slate-100 overflow-hidden h-2 rounded-full mb-4 relative">
                            <motion.div
                              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 w-full"
                              initial={{ x: '-100%' }}
                              animate={{ x: '100%' }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            />
                          </div>
                          <p className="text-slate-800 font-medium uppercase tracking-widest text-sm animate-pulse flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> {processStep || 'Analyzing...'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scanning scanline graphic while processing */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem] z-0"
                      >
                        <motion.div
                          className="w-full h-32 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent border-b border-blue-500/20"
                          initial={{ y: -150 }}
                          animate={{ y: 500 }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </motion.div>
            )}

            {/* OCR Interactive Edit Form */}
            {extractedData && (
              <motion.div
                key="ocr-edit"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-blue-900/5 border border-white overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -z-10" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10" />

                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent to-blue-500/20 opacity-50 block mix-blend-overlay" />

                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20 shadow-inner">
                    <FileSearch className="w-8 h-8 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Cryptographic Validation Check</h3>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                      Document data has been extracted. Please verify these fields are <span className="text-amber-300 font-semibold">accurate</span>. A single incorrect character will completely alter the resulting SHA-256 data hash.
                    </p>
                  </div>
                </div>

                <div className="p-8 sm:p-10">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Identity & Academic Meta
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {['name', 'prn_no', 'examination', 'branch', 'session', 'serial_no', 'sgpi', 'cgpi', 'remarks', 'date'].map(key => (
                      <div key={key} className="flex flex-col group/input">
                        <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2 ml-1 group-focus-within/input:text-blue-600 transition-colors">{key.replace('_', ' ')}</label>
                        <input
                          type="text"
                          value={extractedData[key]}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-800 shadow-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 sm:px-10 sm:py-8 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button onClick={() => setExtractedData(null)} className="w-full sm:w-auto px-6 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition flex justify-center">
                    Cancel & Restart
                  </button>
                  <button
                    onClick={handleHashExtractedData}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100 active:scale-95"
                  >
                    {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying On-Chain...</> : <><ShieldCheck className="w-5 h-5" /> Generate Hash & Verify</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Results Component */}
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full"
              >
                {/* Full certificate details when it's a verified Authblock certificate */}
                {result.verified && (verifiedCertId || result?.record?.data_hash || result?.record?.pdf_hash) ? (
                  <div>
                    <CertificateVerification
                      certId={verifiedCertId || undefined}
                      hash={result?.record?.data_hash || result?.record?.pdf_hash}
                      tx={result?.txHash || result?.record?.tx_hash_data || result?.record?.tx_hash_pdf}
                    />
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() => { resetState() }}
                        className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-sm transition hover:shadow-md active:scale-95"
                      >
                        <RefreshCcw className="w-5 h-5" /> Verify Another Document
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Simple card for failures or non-certificate documents */
                  <div className={`w-full max-w-3xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl border ${result.verified ? 'shadow-emerald-900/10 border-emerald-200' : 'shadow-red-900/10 border-red-200'}`}>
                    {/* Result Header */}
                    <div className={`p-10 ${result.verified ? 'bg-gradient-to-br from-emerald-50 to-teal-50' : 'bg-gradient-to-br from-red-50 to-rose-50'} relative overflow-hidden flex flex-col items-center text-center`}>
                      <div className={`absolute top-0 w-full h-1 ${result.verified ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: result.verified ? [0, -10, 10, 0] : 0 }}
                        transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                        className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl mb-6 ${result.verified ? 'bg-emerald-500 shadow-emerald-500/40 text-white' : 'bg-red-500 shadow-red-500/40 text-white'}`}
                      >
                        {result.verified ? <ShieldCheck className="w-14 h-14" /> : <XCircle className="w-14 h-14" />}
                      </motion.div>
                      <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 ${result.verified ? 'text-emerald-950' : 'text-red-950'}`}>
                        {result.verified ? 'Authenticity Verified' : 'Verification Failed'}
                      </h2>
                      <p className={`text-lg max-w-lg leading-relaxed font-medium ${result.verified ? 'text-emerald-700' : 'text-red-700'}`}>
                        {result.message || (result.verified ? 'The computed cryptographic data hash matches identically with an immutable anchor on the Sepolia Ethereum blockchain.' : 'The cryptographic hash of the extracted data does not match any official records on the blockchain.')}
                      </p>
                    </div>

                    {/* Optional Record details */}
                    {result.verified && result.record && (
                      <div className="bg-white p-10 border-t border-emerald-100">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-8 border-b border-slate-100 pb-4">Stored Ledger Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                          <div className="group">
                            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">Student Identity</span>
                            <span className="text-xl font-bold text-slate-900 block truncate">{result.record.student_name}</span>
                          </div>
                          <div className="group">
                            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">PRN Number</span>
                            <span className="text-xl font-bold text-slate-900 block font-mono tracking-tight">{result.record.prn_no}</span>
                          </div>
                          <div className="group sm:col-span-2">
                            <span className="text-[11px] font-bold uppercase text-emerald-600 block mb-2">Smart Contract Execution Root</span>
                            <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-slate-600 font-mono text-sm hover:text-emerald-700 transition-colors w-full break-all shadow-sm">
                              {result.txHash} ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`p-6 border-t flex justify-center bg-slate-50/50 backdrop-blur-sm ${result.verified ? 'border-emerald-100' : 'border-red-100'}`}>
                      <button
                        onClick={() => { setFile(null); resetState(); }}
                        className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold shadow-sm transition hover:shadow-md active:scale-95 ${result.verified ? 'bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'bg-white border-2 border-red-200 text-red-700 hover:bg-red-50'}`}
                      >
                        <RefreshCcw className="w-5 h-5" /> Verify Another Document
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      <Footer />
    </main>
  )
}

// Main export with Suspense boundary
export default function VerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyContent />
    </Suspense>
  )
}
