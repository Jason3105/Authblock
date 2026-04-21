import { NextRequest, NextResponse } from 'next/server'
import { Jimp } from 'jimp'
import { createWorker, PSM } from 'tesseract.js'

// OCR.space API - Free tier: 25,000 requests/month, 1MB file limit
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || ''

// Maximum file size for OCR.space (1MB = 1024 KB, use 900KB for safety)
const MAX_FILE_SIZE_KB = 900

async function enhanceAndCompressForOcr(buffer: Buffer): Promise<{ base64: string; mimeType: string; width: number; height: number }> {
  try {
    const image = await Jimp.read(buffer)
    console.log(`[OCR API] Original dimensions: ${image.width}x${image.height}`)

    const originalWidth  = image.width
    const originalHeight = image.height

    image.greyscale()
    image.contrast(0.3)
    image.normalize()

    let quality = 90
    let scale = 1.0
    let compressedBase64 = ''
    let finalWidth = originalWidth
    let finalHeight = originalHeight

    for (let attempt = 0; attempt < 8; attempt++) {
      const targetWidth  = Math.round(originalWidth * scale)
      const targetHeight = Math.round(originalHeight * scale)
      const processedImage = image.clone()

      if (scale < 1.0) {
        processedImage.resize({ w: targetWidth, h: targetHeight })
      }

      const compressedBuffer = await processedImage.getBuffer('image/jpeg', { quality })
      compressedBase64 = compressedBuffer.toString('base64')

      const sizeKB = (compressedBase64.length * 3) / 4 / 1024
      console.log(`[OCR API] Compression attempt ${attempt + 1}: ${Math.round(sizeKB)}KB (${targetWidth}x${targetHeight}, q=${quality})`)

      if (sizeKB <= MAX_FILE_SIZE_KB) {
        finalWidth  = targetWidth
        finalHeight = targetHeight
        console.log(`[OCR API] Final: ${Math.round(sizeKB)}KB (${targetWidth}x${targetHeight})`)
        return { base64: compressedBase64, mimeType: 'image/jpeg', width: finalWidth, height: finalHeight }
      }

      if (scale > 0.5) {
        scale -= 0.1
      } else if (quality > 70) {
        quality -= 10
      } else {
        scale   = Math.max(0.3, scale - 0.05)
        quality = Math.max(60, quality - 5)
      }
    }

    return { base64: compressedBase64, mimeType: 'image/jpeg', width: originalWidth, height: originalHeight }
  } catch (e: any) {
    console.error('[OCR API] Enhancement/compression failed:', e.message)
    const image = await Jimp.read(buffer)
    return { base64: buffer.toString('base64'), mimeType: 'image/png', width: image.width, height: image.height }
  }
}

// ─── Coordinate-based word extraction ─────────────────────────────────────────
// The marksheet PDF uses fixed coordinates (x, y in PDF-space).
// PDF page size is 595.28 x 841.89 pt.
// The image returned from OCR.space has word bounding boxes in pixels.
// We map from PDF-pt coordinates → image pixel coordinates using the known
// image dimensions, then extract words whose bounding box overlaps the target region.

interface OcrWord {
  text: string
  left: number   // px from left edge of image
  top: number    // px from top edge of image
  width: number
  height: number
}

/**
 * Extract all words from OCR.space overlay response.
 */
function extractOcrWords(ocrResponse: any): OcrWord[] {
  const words: OcrWord[] = []
  const lines = ocrResponse?.ParsedResults?.[0]?.TextOverlay?.Lines || []
  for (const line of lines) {
    for (const word of line.Words || []) {
      if (word.WordText && word.WordText.trim()) {
        words.push({
          text:   word.WordText.trim(),
          left:   Number(word.Left),
          top:    Number(word.Top),
          width:  Number(word.Width),
          height: Number(word.Height)
        })
      }
    }
  }
  return words
}

/**
 * PDF coordinates use bottom-left origin; images use top-left origin.
 * Given a PDF point (px, py) and the image pixel dimensions, compute the
 * equivalent pixel coordinate.
 *
 * PDF page: 595.28 w × 841.89 h (A4)
 *   x: left-to-right (same direction as image)
 *   y: bottom-to-top (INVERTED vs image)
 */
function pdfToPixel(
  pdfX: number,
  pdfY: number,
  imgWidth: number,
  imgHeight: number
): { px: number; py: number } {
  const PDF_W = 595.28
  const PDF_H = 841.89
  return {
    px: (pdfX / PDF_W) * imgWidth,
    py: ((PDF_H - pdfY) / PDF_H) * imgHeight   // flip Y axis
  }
}

/**
 * Find all OCR words within a pixel rectangle (with generous padding).
 * Returns the concatenated text of all matching words.
 */
function wordsInRegion(
  words: OcrWord[],
  cx: number,    // centre-x in pixels
  cy: number,    // centre-y in pixels
  halfW = 120,   // horizontal search radius in pixels
  halfH = 25     // vertical search radius in pixels
): string {
  return words
    .filter(w => {
      const wx = w.left + w.width  / 2
      const wy = w.top  + w.height / 2
      return Math.abs(wx - cx) <= halfW && Math.abs(wy - cy) <= halfH
    })
    .sort((a, b) => a.left - b.left)
    .map(w => w.text)
    .join(' ')
    .trim()
}

/**
 * Use the ocr_coordinate_map (field → {x, y} in PDF pts) together with the
 * OCR word overlay to extract each field value with spatial precision.
 *
 * Fields in the ocr_coordinate_map:
 *   { field, x, y, value }  — value is the originally-drawn text (ground truth)
 *   x, y are PDF coordinates
 */
function extractByCoordinates(
  ocrWords: OcrWord[],
  ocrCoordinateMap: Array<{ field: string; x: number; y: number; value: string }>,
  imgWidth: number,
  imgHeight: number
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const entry of ocrCoordinateMap) {
    const { field, x, y } = entry
    const { px, py } = pdfToPixel(x, y, imgWidth, imgHeight)

    // Wider horizontal search for longer text fields; narrower for numbers
    const isNumeric = ['SGPI', 'CGPI'].includes(field)
    const halfW = isNumeric ? 60 : 200
    const halfH = 20

    const extracted = wordsInRegion(ocrWords, px, py, halfW, halfH)
    if (extracted) {
      result[field] = extracted
      console.log(`[OCR Coord] "${field}" @ PDF(${x},${y}) → px(${Math.round(px)},${Math.round(py)}): "${extracted}"`)
    } else {
      console.log(`[OCR Coord] "${field}" @ PDF(${x},${y}) → px(${Math.round(px)},${Math.round(py)}): NOT FOUND`)
    }
  }

  return result
}

export async function POST(request: NextRequest) {
  console.log('[OCR API] Starting OCR request...')
  console.log('[OCR API] OCR.space Key exists:', !!OCR_SPACE_API_KEY)

  try {
    const formData = await request.formData()
    const file     = formData.get('file') as File

    // Optional: ocr_coordinate_map passed as JSON string for coordinate-based extraction
    const ocrMapStr = formData.get('ocr_coordinate_map') as string | null
    const ocrCoordinateMap: Array<{ field: string; x: number; y: number; value: string }> =
      ocrMapStr ? JSON.parse(ocrMapStr) : []

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[OCR API] File received:', file.name, file.size, 'bytes')
    if (ocrCoordinateMap.length > 0) {
      console.log('[OCR API] Coordinate map provided:', ocrCoordinateMap.length, 'fields')
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileSizeKB = buffer.length / 1024
    console.log('[OCR API] Original file size:', Math.round(fileSizeKB), 'KB')

    let base64   = ''
    let mimeType = file.type || 'image/png'
    let imgWidth = 0
    let imgHeight = 0

    const needsProcessing = !file.type.includes('pdf')
    if (needsProcessing) {
      console.log('[OCR API] Enhancing image for OCR...')
      const processed = await enhanceAndCompressForOcr(buffer)
      base64    = processed.base64
      mimeType  = processed.mimeType
      imgWidth  = processed.width
      imgHeight = processed.height
    } else {
      base64 = buffer.toString('base64')
    }

    console.log('[OCR API] Final base64 length:', base64.length)

    let ocrText      = ''
    let ocrProvider  = ''
    let errorDetails = ''
    let ocrWords: OcrWord[] = []
    let rawResponse: any = null

    // ── OCR.space (primary) ─────────────────────────────────────────────────
    if (OCR_SPACE_API_KEY) {
      console.log('[OCR API] Trying OCR.space API...')
      try {
        const ocrParams = new URLSearchParams()
        ocrParams.append('base64Image', `data:${mimeType};base64,${base64}`)
        ocrParams.append('language', 'eng')
        ocrParams.append('isOverlayRequired', 'true')   // ← MUST be true for word bounding boxes
        ocrParams.append('detectOrientation', 'true')
        ocrParams.append('scale', 'true')
        ocrParams.append('OCREngine', '2')

        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: {
            'apikey': OCR_SPACE_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: ocrParams.toString()
        })

        const data = await response.json()
        rawResponse = data
        console.log('[OCR API] OCR.space response status:', response.status)

        if (data.IsErroredOnProcessing) {
          console.error('[OCR API] OCR.space processing error:', data.ErrorMessage)
          errorDetails += `OCR.space: ${data.ErrorMessage?.[0] || 'Processing error'}`
        } else if (data.ParsedResults?.[0]?.ParsedText) {
          ocrText     = data.ParsedResults[0].ParsedText
          ocrProvider = 'ocrspace'
          ocrWords    = extractOcrWords(data)
          console.log('[OCR API] OCR.space success! Text length:', ocrText.length, '| Words:', ocrWords.length)
          console.log('[OCR API] Raw OCR text (full):\n' + ocrText)
        } else {
          console.log('[OCR API] OCR.space exit code:', data.OCRExitCode)
          errorDetails += `OCR.space exit code: ${data.OCRExitCode}`
        }
      } catch (e: any) {
        console.error('[OCR API] OCR.space fetch error:', e.message)
        errorDetails += `OCR.space fetch error: ${e.message}`
      }
    }

    // ── Tesseract fallback ──────────────────────────────────────────────────
    if (!ocrText) {
      console.log('[OCR API] Trying Tesseract.js as fallback...')
      try {
        const worker = await createWorker('eng')
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
        const imageBuffer = Buffer.from(base64, 'base64')
        const { data: { text } } = await worker.recognize(imageBuffer)
        await worker.terminate()
        if (text && text.trim()) {
          ocrText     = text.trim()
          ocrProvider = 'tesseract'
          console.log('[OCR API] Tesseract success! Text length:', ocrText.length)
        } else {
          errorDetails += (errorDetails ? '; ' : '') + 'Tesseract: No text extracted'
        }
      } catch (e: any) {
        errorDetails += (errorDetails ? '; ' : '') + `Tesseract error: ${e.message}`
      }
    }

    if (!ocrText) {
      return NextResponse.json({ error: errorDetails || 'All OCR methods failed' }, { status: 500 })
    }

    // ── Extraction ──────────────────────────────────────────────────────────
    // 1. Coordinate-based extraction (if map provided + word overlay available)
    let coordinateExtracted: Record<string, string> = {}
    if (ocrCoordinateMap.length > 0 && ocrWords.length > 0 && imgWidth > 0 && imgHeight > 0) {
      console.log('[OCR API] Running coordinate-based extraction...')
      coordinateExtracted = extractByCoordinates(ocrWords, ocrCoordinateMap, imgWidth, imgHeight)
    }

    // 2. Regex-based extraction on full text (fallback / supplement)
    const regexExtracted = parseCertificateText(ocrText)

    // 3. Merge: coordinate-based wins over regex where available
    const fieldMap: Record<string, keyof typeof regexExtracted> = {
      'Full Name':   'name',
      'PRN Number':  'prn_no',
      'Serial No.':  'serial_no',
      'Examination': 'examination',
      'Branch':      'branch',
      'Session':     'session',
      'SGPI':        'sgpi',
      'CGPI':        'cgpi',
      'Remarks':     'remarks'
    }

    const extractedData = { ...regexExtracted }
    for (const [coordField, dataKey] of Object.entries(fieldMap)) {
      const coordVal = coordinateExtracted[coordField]
      if (coordVal && coordVal.length > 0) {
        ;(extractedData as any)[dataKey] = coordVal
        console.log(`[OCR Merge] "${dataKey}" overridden by coordinate extraction: "${coordVal}"`)
      }
    }

    // Apply normalization to coordinate-extracted values too
    if (extractedData.examination) extractedData.examination = normalizeExamination(extractedData.examination)
    if (extractedData.remarks)     extractedData.remarks     = normalizeRemarks(extractedData.remarks)
    if (extractedData.name)        extractedData.name        = normalizeName(extractedData.name)
    if (extractedData.sgpi)        extractedData.sgpi        = normalizeSGPI(extractedData.sgpi)
    if (extractedData.cgpi)        extractedData.cgpi        = normalizeCGPI(extractedData.cgpi)

    console.log('[OCR API] Extraction complete. Fields found:',
      Object.keys(extractedData).filter(k => (extractedData as any)[k]).length)

    return NextResponse.json({
      success: true,
      provider: ocrProvider,
      rawText: ocrText,
      extractedData,
      coordinateExtracted,
      wordCount: ocrWords.length
    })

  } catch (error: any) {
    console.error('[OCR API] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'OCR processing failed' }, { status: 500 })
  }
}

// ─── Normalization helpers (exported so merge step can reuse) ──────────────

function normalizeName(text: string): string {
  return text
    .replace(/\s+(?:PRN|Number|Num|Der|De|Branci|Branch|Sea|Serial|No|Id|Cert|Certificate|Program|Programme)[a-z]*$/i, '')
    .replace(/\s+(?:PRN|Number|Num|Der|De|Branci|Branch|Sea|Serial|No|Id|Cert|Certificate|Program|Programme)[a-z]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeExamination(text: string): string {
  return text
    .replace(/Sem-?lV\b/gi, 'Sem-IV')
    .replace(/Sem-?l\b/gi,  'Sem-I')
    .replace(/Sem-?ll\b/gi, 'Sem-II')
    .replace(/Sem-?lll\b/gi,'Sem-III')
    .replace(/Sem-?lX\b/gi, 'Sem-IX')
    .replace(/Sem-?Vl\b/gi, 'Sem-VI')
    .replace(/Sem-?Vll\b/gi,'Sem-VII')
    .replace(/Sem-?Vlll\b/gi,'Sem-VIII')
    // Fix 'Sem-v' → 'Sem-V' (lowercase v is common OCR error for capital V)
    .replace(/Sem-v\b/g,    'Sem-V')
    .replace(/Sem-vi\b/gi,  'Sem-VI')
    .replace(/Enginering/gi,  'Engineering')
    .replace(/Engneering/gi,  'Engineering')
    .replace(/Engeering/gi,   'Engineering')
    .replace(/Engineeing/gi,  'Engineering')
    .replace(/Bacheior/gi,    'Bachelor')
    .replace(/Bachlor/gi,     'Bachelor')
    .trim()
}

function normalizeRemarks(text: string): string {
  return text
    .replace(/SUCCESSFULR?$/gi,  'SUCCESSFUL')
    .replace(/SUCCESSFULL$/gi,   'SUCCESSFUL')
    .replace(/SUCCESFULL?/gi,    'SUCCESSFUL')
    .replace(/SUCESSFULL?/gi,    'SUCCESSFUL')
    .replace(/SUCCESSUL/gi,      'SUCCESSFUL')
    .replace(/SUCCESSL?$/gi,     'SUCCESS')
    .replace(/PASSEDD?$/gi,      'PASSED')
    .replace(/FAILLED?$/gi,      'FAILED')
    .replace(/^PASS$/gi,         'PASSED')
    .replace(/^FAIL$/gi,         'FAILED')
    .trim()
}

/**
 * Clean up SGPI value — OCR sometimes produces "SGP/ 8.75" or "SGPI8.75" or "8.75"
 * We want just the numeric part.
 */
function normalizeSGPI(text: string): string {
  // Strip non-numeric prefix (e.g. "SGP/ ", "SGPI ", "S.G.P.I. ")
  const num = text.replace(/^[A-Za-z\s./]+/, '').trim()
  return /^\d+\.\d+$/.test(num) ? num : text.trim()
}

function normalizeCGPI(text: string): string {
  const num = text.replace(/^[A-Za-z\s./]+/, '').trim()
  return /^\d+\.\d+$/.test(num) ? num : text.trim()
}

// ─── Regex-based extraction (fallback) ────────────────────────────────────

function parseCertificateText(text: string) {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim()

  console.log('[OCR Parse] Normalized text length:', normalized.length)
  console.log('[OCR Parse] Sample text:', normalized.substring(0, 500))

  const extract = (patterns: RegExp[], fallback = ''): string => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern)
      if (match && match[1]) {
        const result = match[1].trim()
        if (result) return result
      }
    }
    return fallback
  }

  // Certificate ID
  const certificateIdRaw = extract([
    /Certificate\s*ID\s*:?\s*(ABC-\d{4}-\d{4}-[A-Z0-9]{8}-[A-Z0-9]{8})/i,
    /(ABC-\d{4}-\d{4}-[A-Z0-9]{8}-[A-Z0-9]{8})/i,
    /ID\s*:?\s*(ABC-[A-Z0-9-]+)/i
  ])
  const certificate_id = certificateIdRaw
    ? certificateIdRaw.replace(/O/g, '0')
    : ''

  // ── Name ────────────────────────────────────────────────────────────────
  // The traditional marksheet OCR layout (with background watermark text) causes
  // the name to appear AFTER all subject codes in the raw text, not near "Name:".
  // We use multiple fallback strategies.
  const nameRaw = extract([
    // Authblock cert - label visible
    /Full\s+Name\s+Serial\s+No\.\s+([A-Za-z]+(?:\s+[A-Za-z]+)*?)\s+SN-\d/i,
    /Full\s+Name\s+(.+?)(?=\s+SN-|\s+\d{16})/i,
    /STUDENT\s+INFORMATION\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?=\s+SN-|\s+\d{16}|\s+PRN\s+Number)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)\s+SN-\d{3,}/i,
    // Traditional marksheet: name follows "Name:" label
    /(?:Student\s+)?Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+PRN|\\s+Certificate|\s+Serial|\s*$)/i,
    /Name\s*:?\s*([A-Z][A-Za-z\s]+?)(?=\s*PRN|Roll|Examination|Branch)/i,
    // Traditional marksheet: name appears after subject code block before "Bachelor"
    // Pattern: "CSM401 <Name> Bachelor of Engineering"
    /CSM\d+\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)\s+Bachelor/i,
    // Name after last subject code (any CSX/CSL/CSC pattern)
    /CS[A-Z]\d+\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)\s+Bachelor/i,
    // Generic fallback: "Jake Sull" or similar near "Bachelor of Engineering"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+Bachelor\s+of\s+Engineering/i
  ])

  const name = nameRaw ? normalizeName(nameRaw) : ''

  // ── PRN ──────────────────────────────────────────────────────────────────
  const prn_no = extract([
    /PRN\s*(?:No\.?)?\s*:?\s*(\d{16})/i,
    /Registration\s*(?:No\.?)?\s*:?\s*(\d{16})/i,
    /PRN\s*:?\s*(\d{10,20})/i,
    /(?:^|\s)(\d{16})(?=\s|$)/
  ])

  // ── Serial No. ───────────────────────────────────────────────────────────
  const serial_no = extract([
    /Serial\s*(?:No\.?)?\s*:?\s*(SN[-\s]?\d+)/i,
    /(SN[-\s]?\d{3,})/i,
    /No\.\s*(SN-\d+)/i,
    /S\.?N\.?\s*:?\s*(\d+)/i
  ])

  // ── Examination ──────────────────────────────────────────────────────────
  const examRaw = extract([
    /Examination\s*:?\s*(Bachelor\s+of\s+Engineering\s+Sem-[IVXivx]+)/i,
    /Exam\s*:?\s*(Bachelor\s+of\s+Engineering\s+Sem-[IVXivx]+)/i,
    /(Bachelor\s+of\s+Engineering\s+Sem-[IVXivx]+)/i,
    /(BE\s+Sem-[IVXivx]+)/i,
    // OCR often outputs 'Sem-v' (lowercase) for 'Sem-V'
    /(Bachelor\s+of\s+Engineering\s+Sem-[a-zA-Z]+)/i
  ])
  const examination = examRaw ? normalizeExamination(examRaw) : ''

  // ── Branch ───────────────────────────────────────────────────────────────
  const branch = extract([
    /Branch\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+Serial|\s+Session|Examination|SGPI|ACADEMIC|$)/i,
    /Programme\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+Session|Serial|$)/i,
    /(Computer\s+Engineering)(?=\s|$)/i,
    /(Mechanical\s+Engineering)(?=\s|$)/i,
    /(Electrical\s+Engineering)(?=\s|$)/i,
    /(Civil\s+Engineering)(?=\s|$)/i,
    /(Information\s+Technology)(?=\s|$)/i,
    /(Electronics\s+(?:and\s+)?Communication)(?=\s|$)/i
  ])

  // ── Session ──────────────────────────────────────────────────────────────
  const session = extract([
    /Sem-[IVX]+\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{4})/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{4})(?=\s+SGPI)/i,
    /Session\s*:?\s*([A-Z][a-z]+-\d{4})/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{4})/i
  ])

  // ── SGPI ─────────────────────────────────────────────────────────────────
  // OCR frequently produces "SGP/ 8.75" (slash for I), "SGPY 8.75" (Y for I),
  // "SGPI8.75" (no space), or "8.75 8.88 SUCCESSFUL" (no labels at all).
  const sgpiRaw = extract([
    // Primary: "SGPY 8.75" / "SGPI 8.75" / "SGP/ 8.75" — Y, I, or / as last char
    /SG(?:P[IY\/]?)\s*([0-9]+\.[0-9]+)/i,
    // After remarks keyword: "SUCCESSFUL SGP/ 8.75 CGP/ 8.88"
    /(?:SUCCESSFUL|PASS(?:ED)?)\s+S[GC]?P[IY\/]?\s*([0-9]+\.[0-9]+)/i,
    // Adjacent to Remarks label row
    /Remarks?\s*\.?\s*\w+\s+S[GC]P[IY\/]?\s*([0-9]+\.[0-9]+)/i,
    /SGPI\s+CGPI\s+Remark\s+([\d.]+)/i,
    /SGPI\s+CGPI\s+([\d.]+)/i,
    /SGPI\s+([\d.]+)/i,
    // No labels: first decimal before a second decimal followed by result
    /([\d]+\.[\d]+)\s+[\d]+\.[\d]+\s+(?:SUCCESSFUL|SUCCESS|PASS)/i,
    /S[GC]P[IY\/]?\s*:?\s*([\d.]+)/i,
    /S\.?G\.?P\.?[IY\/]?\.?\s*:?\s*([\d.]+)/i
  ])
  const sgpi = sgpiRaw ? normalizeSGPI(sgpiRaw) : ''

  // ── CGPI ─────────────────────────────────────────────────────────────────
  const cgpiRaw = extract([
    // Primary: "CGPY 8.88" / "CGPI 8.88" / "CGP/ 8.88" — Y, I, or / as last char
    /CG(?:P[IY\/]?)\s*([0-9]+\.[0-9]+)/i,
    // After SGPI value on same line: "SGPY 8.75 CGPY 8.88"
    /SG(?:P[IY\/]?)\s*[0-9]+\.[0-9]+\s+CG(?:P[IY\/]?)\s*([0-9]+\.[0-9]+)/i,
    /(?:SUCCESSFUL|PASS(?:ED)?)\s+S[GC]?P[IY\/]?\s*[\d.]+\s+C[GC]?P[IY\/]?\s*([0-9]+\.[0-9]+)/i,
    /SGPI\s+CGPI\s+Remark\s+[\d.]+\s+([\d.]+)/i,
    /SGPI\s+CGPI\s+[\d.]+\s+([\d.]+)/i,
    /CGPI\s+([\d.]+)/i,
    /[\d]+\.[\d]+\s+([\d]+\.[\d]+)\s+(?:SUCCESSFUL|SUCCESS|PASS)/i,
    /CGPI\s*:?\s*([\d.]+(?:\.\d{2})?)/i,
    /CGPA\s*:?\s*([\d.]+(?:\.\d{2})?)/i,
    /C\.?G\.?P\.?[IY\/]?\.?\s*:?\s*([\d.]+)/i
  ])
  const cgpi = cgpiRaw ? normalizeCGPI(cgpiRaw) : ''

  // ── Remarks ──────────────────────────────────────────────────────────────
  // OCR text after whitespace collapse is "Remarks Date: SUCCESSFUL".
  // The Remarks label is immediately followed by "Date" (4 chars) which a generic
  // label-based pattern incorrectly captures. Always prefer the result keyword.
  const remarksRaw = extract([
    // Highest priority: exact result keyword anywhere in text
    /(SUCCESSFUL|SUCCESS|PASS(?:ED)?|FAIL(?:ED)?)/i,
    // SGPI/CGPI labels row fallback
    /SGPI\s+CGPI\s+Remark\s+[\d.]+\s+[\d.]+\s+([A-Z][A-Za-z]+)/i,
    /Result\s*:?\s*([A-Z][A-Za-z]+)/i,
    // Label-based, but only for long words (>=5 chars) to avoid "Date"
    /Remark[s]?\s*[.:]?\s*([A-Z]{5,})/i
  ])
  const remarks = remarksRaw ? normalizeRemarks(remarksRaw) : ''

  // ── Date ─────────────────────────────────────────────────────────────────
  const date = extract([
    /Issue\s*Date\s*:?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i,
    /Date\s*:?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i,
    /Date\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
    /(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i
  ])

  const isAuthblockCertificate = !!certificate_id

  const result = {
    name,
    prn_no,
    serial_no,
    examination,
    branch,
    session,
    sgpi,
    cgpi,
    remarks,
    date,
    certificate_id: isAuthblockCertificate ? certificate_id : '',
    document_type: isAuthblockCertificate ? 'authblock_certificate' : 'traditional_marksheet'
  }

  console.log('[OCR Parse] Document type:', result.document_type)
  console.log('[OCR Parse] Normalization debug:')
  console.log('  - Raw examination before normalization:', examRaw)
  console.log('  - Normalized examination:', examination)
  console.log('  - Raw remarks before normalization:', remarksRaw)
  console.log('  - Normalized remarks:', remarks)
  console.log('  - Raw name before normalization:', nameRaw)
  console.log('  - Normalized name:', name)
  console.log('  - Raw sgpi:', sgpiRaw, '→', sgpi)
  console.log('  - Raw cgpi:', cgpiRaw, '→', cgpi)
  console.log('[OCR Parse] Extracted fields:', JSON.stringify(result, null, 2))

  return result
}
