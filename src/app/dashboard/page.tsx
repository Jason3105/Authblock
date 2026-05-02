import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/landing'
import { LogOut, GraduationCap, ShieldCheck, FileText, ChevronRight, Hash } from 'lucide-react'
import crypto from 'crypto'
import { QRDisplay, RegenerateQRButton } from '@/components/QRControls'

// Server Component
export default async function DashboardPage() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('student_session')

  if (!sessionCookie?.value) {
    redirect('/login')
  }

  const user = JSON.parse(sessionCookie.value)
  
  // @ts-ignore
  const db = sql()

  // Fetch user record to get qr_token
  const userRecord = await db`
    SELECT qr_token FROM users WHERE prn_no = ${user.prn_no}
  `
  let qrToken = userRecord.length > 0 ? userRecord[0].qr_token : null

  // Generate automatically if null
  if (!qrToken && userRecord.length > 0) {
    qrToken = crypto.randomUUID()
    await db`UPDATE users SET qr_token = ${qrToken} WHERE prn_no = ${user.prn_no}`
  }

  // Fetch all marksheets for this PRN
  const marksheets = await db`
    SELECT * FROM marksheets 
    WHERE prn_no = ${user.prn_no}
    ORDER BY issued_at DESC
  `

  // Fetch recent QR scans
  const qrScans = await db`
    SELECT * FROM qr_scans
    WHERE prn_no = ${user.prn_no}
    ORDER BY scanned_at DESC
    LIMIT 10
  `

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-blue-200">
      {/* Decorative gradient blur */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-300/30 blur-[120px] rounded-full mix-blend-overlay pointer-events-none" />

      {/* Top Navbar */}
      <Navbar isLoggedIn={true} user={user} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              My Academic Record <GraduationCap className="w-8 h-8 text-blue-600" />
            </h1>
            <p className="text-slate-600 font-medium">
              You have <strong className="text-slate-900">{marksheets.length}</strong> cryptographically secured credentials issued to your PRN.
            </p>
          </div>
          <Link href="/verify" className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm hover:shadow hover:border-slate-300 transition-all active:scale-95">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 
            Launch Verification Portal
          </Link>
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mb-10 p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             {/* Note: We should use an img tag pointing to an api that generates the QR, or just use react-qr-code on a client component.
                 Since this is a Server Component, I'll pass it to a client component. */}
             <QRDisplay token={qrToken} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Academic Passport QR</h2>
            <p className="text-slate-600 mb-6">
              Share this securely formatted QR code with verifying institutions or employers. 
              Only our platform can decode it to view your credentials.
            </p>
            <div className="flex gap-4">
               <RegenerateQRButton />
            </div>
            
            {qrScans.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Recent Scans
                </h3>
                <div className="space-y-2">
                  {qrScans.map((scan: any) => (
                    <div key={scan.id} className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center hidden md:flex">
                      <span className="font-medium text-slate-600">IP: {scan.scanned_by_ip || 'Unknown'}</span>
                      <span className="text-slate-400">{new Date(scan.scanned_at).toLocaleString()}</span>
                      <a href={`https://sepolia.etherscan.io/tx/${scan.tx_hash}`} target="_blank" className="text-blue-500 hover:underline">View Transaction</a>
                    </div>
                  ))}
                  {/* Mobile view simplification */}
                  <div className="md:hidden text-xs text-slate-500">
                    {qrScans.length} scans loggeed to the blockchain. View on desktop for details.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {marksheets.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-lg shadow-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Credentials Found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Your university hasn't issued any blockchain-verified credentials to your PRN yet. Keep an eye out when the semester ends!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {marksheets.map((doc: any) => (
              <div key={doc.id} className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow">
                {/* Card Header (Examination & Session) */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1 block">
                      {doc.branch}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">
                      {doc.examination}
                    </h3>
                  </div>
                  <div className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm whitespace-nowrap">
                    {doc.session_name}
                  </div>
                </div>

                {/* Score Summary */}
                <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-y-6 sm:gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Result</p>
                    <p className={`text-lg font-extrabold ${doc.remarks.toUpperCase().includes('PASS') || doc.remarks === 'SUCCESSFUL' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {doc.remarks}
                    </p>
                  </div>
                  <div className="sm:border-l border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 sm:pl-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">SGPI</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{doc.sgpi || 'N/A'}</p>
                  </div>
                  <div className="sm:border-l border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 sm:pl-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">CGPI</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{doc.cgpi || 'N/A'}</p>
                  </div>
                </div>

                {/* Downloads & Verification Actions */}
                <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-3">
                  {/* Download links */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <a 
                      href={doc.supabase_pdf_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 px-4 py-3 rounded-xl flex items-center justify-between text-sm font-bold text-slate-700 hover:text-blue-700 transition-colors group/btn shadow-sm"
                    >
                      <span className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-slate-400 group-hover/btn:text-blue-500" /> Marksheet
                      </span>
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                    </a>
                    <a 
                      href={doc.certificate_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 px-4 py-3 rounded-xl flex items-center justify-between text-sm font-bold text-slate-700 hover:text-indigo-700 transition-colors group/btn shadow-sm"
                    >
                      <span className="flex items-center gap-2.5">
                        <AwardIcon className="w-4 h-4 text-slate-400 group-hover/btn:text-indigo-500" /> Certificate
                      </span>
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                    </a>
                  </div>

                  {/* Blockchain Link */}
                  <a 
                    href={`/verify?cert=${doc.certificate_id}&hash=${doc.data_hash}&tx=${doc.tx_hash_data}`}
                    title="View full blockchain audit trail"
                    className="w-full bg-slate-900 hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/10 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-md active:scale-[0.98]"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> View Immutable Blockchain Record
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function AwardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
