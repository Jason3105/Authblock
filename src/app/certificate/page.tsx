'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import BlockchainCertificate from '@/components/admin/BlockchainCertificate'
import { Download, Loader2, AlertCircle, CheckCircle2, Shield } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function CertificateContent() {
  const searchParams = useSearchParams()
  const certId = searchParams?.get('id')

  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (certId) {
      fetchCertificate()
    } else {
      setLoading(false)
      setError('No certificate ID provided')
    }
  }, [certId])

  const fetchCertificate = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/certificates/${certId}`)
      if (!res.ok) throw new Error('Certificate not found')

      const data = await res.json()
      setCertificate(data.certificate_data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!certificate) return

    try {
      setDownloading(true)
      const element = document.getElementById('certificate-container')
      if (!element) throw new Error('Certificate element not found')

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0f172a',
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`Certificate_${certificate.certificate_id}.pdf`)
    } catch (err: any) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading certificate...</p>
        </div>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'The requested certificate does not exist.'}</p>
          <a
            href="/admin/marksheets"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Back to Admin
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-strong rounded-xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Blockchain Certificate</h1>
              <p className="text-gray-400 text-sm">Verified on Ethereum Blockchain</p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* Verification Status */}
        <div className="glass-strong rounded-xl p-4 flex items-center gap-3 text-green-400">
          <CheckCircle2 className="w-6 h-6" />
          <div>
            <p className="font-semibold">Certificate Verified</p>
            <p className="text-sm text-gray-400">This certificate is registered on the blockchain and is authentic.</p>
          </div>
        </div>

        {/* Certificate */}
        <div id="certificate-container">
          <BlockchainCertificate data={certificate} showQR={true} />
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <a
            href="/verify"
            className="glass-strong hover:bg-white/10 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Verify Another Certificate
          </a>
          <a
            href="/admin/marksheets"
            className="glass-strong hover:bg-white/10 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Back to Admin
          </a>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CertificateContent />
    </Suspense>
  )
}
