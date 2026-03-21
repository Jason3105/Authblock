import { NextRequest, NextResponse } from 'next/server'
import { Jimp } from 'jimp'
import { createWorker, PSM } from 'tesseract.js'

// OCR.space API - Free tier: 25,000 requests/month, 1MB file limit
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || ''

// Maximum file size for OCR.space (1MB = 1024 KB, use 900KB for safety)
const MAX_FILE_SIZE_KB = 900

async function enhanceAndCompressForOcr(buffer: Buffer): Promise<{ base64: string; mimeType: string }> {
  try {
    // Step 1: Enhance image for OCR (do this once, before compression attempts)
    const image = await Jimp.read(buffer)
    console.log(`[OCR API] Original dimensions: ${image.width}x${image.height}`)

    // Convert to grayscale (better for OCR)
    image.greyscale()

    // Increase contrast for better text recognition
    image.contrast(0.3)

    // Normalize brightness
    image.normalize()

    const originalWidth = image.width
    const originalHeight = image.height

    let quality = 90 // Start with higher quality
    let scale = 1.0
    let compressedBase64 = ''

    // Iteratively reduce size until under limit
    for (let attempt = 0; attempt < 8; attempt++) {
      const targetWidth = Math.round(originalWidth * scale)
      const targetHeight = Math.round(originalHeight * scale)

      // Clone the enhanced image for this attempt
      let processedImage = image.clone()

      // Resize if needed (use BICUBIC for better quality)
      if (scale < 1.0) {
        processedImage.resize({ w: targetWidth, h: targetHeight })
      }

      // Convert to JPEG with quality setting
      const compressedBuffer = await processedImage.getBuffer('image/jpeg', { quality })
      compressedBase64 = compressedBuffer.toString('base64')

      const sizeKB = (compressedBase64.length * 3) / 4 / 1024
      console.log(`[OCR API] Compression attempt ${attempt + 1}: ${Math.round(sizeKB)}KB (${targetWidth}x${targetHeight}, q=${quality})`)

      if (sizeKB <= MAX_FILE_SIZE_KB) {
        console.log(`[OCR API] Final: ${Math.round(sizeKB)}KB (${targetWidth}x${targetHeight})`)
        return { base64: compressedBase64, mimeType: 'image/jpeg' }
      }

      // Reduce scale first (more important to keep quality than size)
      if (scale > 0.5) {
        scale -= 0.1
      } else if (quality > 70) {
        quality -= 10
      } else {
        scale = Math.max(0.3, scale - 0.05)
        quality = Math.max(60, quality - 5)
      }
    }

    console.log('[OCR API] Using best compression result')
    return { base64: compressedBase64, mimeType: 'image/jpeg' }
  } catch (e: any) {
    console.error('[OCR API] Enhancement/compression failed:', e.message)
    return { base64: buffer.toString('base64'), mimeType: 'image/png' }
  }
}

export async function POST(request: NextRequest) {
  console.log('[OCR API] Starting OCR request...')
  console.log('[OCR API] OCR.space Key exists:', !!OCR_SPACE_API_KEY)

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[OCR API] File received:', file.name, file.size, 'bytes')

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let base64 = buffer.toString('base64')
    let mimeType = file.type || 'image/png'

    // Check if file needs compression for OCR.space
    const fileSizeKB = (base64.length * 3) / 4 / 1024
    console.log('[OCR API] Original file size:', Math.round(fileSizeKB), 'KB')

    // Enhance and compress image if needed (only for images, not PDFs)
    const needsProcessing = !file.type.includes('pdf')
    if (needsProcessing) {
      console.log('[OCR API] Enhancing image for OCR...')
      const processed = await enhanceAndCompressForOcr(buffer)
      base64 = processed.base64
      mimeType = processed.mimeType
    }

    console.log('[OCR API] Final base64 length:', base64.length)

    let ocrText = ''
    let ocrProvider = ''
    let errorDetails = ''

    // Use OCR.space API (primary OCR service)
    if (OCR_SPACE_API_KEY) {
      console.log('[OCR API] Trying OCR.space API...')
      try {
        // OCR.space requires URL-encoded form data, not multipart
        const ocrParams = new URLSearchParams()
        ocrParams.append('base64Image', `data:${mimeType};base64,${base64}`)
        ocrParams.append('language', 'eng')
        ocrParams.append('isOverlayRequired', 'false')
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
        console.log('[OCR API] OCR.space response status:', response.status)
        console.log('[OCR API] OCR.space response:', JSON.stringify(data).substring(0, 1000))

        if (data.IsErroredOnProcessing) {
          console.error('[OCR API] OCR.space processing error:', data.ErrorMessage)
          errorDetails += `OCR.space: ${data.ErrorMessage?.[0] || 'Processing error'}`
        } else if (data.ParsedResults?.[0]?.ParsedText) {
          ocrText = data.ParsedResults[0].ParsedText
          ocrProvider = 'ocrspace'
          console.log('[OCR API] OCR.space success! Text length:', ocrText.length)
          console.log('[OCR API] Raw OCR text:\n' + ocrText.substring(0, 2000))
        } else if (data.OCRExitCode !== 1) {
          console.log('[OCR API] OCR.space exit code:', data.OCRExitCode)
          errorDetails += `OCR.space exit code: ${data.OCRExitCode}`
        } else {
          console.log('[OCR API] OCR.space: No text found')
        }
      } catch (e: any) {
        console.error('[OCR API] OCR.space fetch error:', e.message)
        errorDetails += `OCR.space fetch error: ${e.message}`
      }
    }

    // Fallback to Tesseract.js if OCR.space failed or no API key
    if (!ocrText) {
      console.log('[OCR API] Trying Tesseract.js as fallback...')
      try {
        const worker = await createWorker('eng')

        // Configure Tesseract for better accuracy
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .:/-'
        })

        // Set page segmentation mode
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK
        })

        // Convert base64 back to buffer for Tesseract
        const imageBuffer = Buffer.from(base64, 'base64')

        const { data: { text } } = await worker.recognize(imageBuffer)
        await worker.terminate()

        if (text && text.trim()) {
          ocrText = text.trim()
          ocrProvider = 'tesseract'
          console.log('[OCR API] Tesseract success! Text length:', ocrText.length)
          console.log('[OCR API] Raw OCR text:\n' + ocrText.substring(0, 2000))
        } else {
          console.log('[OCR API] Tesseract: No text found')
          errorDetails += (errorDetails ? '; ' : '') + 'Tesseract: No text extracted'
        }
      } catch (e: any) {
        console.error('[OCR API] Tesseract error:', e.message)
        errorDetails += (errorDetails ? '; ' : '') + `Tesseract error: ${e.message}`
      }
    }

    if (!ocrText) {
      const errorMsg = errorDetails || 'All OCR methods failed'
      console.error('[OCR API] Final error:', errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    // Parse the OCR text to extract certificate/marksheet fields
    const extractedData = parseCertificateText(ocrText)
    console.log('[OCR API] Extraction complete. Fields found:', Object.keys(extractedData).filter(k => extractedData[k as keyof typeof extractedData]).length)

    return NextResponse.json({
      success: true,
      provider: ocrProvider,
      rawText: ocrText,
      extractedData
    })

  } catch (error: any) {
    console.error('[OCR API] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'OCR processing failed' }, { status: 500 })
  }
}

function parseCertificateText(text: string) {
  // Normalize text
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s+/g, '\n') // Clean line starts
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

  // Extract certificate ID (for Authblock certificates)
  const certificateIdRaw = extract([
    /Certificate\s*ID\s*:?\s*(ABC-\d{4}-\d{4}-[A-Z0-9]{8}-[A-Z0-9]{8})/i,
    /(ABC-\d{4}-\d{4}-[A-Z0-9]{8}-[A-Z0-9]{8})/i,
    /ID\s*:?\s*(ABC-[A-Z0-9-]+)/i
  ])

  // Normalize certificate ID - fix OCR confusion between 0 (zero) and O (letter)
  const normalizeCertificateId = (text: string): string => {
    // Replace letter O with digit 0 in the alphanumeric parts (after the dashes)
    // ABC-2025-8411-[should be all digits/uppercase letters]
    return text.replace(/O/g, '0')  // Convert O to 0
  }

  const certificate_id = certificateIdRaw ? normalizeCertificateId(certificateIdRaw) : ''

  // Extract name - enhanced patterns for both formats
  const nameRaw = extract([
    // Authblock certificate format - avoid capturing "PRN" suffix and other keywords
    /(?:Student\s+)?Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+PRN|\s+Certificate|\s+Serial|\s*$)/i,
    /Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+PRN|\s+No\.|\s+Certificate|\s+ID|\s+Serial)/i,
    // Traditional marksheet format
    /Name\s*:?\s*([A-Z][A-Za-z\s]+?)(?=\s*PRN|Roll|Examination|Branch)/i,
    /([A-Z][A-Z\s]+?)(?=\s*PRN|Roll)/i
  ])

  // Normalize common OCR errors in name field
  const normalizeName = (text: string): string => {
    return text
      // Fix common OCR character confusions
      .replace(/\bRaina\b/gi, 'Raina')        // Ensure consistent case
      .replace(/\bSamay\b/gi, 'Samay')        // Ensure consistent case
      .replace(/\bArjun\b/gi, 'Arjun')        // Ensure consistent case
      .replace(/\bSingh\b/gi, 'Singh')        // Ensure consistent case
      // Remove extra spaces and clean up
      .replace(/\s+/g, ' ')                   // Multiple spaces to single
      .trim()
  }

  const name = nameRaw ? normalizeName(nameRaw) : ''

  // Extract PRN - enhanced for both formats with tight boundaries
  const prn_no = extract([
    /PRN\s*:?\s*(\d{16})/i,  // 16 digit PRN
    /Registration\s*(?:No\.?)?\s*:?\s*(\d{16})/i,
    /PRN\s*:?\s*(\d{10,20})/i,
    /(?:^|\s)(\d{16})(?=\s+|$)/ // Standalone 16 digit number
  ])

  // Extract serial number - enhanced patterns
  const serial_no = extract([
    /Serial\s*(?:No\.?)?\s*:?\s*(SN[-\s]?\d+)/i,
    /(SN[-\s]?\d{3,})/i,
    /S\.?N\.?\s*:?\s*(\d+)/i,
    /Serial\s*:?\s*([A-Z0-9-]+)/i
  ])

  // Extract examination - enhanced for certificate format with proper boundaries
  const examRaw = extract([
    /Examination\s*:?\s*(Bachelor\s+of\s+Engineering\s+Sem-[IViv]+)/i,
    /Exam\s*:?\s*(Bachelor\s+of\s+Engineering\s+Sem-[IViv]+)/i,
    /(Bachelor\s+of\s+Engineering\s+Sem-[IViv]+)/i,
    /(BE\s+Sem-[IViv]+)/i
  ])

  // Normalize common OCR errors in examination field
  const normalizeExamination = (text: string): string => {
    return text
      // Fix Roman numeral OCR errors: lV -> IV, ll -> II, lll -> III
      .replace(/Sem-?lV\b/gi, 'Sem-IV')
      .replace(/Sem-?l\b/gi, 'Sem-I')
      .replace(/Sem-?ll\b/gi, 'Sem-II')
      .replace(/Sem-?lll\b/gi, 'Sem-III')
      .replace(/Sem-?lX\b/gi, 'Sem-IX')
      .replace(/Sem-?Vl\b/gi, 'Sem-VI')
      .replace(/Sem-?Vll\b/gi, 'Sem-VII')
      .replace(/Sem-?Vlll\b/gi, 'Sem-VIII')
      // Fix common word OCR errors
      .replace(/Enginering/gi, 'Engineering')  // Missing 'e'
      .replace(/Engneering/gi, 'Engineering')  // Transposed letters
      .replace(/Engeering/gi, 'Engineering')   // Missing 'in'
      .replace(/Engineeing/gi, 'Engineering')  // Missing 'r'
      .replace(/Bacheior/gi, 'Bachelor')       // OCR i/l confusion
      .replace(/Bachlor/gi, 'Bachelor')        // Missing 'e'
      .trim()
  }

  const examination = examRaw ? normalizeExamination(examRaw) : ''

  // Extract branch - enhanced patterns with better boundaries
  const branch = extract([
    /Branch\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+Serial|\s+Session|Examination|SGPI|ACADEMIC|$)/i,
    /Programme\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+Session|Serial|$)/i,
    /Course\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?=\s+Session|Serial|$)/i,
    // Specific engineering branches
    /(Computer\s+Engineering)(?=\s|$)/i,
    /(Mechanical\s+Engineering)(?=\s|$)/i,
    /(Electrical\s+Engineering)(?=\s|$)/i,
    /(Civil\s+Engineering)(?=\s|$)/i,
    /(Information\s+Technology)(?=\s|$)/i,
    /(Electronics\s+(?:and\s+)?Communication)(?=\s|$)/i
  ])

  // Extract session - enhanced for various formats with tight boundaries
  const session = extract([
    /Session\s*:?\s*([A-Z][a-z]+-\d{4})/i,  // e.g., June-2025
    /([A-Z][a-z]+-\d{4})(?=\s+S[GC]PI)/i,  // Stop at SGPI/SCPI
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*-?\s*\d{4}/i,
    /Semester\s*:?\s*([A-Z][a-z]+-\d{4})/i
  ])

  // Extract SGPI/SGPA - handle typo SCPI in OCR
  const sgpi = extract([
    /S[GC]PI\s*:?\s*([\d.]+)/i,  // Handle both SGPI and SCPI
    /S\.?G\.?P\.?I\.?\s*:?\s*([\d.]+)/i,
    /S\.?C\.?P\.?I\.?\s*:?\s*([\d.]+)/i
  ])

  // Extract CGPI/CGPA - enhanced precision
  const cgpi = extract([
    /CGPI\s*:?\s*([\d.]+(?:\.\d{2})?)/i,
    /CGPA\s*:?\s*([\d.]+(?:\.\d{2})?)/i,
    /C\.?G\.?P\.?I\.?\s*:?\s*([\d.]+)/i
  ])

  // Extract remarks/result - enhanced patterns
  const remarksRaw = extract([
    /Result\s*:?\s*([A-Z][A-Za-z]+)/i,
    /Remarks?\s*:?\s*([A-Z][A-Za-z]+)/i,
    /(SUCCESSFUL|SUCCESS|PASS|PASSED|FAIL|FAILED)/i,
    /Status\s*:?\s*([A-Z][A-Za-z]+)/i
  ])

  // Normalize common OCR errors in remarks/result field
  const normalizeRemarks = (text: string): string => {
    return text
      // Fix common OCR errors in result words
      .replace(/SUCCESSFULR?$/gi, 'SUCCESSFUL')   // Remove trailing R
      .replace(/SUCCESSFULL$/gi, 'SUCCESSFUL')   // Remove double L
      .replace(/SUCCESFULL?/gi, 'SUCCESSFUL')    // Missing S
      .replace(/SUCESSFULL?/gi, 'SUCCESSFUL')    // Missing C
      .replace(/SUCCESSUL/gi, 'SUCCESSFUL')      // Missing F
      .replace(/SUCCESSL?$/gi, 'SUCCESS')        // Truncated
      .replace(/PASSEDD?$/gi, 'PASSED')          // Extra D
      .replace(/FAILLED?$/gi, 'FAILED')          // Extra L
      .replace(/^PASS$/gi, 'PASSED')             // Standardize to PASSED
      .replace(/^FAIL$/gi, 'FAILED')             // Standardize to FAILED
      .trim()
  }

  const remarks = remarksRaw ? normalizeRemarks(remarksRaw) : ''

  // Extract date - enhanced for various formats
  const date = extract([
    // Authblock format: "22 March 2026"
    /Issue\s*Date\s*:?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i,
    /Date\s*:?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i,
    // Traditional formats
    /Date\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
    /(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i // e.g., 30 June 2025
  ])

  // Determine document type and normalize field names
  const isAuthblockCertificate = !!certificate_id

  const result = {
    // Standard fields (same structure as generateDataHash expects)
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

    // Additional fields for certificate identification
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
  console.log('[OCR Parse] Extracted fields:', JSON.stringify(result, null, 2))

  return result
}
