'use client'

import React from 'react'
import QRCode from 'react-qr-code'
import { Shield, FileCheck, Hash, Calendar, User, Award, BookOpen } from 'lucide-react'

interface CertificateData {
  // Student Info
  name: string
  prn_no: string
  serial_no: string

  // Academic Info
  examination: string
  branch: string
  session: string

  // Results
  sgpi: string
  cgpi: string
  remarks: string

  // Totals
  totals: {
    credits: string
    gp: string
    cp: string
    cpgp: string
  }

  // Certificate Meta
  certificate_id: string
  issue_date: string
  blockchain_hash?: string
  verification_url?: string
}

interface BlockchainCertificateProps {
  data: CertificateData
  showQR?: boolean
}

export default function BlockchainCertificate({ data, showQR = true }: BlockchainCertificateProps) {
  const verificationUrl = data.verification_url || `${window.location.origin}/verify?cert=${data.certificate_id}`

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-1 rounded-2xl shadow-2xl">
      {/* Certificate Container */}
      <div className="bg-slate-950 rounded-2xl overflow-hidden border border-blue-500/20">

        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 p-8 text-center overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.1)_49%,rgba(255,255,255,0.1)_51%,transparent_52%)] bg-[length:20px_20px]" />
          </div>

          <div className="relative z-10">
            {/* Authblock Logo/Title */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white tracking-wider">AUTHBLOCK</h1>
            </div>

            <div className="text-white/90 text-sm mb-4">
              Government of Jharkhand
            </div>

            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full">
              <FileCheck className="w-5 h-5 text-white" />
              <span className="text-white font-semibold text-lg">
                Blockchain Verification Certificate
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 space-y-6">

          {/* Certificate ID */}
          <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
            <Hash className="w-4 h-4" />
            <span>Certificate ID: {data.certificate_id}</span>
          </div>

          {/* Student Information */}
          <div className="glass-strong rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-400" />
              Student Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-400 block mb-1">Name</label>
                <div className="text-white font-medium">{data.name || 'N/A'}</div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">PRN Number</label>
                <div className="text-white font-mono">{data.prn_no || 'N/A'}</div>
              </div>

              {data.serial_no && (
                <div>
                  <label className="text-gray-400 block mb-1">Serial Number</label>
                  <div className="text-white font-mono">{data.serial_no}</div>
                </div>
              )}

              <div>
                <label className="text-gray-400 block mb-1">Branch</label>
                <div className="text-white">{data.branch || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div className="glass-strong rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Academic Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-400 block mb-1">Examination</label>
                <div className="text-white">{data.examination || 'N/A'}</div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Session</label>
                <div className="text-white">{data.session || 'N/A'}</div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">SGPI</label>
                <div className="text-white font-semibold text-lg">{data.sgpi || 'N/A'}</div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">CGPI</label>
                <div className="text-white font-semibold text-lg">{data.cgpi || 'N/A'}</div>
              </div>

              {data.totals.credits && (
                <div>
                  <label className="text-gray-400 block mb-1">Total Credits</label>
                  <div className="text-white">{data.totals.credits}</div>
                </div>
              )}

              <div>
                <label className="text-gray-400 block mb-1">Result</label>
                <div className={`font-semibold ${
                  data.remarks?.toUpperCase().includes('PASS')
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {data.remarks || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Information */}
          <div className="glass-strong rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-blue-400" />
              Blockchain Verification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 block mb-1 text-sm">Issue Date</label>
                  <div className="text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    {new Date(data.issue_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                {data.blockchain_hash && (
                  <div>
                    <label className="text-gray-400 block mb-1 text-sm">Blockchain Hash</label>
                    <div className="text-blue-400 font-mono text-xs break-all bg-slate-900/50 p-2 rounded">
                      {data.blockchain_hash.substring(0, 32)}...
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-green-400 text-sm pt-2">
                  <Shield className="w-4 h-4" />
                  <span>Secured on Ethereum Blockchain</span>
                </div>
              </div>

              {/* QR Code */}
              {showQR && (
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-white p-3 rounded-lg">
                    <QRCode
                      value={verificationUrl}
                      size={120}
                      level="H"
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2 text-center">
                    Scan to verify
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-gray-500 text-xs pt-4 border-t border-slate-800">
            <p>This is a digitally signed blockchain certificate issued by Authblock.</p>
            <p className="mt-1">Verify authenticity at: {window.location.origin}/verify</p>
          </div>
        </div>

        {/* Bottom Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" />
      </div>
    </div>
  )
}
