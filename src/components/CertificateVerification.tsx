'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  XCircle,
  Loader2,
  RefreshCcw,
  ExternalLink,
  Award,
  Calendar,
  User,
  GraduationCap,
  Hash,
  Link2,
  AlertCircle
} from 'lucide-react'

interface CertificateVerificationProps {
  certId?: string
  hash?: string
  tx?: string
}

interface VerificationResult {
  verified: boolean
  certificate?: any
  verification?: any
  blockchain?: any
  error?: string
}

export default function CertificateVerification({ certId, hash, tx }: CertificateVerificationProps) {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(true)

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'Not available'
    return String(value)
  }

  const formatDate = (value: unknown) => {
    if (!value) return 'Not available'
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  useEffect(() => {
    verifyCertificate()
  }, [certId, hash, tx])

  const verifyCertificate = async () => {
    try {
      setLoading(true)

      if (!certId && !hash) {
        setResult({ verified: false, error: 'Certificate ID or hash is required for verification.' })
        return
      }

      const params = new URLSearchParams()
      if (certId) params.set('cert', certId)
      if (hash) params.set('hash', hash)
      if (tx) params.set('tx', tx)

      const response = await fetch(`/api/verify/certificate?${params.toString()}`)
      const data = await response.json()

      setResult(data)
    } catch (error: any) {
      setResult({
        verified: false,
        error: 'Network error: ' + error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    verifyCertificate()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying Certificate</h2>
          <p className="text-slate-600">Checking blockchain authenticity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 font-medium text-sm mb-4">
            <Award className="w-4 h-4" />
            Authblock Certificate Verification
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Certificate Verification
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Blockchain-verified academic certificate from Fr. Conceicao Rodrigues College of Engineering
          </p>
        </motion.div>

        {/* Verification Result */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white rounded-2xl shadow-xl border overflow-hidden ${
            result?.verified ? 'border-emerald-200' : 'border-red-200'
          }`}
        >

          {/* Status Header */}
          <div className={`p-6 text-center ${
            result?.verified
              ? 'bg-gradient-to-r from-emerald-50 to-green-50'
              : 'bg-gradient-to-r from-red-50 to-rose-50'
          }`}>
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
              result?.verified
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {result?.verified ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>

            <h2 className={`text-2xl font-bold mb-2 ${
              result?.verified ? 'text-emerald-900' : 'text-red-900'
            }`}>
              {result?.verified ? 'Certificate Verified' : 'Verification Failed'}
            </h2>

            <p className={`text-sm ${
              result?.verified ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {result?.verified
                ? 'This certificate is authentic and verified on the blockchain'
                : result?.error || 'Certificate could not be verified'
              }
            </p>
          </div>

          {/* Certificate Details */}
          {result?.verified && result?.certificate && (
            <div className="p-6">

              {/* Student Information */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Student Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Student Name</label>
                    <div className="text-lg font-bold text-slate-900">{formatValue(result.certificate.student_name)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">PRN Number</label>
                    <div className="text-lg font-mono font-bold text-slate-900">{formatValue(result.certificate.prn_no)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Serial Number</label>
                    <div className="text-lg font-mono font-bold text-slate-900">{formatValue(result.certificate.serial_no)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Branch</label>
                    <div className="text-lg font-bold text-slate-900">{formatValue(result.certificate.branch)}</div>
                  </div>
                </div>
              </div>

              {/* Academic Details */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  Academic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Examination</label>
                    <div className="text-base font-semibold text-slate-900">{formatValue(result.certificate.examination)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Session</label>
                    <div className="text-base font-semibold text-slate-900">{formatValue(result.certificate.session)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">SGPI</label>
                    <div className="text-xl font-bold text-emerald-600">{formatValue(result.certificate.sgpi)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CGPI</label>
                    <div className="text-xl font-bold text-emerald-600">{formatValue(result.certificate.cgpi)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Result</label>
                    <div className="text-lg font-bold text-slate-900">{formatValue(result.certificate.remarks)}</div>
                  </div>
                </div>
              </div>

              {/* Verification Checks */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Verification Checks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hash Validation</label>
                    <div className={result.verification?.hash_valid ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {result.verification?.hash_valid ? 'Valid' : 'Invalid'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Transaction Validation</label>
                    <div className={result.verification?.transaction_valid ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {result.verification?.transaction_valid ? 'Valid' : 'Invalid'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Blockchain Anchor</label>
                    <div className={result.verification?.on_blockchain ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {result.verification?.on_blockchain ? 'Confirmed' : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Expected Hash (from QR)</label>
                    <div className="font-mono text-sm break-all text-slate-700">{formatValue(result.verification?.expected_hash)}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Stored Hash (in DB)</label>
                    <div className="font-mono text-sm break-all text-slate-700">{formatValue(result.verification?.stored_hash)}</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Expected Transaction (from QR)</label>
                    <div className="font-mono text-sm break-all text-slate-700">{formatValue(result.verification?.expected_tx)}</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Stored Transaction (in DB)</label>
                    <div className="font-mono text-sm break-all text-slate-700">{formatValue(result.verification?.stored_tx)}</div>
                  </div>
                </div>
              </div>

              {/* Blockchain Verification */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-indigo-600" />
                  Blockchain Anchors
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Data Hash</label>
                    <div className="font-mono text-sm break-all text-slate-700">{formatValue(result.blockchain?.data_hash)}</div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">PDF Hash</label>
                    <div className="font-mono text-sm break-all text-slate-700">{formatValue(result.blockchain?.pdf_hash)}</div>
                  </div>

                  {result.blockchain?.tx_hash_data && (
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                      <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Data Hash Transaction</label>
                      <div className="font-mono text-sm break-all text-slate-700 mb-3">{result.blockchain.tx_hash_data}</div>
                      {result.blockchain?.etherscan_data_url && (
                        <a
                          href={result.blockchain.etherscan_data_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Data TX on Etherscan
                        </a>
                      )}
                    </div>
                  )}

                  {result.blockchain?.tx_hash_pdf && (
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                      <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">PDF Hash Transaction</label>
                      <div className="font-mono text-sm break-all text-slate-700 mb-3">{result.blockchain.tx_hash_pdf}</div>
                      {result.blockchain?.etherscan_pdf_url && (
                        <a
                          href={result.blockchain.etherscan_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View PDF TX on Etherscan
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate Metadata */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  Certificate Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Certificate ID</label>
                    <div className="font-mono text-sm font-semibold text-slate-900">{formatValue(result.certificate.id)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Issue Date</label>
                    <div className="text-sm font-semibold text-slate-900">{formatDate(result.certificate.issued_at)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Issued By</label>
                    <div className="text-sm font-semibold text-slate-900">{formatValue(result.certificate.issued_by || 'Government of Jharkhand')}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">On-chain Timestamp</label>
                    <div className="text-sm font-semibold text-slate-900">{formatDate(result.verification?.blockchain_timestamp)}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verification URL</label>
                  {result.certificate?.verification_url ? (
                    <a
                      href={result.certificate.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors break-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {result.certificate.verification_url}
                    </a>
                  ) : (
                    <div className="text-sm font-semibold text-slate-900">Not available</div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Raw Certificate Payload</label>
                  <pre className="text-xs text-slate-100 overflow-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(result.certificate?.certificate_data ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {!result?.verified && result?.error && (
            <div className="p-6 border-t border-red-200">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h4 className="font-bold text-red-900">Verification Details</h4>
                </div>
                <p className="text-red-700 text-sm">
                  {result.error}
                </p>

                {/* Verification breakdown */}
                {result.verification && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Hash validation:</span>
                      <span className={result.verification.hash_valid ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {result.verification.hash_valid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Transaction validation:</span>
                      <span className={result.verification.transaction_valid ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {result.verification.transaction_valid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Blockchain verification:</span>
                      <span className={result.verification.on_blockchain ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {result.verification.on_blockchain ? '✓ Found' : '✗ Not found'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="bg-slate-50 p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Powered by Authblock & Ethereum Blockchain
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCcw className="w-4 h-4" />
              Verify Again
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}