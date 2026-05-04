'use client'

import React from 'react'
import QRCode from 'react-qr-code'
import { Shield, FileCheck, Hash, Calendar, User, Award, BookOpen, CheckCircle } from 'lucide-react'

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const verificationUrl = data.verification_url || `${baseUrl}/verify?cert=${data.certificate_id}`

  return (
    <div className="w-full max-w-full overflow-x-auto pb-4 custom-scrollbar-sm">
      <div className="min-w-[794px] flex justify-center">
        {/* A4 dimensions: 794px × 1123px at 96dpi */}
        <div
          className="mx-auto bg-white text-black font-sans"
          style={{
            width: '794px',
            minHeight: '1123px',
            border: '1px solid #d1d5db',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
      {/* Top accent bar */}
      <div style={{ height: '8px', background: 'linear-gradient(90deg, #1d4ed8 0%, #0ea5e9 50%, #1d4ed8 100%)' }} />

      {/* Header */}
      <div
        style={{
          padding: '28px 48px 20px',
          borderBottom: '2px solid #1d4ed8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield style={{ width: '28px', height: '28px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', letterSpacing: '0.05em' }}>
              AUTHBLOCK
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>
              Fr. Conceicao Rodrigues College of Engineering · Blockchain Certification Authority
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '24px',
            padding: '8px 18px',
          }}
        >
          <FileCheck style={{ width: '16px', height: '16px', color: '#1d4ed8' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>
            Verified Certificate
          </span>
        </div>
      </div>

      {/* Certificate title */}
      <div style={{ textAlign: 'center', padding: '24px 48px 16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          Blockchain Verification Certificate
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Academic Performance Record — Cryptographically Secured on Ethereum
        </div>
      </div>

      {/* Certificate ID band */}
      <div
        style={{
          margin: '0 48px',
          padding: '10px 20px',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Hash style={{ width: '15px', height: '15px', color: '#1d4ed8' }} />
        <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>Certificate ID:</span>
        <span style={{ fontSize: '13px', color: '#111827', fontFamily: 'monospace', fontWeight: 700 }}>
          {data.certificate_id}
        </span>
      </div>

      {/* Main content */}
      <div style={{ padding: '20px 48px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Student Information */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
          <div
            style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e5e7eb',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <User style={{ width: '16px', height: '16px', color: '#1d4ed8' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Student Information
            </span>
          </div>
          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <InfoField label="Full Name" value={data.name} />
            <InfoField label="PRN Number" value={data.prn_no} mono />
            <InfoField label="Serial Number" value={data.serial_no} mono />
            <InfoField label="Branch / Programme" value={data.branch} />
          </div>
        </div>

        {/* Academic Details */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
          <div
            style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e5e7eb',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <BookOpen style={{ width: '16px', height: '16px', color: '#1d4ed8' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Academic Details
            </span>
          </div>
          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <InfoField label="Examination" value={data.examination} />
            <InfoField label="Session" value={data.session} />
            <InfoField
              label="SGPI"
              value={data.sgpi || 'N/A'}
              highlight
            />
            <InfoField
              label="CGPI"
              value={data.cgpi || 'N/A'}
              highlight
            />
            {data.totals?.credits && (
              <InfoField label="Total Credits" value={data.totals.credits} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Result
              </span>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: data.remarks?.toUpperCase().includes('PASS') ? '#15803d' : '#b91c1c',
                }}
              >
                {data.remarks || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Blockchain Verification */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
          <div
            style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e5e7eb',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Award style={{ width: '16px', height: '16px', color: '#1d4ed8' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Blockchain Verification
            </span>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar style={{ width: '15px', height: '15px', color: '#6b7280' }} />
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    Issue Date
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {new Date(data.issue_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {data.blockchain_hash && (
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                    Blockchain Hash
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#374151',
                      wordBreak: 'break-all',
                      background: '#f1f5f9',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      display: 'block',
                    }}
                  >
                    {data.blockchain_hash.substring(0, 66)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle style={{ width: '15px', height: '15px', color: '#15803d' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
                  Secured on Ethereum Blockchain (Sepolia)
                </span>
              </div>
            </div>

            {/* QR Code */}
            {showQR && (
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    padding: '10px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'inline-block',
                  }}
                >
                  <QRCode value={`${baseUrl}/verify?cert=${data.certificate_id}`} size={110} level="L" />
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', fontWeight: 500 }}>
                  Scan to verify authenticity
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          margin: '0 48px 24px',
          padding: '12px 18px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p style={{ fontSize: '11px', color: '#6b7280' }}>
          This is a digitally signed blockchain certificate issued by Authblock.
        </p>
        <p style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
          {baseUrl}/verify
        </p>
      </div>

      {/* Bottom accent bar */}
      <div style={{ height: '6px', background: 'linear-gradient(90deg, #1d4ed8 0%, #0ea5e9 50%, #1d4ed8 100%)' }} />
    </div>
      </div>
    </div>
  )
}

// Helper sub-component for field display
function InfoField({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: highlight ? '18px' : '15px',
          fontWeight: highlight ? 800 : 600,
          color: highlight ? '#1d4ed8' : '#111827',
          fontFamily: mono ? 'monospace' : 'inherit',
        }}
      >
        {value || 'N/A'}
      </span>
    </div>
  )
}
